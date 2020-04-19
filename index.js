const path = require("path"),
    spawnSync = require("child_process").spawnSync,
    fs = require("fs"),
    https = require("https")

class Action {
    constructor() {
        this.projectFile = process.env.INPUT_PROJECT_FILE_PATH
        this.versionFile = process.env.INPUT_VERSION_FILE_PATH || process.env.VERSION_FILE_PATH
        this.versionRegex = new RegExp(process.env.INPUT_VERSION_REGEX || process.env.VERSION_REGEX)
        this.version = process.env.INPUT_VERSION_STATIC || process.env.VERSION_STATIC
        this.tagCommit = JSON.parse(process.env.INPUT_TAG_COMMIT || process.env.TAG_COMMIT)
        this.tagFormat = process.env.INPUT_TAG_FORMAT || process.env.TAG_FORMAT
        this.nugetKey = process.env.INPUT_NUGET_KEY || process.env.NUGET_KEY
        this.packageName = process.env.INPUT_PACKAGE_NAME || process.env.PACKAGE_NAME
    }

    _printWarning(msg) {
        console.log(`##[warning]${msg}`)
    }

    _printErrorAndExit(msg) {
        console.log(`##[error]${msg}`)
        throw new Error(msg)
    }

    _executeCommand(cmd, options) {
        const INPUT = cmd.split(" "), TOOL = INPUT[0], ARGS = INPUT.slice(1)
        return spawnSync(TOOL, ARGS, options)
    }

    _executeInProcess(cmd) {
        this._executeCommand(cmd, { encoding: "utf-8", stdio: [process.stdin, process.stdout, process.stderr] })
    }

    _mayResolveFilepath(filePath, errMsg) {
        const fullPath = path.resolve(process.env.GITHUB_WORKSPACE, filePath)

        if (!fs.existsSync(fullPath))
            this._printErrorAndExit(errMsg)

        return fullPath
    }

    _tagCommit(version) {
        const TAG = this.tagFormat.replace("*", version)

        this._executeInProcess(`git tag ${TAG}`)
        this._executeInProcess(`git push origin ${TAG}`)
    }

    _pushPackage() {
        if (!this.nugetKey) {
            this._printWarning("😢 NUGET_KEY not given")
            return
        }

        fs.readdirSync(".").filter(fn => fn.endsWith("nupkg")).forEach(fn => fs.unlinkSync(fn))

        this._executeInProcess(`dotnet build -c Release ${this.projectFile}`)
        this._executeInProcess(`dotnet pack --include-symbols -p:SymbolPackageFormat=snupkg --no-build -c Release ${this.projectFile} -o .`)

        const packages = fs.readdirSync(".").filter(fn => fn.endsWith("nupkg"))
        console.log(`Generated Package(s): ${packages.join(", ")}`)

        const pushCmd = `dotnet nuget push *.nupkg -s https://api.nuget.org/v3/index.json -k ${this.nugetKey} --skip-duplicate`,
            pushOutput = this._executeCommand(pushCmd, { encoding: "utf-8" }).stdout

        console.log(pushOutput)

        if (/error/.test(pushOutput))
            this._printErrorAndExit(`😭 ${/error.*/.exec(pushOutput)[0]}`)
    }

    _mayTagAndPush(version, name) {
        console.log(`👍 found a new version (${version}) of ${name}`)

        if (this.tagCommit)
            this._tagCommit(version)

        this._pushPackage()
    }

    _determineProjectFilepath() {
        if (!this.projectFile)
            this._printErrorAndExit("😭 project file not given")

        this.projectFile = this._mayResolveFilepath(this.projectFile, "😭 project file not found")
        console.log(`Project Filepath: ${this.projectFile}`)
    }

    _determineVersion() {
        if (!this.version) {
            this.versionFile = !this.versionFile ? this.projectFile : this._mayResolveFilepath(this.versionFile, "😭 version file not found")
            console.log(`Version Filepath: ${this.versionFile}`)

            const versionFileContent = fs.readFileSync(this.versionFile, { encoding: "utf-8" }),
                parsedVersion = this.versionRegex.exec(versionFileContent)

            if (!parsedVersion)
                this._printErrorAndExit("😢 unable to extract version info!")

            this.version = parsedVersion[1]
        }

        console.log(`Version: ${this.version}`)
    }

    _checkForUpdate() {
        if (!this.packageName) {
            this.packageName = path.basename(this.projectFile).split(".").slice(0, -1).join(".")
            console.log(`Package Name: ${this.packageName}`)
        }

        https.get(`https://api.nuget.org/v3-flatcontainer/${this.packageName}/index.json`, res => {
            let body = ""

            if (res.statusCode == 404)
                this._mayTagAndPush(this.version, this.packageName)

            if (res.statusCode == 200) {
                res.setEncoding("utf8")
                res.on("data", chunk => body += chunk)
                res.on("end", () => {
                    const existingVersions = JSON.parse(body)
                    if (existingVersions.versions.indexOf(this.version) < 0)
                        this._mayTagAndPush(this.version, this.packageName)
                })
            }
        }).on("error", e => {
            this._printWarning(`😢 error reaching nuget.org ${e.message}`)
        })
    }

    run() {
        this._determineProjectFilepath()
        this._determineVersion()
        this._checkForUpdate()
    }
}

new Action().run()
