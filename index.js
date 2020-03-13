const path = require("path"),
    spawnSync = require("child_process").spawnSync,
    fs = require("fs"),
    https = require("https")

class Action {
    constructor() {
        this.PROJECT_FILE_PATH = process.env.INPUT_PROJECT_FILE_PATH
        this.VERSION_STATIC = process.env.INPUT_VERSION_STATIC || process.env.VERSION_STATIC
        this.VERSION_FILE_PATH = process.env.INPUT_VERSION_FILE_PATH || process.env.VERSION_FILE_PATH
        this.VERSION_REGEX = new RegExp(process.env.INPUT_VERSION_REGEX || process.env.VERSION_REGEX)
        this.TAG_COMMIT = JSON.parse(process.env.INPUT_TAG_COMMIT || process.env.TAG_COMMIT)
        this.TAG_FORMAT = process.env.INPUT_TAG_FORMAT || process.env.TAG_FORMAT
        this.NUGET_KEY = process.env.INPUT_NUGET_KEY || process.env.NUGET_KEY
        this.PACKAGE_NAME = process.env.INPUT_PACKAGE_NAME || process.env.PACKAGE_NAME
    }

    _warn(msg) {
        console.log(`##[warning]${msg}`)
    }

    _fail(msg) {
        console.log(`##[error]${msg}`)
        throw new Error(msg)
    }

    _execCmd(cmd, options) {
        const INPUT = cmd.split(" "), TOOL = INPUT[0], ARGS = INPUT.slice(1)
        return spawnSync(TOOL, ARGS, options)
    }

    _execAndCapture(cmd) {
        return this._execCmd(cmd, { encoding: "utf-8" }).stdout
    }

    _execInProc(cmd) {
        this._execCmd(cmd, { encoding: "utf-8", stdio: [process.stdin, process.stdout, process.stderr] })
    }

    _resolveIfExists(filePath, msg) {
        const FULLPATH = path.resolve(process.env.GITHUB_WORKSPACE, filePath)
        if (!fs.existsSync(FULLPATH)) this._fail(msg)
        return FULLPATH
    }

    _pushPackage() {
        if (!this.NUGET_KEY) {
            this._warn("😢 NUGET_KEY not given")
            return
        }

        if (!this._execAndCapture("dotnet --version")) {
            this._warn("😭 dotnet not found")
            return
        }

        this._execInProc(`dotnet build -c Release ${this.PROJECT_FILE_PATH}`)
        this._execInProc(`dotnet pack --no-build -c Release ${this.PROJECT_FILE_PATH} -o .`)
        const NUGET_PUSH_RESPONSE = this._execAndCapture(`dotnet nuget push ${this.PACKAGE_NAME}*.nupkg -s https://api.nuget.org/v3/index.json -k ${this.NUGET_KEY}`)
        const NUGET_ERROR_REGEX = /(error: Response status code does not indicate success.*)/

        if (NUGET_ERROR_REGEX.test(NUGET_PUSH_RESPONSE))
            this._fail(`😭 ${NUGET_ERROR_REGEX.exec(NUGET_PUSH_RESPONSE)[1]}`)
    }

    _tagCommit(version) {
        if (this.TAG_COMMIT) {
            const TAG = this.TAG_FORMAT.replace("*", version)

            if (this._execAndCapture(`git ls-remote --tags origin ${TAG}`).indexOf(TAG) >= 0) {
                this._warn(`😢 tag ${TAG} already exists`)
                return
            }

            this._execInProc(`git tag ${TAG}`)
            this._execInProc(`git push origin ${TAG}`)
        }
    }

    _pushAndTag(version, name) {
        console.log(`👍 found a new version (${version}) of ${name}`)
        this._tagCommit(version)
        this._pushPackage()
    }

    run() {
        if (!this.PROJECT_FILE_PATH)
            this._fail("😭 project file not given")
        
        this.PROJECT_FILE_PATH = this._resolveIfExists(this.PROJECT_FILE_PATH, "😭 project file not found")
        
        let CURRENT_VERSION = ""
        
        if (this.VERSION_STATIC)
            CURRENT_VERSION = this.VERSION_STATIC
        else {
            this.VERSION_FILE_PATH = !this.VERSION_FILE_PATH ? this.PROJECT_FILE_PATH : this._resolveIfExists(this.VERSION_FILE_PATH, "😭 version file not found")

            const FILE_CONTENT = fs.readFileSync(this.VERSION_FILE_PATH, { encoding: "utf-8" }),
                VERSION_INFO = this.VERSION_REGEX.exec(FILE_CONTENT)

            if (!VERSION_INFO)
                this._fail("😢 unable to extract version info")

            const CURRENT_VERSION = VERSION_INFO[1]
        }

        if (!this.PACKAGE_NAME)
            this.PACKAGE_NAME = path.basename(this.PROJECT_FILE_PATH).split(".").slice(0, -1).join(".")

        https.get(`https://api.nuget.org/v3-flatcontainer/${this.PACKAGE_NAME}/index.json`, res => {
            let body = ""

            if (res.statusCode == 404)
                this._pushAndTag(CURRENT_VERSION, this.PACKAGE_NAME)

            if (res.statusCode == 200) {
                res.setEncoding("utf8")
                res.on("data", chunk => body += chunk)
                res.on("end", () => {
                    const existingVersions = JSON.parse(body)
                    if (existingVersions.versions.indexOf(CURRENT_VERSION) < 0)
                        this._pushAndTag(CURRENT_VERSION, this.PACKAGE_NAME)
                })
            }
        }).on("error", e => {
            this._warn(`😢 error reaching nuget.org ${e.message}`)
        })
    }
}

new Action().run()
