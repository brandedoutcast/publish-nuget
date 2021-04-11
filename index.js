const os = require("os"),
    fs = require("fs"),
    path = require("path"),
    https = require("https"),
    spawnSync = require("child_process").spawnSync,
    core = require('@actions/core');

class Action {
    constructor() {
        this.projectFile = core.getInput('project-file-path')
        this.packageName = core.getInput('package-name')

        // version flags
        this.version = core.getInput('version')

        // version extraction
        this.versionFile = core.getInput('extract-version-file-path') || this.projectFile
        this.versionRegex = new RegExp(core.getInput('extract-version-regex'), "m")

        this.tagCommit = JSON.parse(core.getInput('tag-commit'))
        this.tagFormat = core.getInput('tag-format')
        this.nugetKey = core.getInput('nuget-key')
        this.nugetSource = core.getInput('nuget-source')
        this.includeSymbols = JSON.parse(core.getInput('include-symbols'))
    }

    _validateInputs() {
        // make sure we don't have badly configured version flags
        if(this.version && this.versionFile)
            core.warning("You provided 'version', extract-* keys are being ignored")
    }

    _printErrorAndExit(msg) {
        core.error(`😭 ${msg}`)
        throw new Error(msg)
    }

    _executeCommand(cmd, options) {
        core.info(`executing: [${cmd}]`)

        const INPUT = cmd.split(" "), TOOL = INPUT[0], ARGS = INPUT.slice(1)
        return spawnSync(TOOL, ARGS, options)
    }

    _executeInProcess(cmd) {
        this._executeCommand(cmd, { encoding: "utf-8", stdio: [process.stdin, process.stdout, process.stderr] })
    }

    _tagCommit(version) {
        const TAG = this.tagFormat.replace("*", version)

        console.log(`✨ creating new tag ${TAG}`)

        this._executeInProcess(`git tag ${TAG}`)
        this._executeInProcess(`git push origin ${TAG}`)

        process.stdout.write(`::set-output name=VERSION::${TAG}` + os.EOL)
    }

    _generatePackArgs() {
        var args = `--no-build -c Release -p:PackageVersion=${this.version}`;

        if(this.includeSymbols)
            args = args + ' --include-symbols -p:SymbolPackageFormat=snupkg'

        return args;
    }
    _pushPackage(version, name) {
        core.info(`✨ found new version (${version}) of ${name}`)

        if (!this.nugetKey) {
            core.warning("😢 NUGET_KEY not given")
            return
        }

        core.info(`NuGet Source: ${this.nugetSource}`)

        fs.readdirSync(".").filter(fn => /\.s?nupkg$/.test(fn)).forEach(fn => fs.unlinkSync(fn))

        this._executeInProcess(`dotnet build -c Release ${this.projectFile} /p:Version=${this.version}`)

        this._executeInProcess(`dotnet pack ${this._generatePackArgs()} ${this.projectFile} -o .`)

        const packages = fs.readdirSync(".").filter(fn => fn.endsWith("nupkg"))
        core.info(`Generated Package(s): ${packages.join(", ")}`)

        const pushCmd = `dotnet nuget push *.nupkg -s ${this.nugetSource}/v3/index.json -k ${this.nugetKey} --skip-duplicate ${!this.includeSymbols ? "-n 1" : ""}`,
            pushOutput = this._executeCommand(pushCmd, { encoding: "utf-8" }).stdout

        console.log(pushOutput)

        if (/error/.test(pushOutput))
            this._printErrorAndExit(`${/error.*/.exec(pushOutput)[0]}`)

        const packageFilename = packages.filter(p => p.endsWith(".nupkg"))[0],
            symbolsFilename = packages.filter(p => p.endsWith(".snupkg"))[0]

        process.stdout.write(`::set-output name=package-name::${packageFilename}` + os.EOL)
        process.stdout.write(`::set-output name=package-path::${path.resolve(packageFilename)}` + os.EOL)

        if (symbolsFilename) {
            process.stdout.write(`::set-output name=symbols-package-name::${symbolsFilename}` + os.EOL)
            process.stdout.write(`::set-output name=symbols-package-path::${path.resolve(symbolsFilename)}` + os.EOL)
        }

        if (this.tagCommit)
            this._tagCommit(version)
    }

    _checkForUpdate() {
        if (!this.packageName) {
            this.packageName = path.basename(this.projectFile).split(".").slice(0, -1).join(".")
        }

        core.info(`Package Name: ${this.packageName}`)

        https.get(`${this.nugetSource}/v3-flatcontainer/${this.packageName}/index.json`, res => {
            let body = ""

            if (res.statusCode == 404)
                this._pushPackage(this.version, this.packageName)

            if (res.statusCode == 200) {
                res.setEncoding("utf8")
                res.on("data", chunk => body += chunk)
                res.on("end", () => {
                    const existingVersions = JSON.parse(body)
                    if (existingVersions.versions.indexOf(this.version) < 0)
                        this._pushPackage(this.version, this.packageName)
                })
            }
        }).on("error", e => {
            this._printErrorAndExit(`error: ${e.message}`)
        })
    }

    run() {
        this._validateInputs();

        if (!this.projectFile || !fs.existsSync(this.projectFile))
            this._printErrorAndExit(`Project file '${this.projectFile}' not found`)

        core.info(`Project Filepath: ${this.projectFile}`)
        core.debug(`Version (pre): '${this.version}'`)

        if (!this.version) {

            if (this.versionFile !== this.projectFile && !fs.existsSync(this.versionFile))
                this._printErrorAndExit("version file not found")

            core.info(`Version Filepath: ${this.versionFile}`)
            core.info(`Version Regex: ${this.versionRegex}`)

            const versionFileContent = fs.readFileSync(this.versionFile, { encoding: "utf-8" }),
                parsedVersion = this.versionRegex.exec(versionFileContent)

            if (!parsedVersion)
                this._printErrorAndExit("unable to extract version info!")

            this.version = parsedVersion[1]
        }

        core.info(`Version: ${this.version}`)

        this._checkForUpdate()
    }
}

new Action().run()
