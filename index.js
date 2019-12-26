const resolve = require("path").resolve,
    spawnSync = require("child_process").spawnSync,
    { readdirSync, readFileSync } = require("fs")

function run() {
    // find project
    const repoDir = process.env.GITHUB_WORKSPACE,
        projDir = resolve(repoDir, process.env.INPUT_PROJECT_DIR),
        projFiles = readdirSync(projDir).filter(f => f.endsWith(".csproj") || f.endsWith(".fsproj"))

    if (projFiles.length === 0) {
        failed("😭 project not found")
        return
    }

    // check for new version
    const projName = projFiles[0],
        projPath = resolve(projDir, projName),
        versionRegex = /<Version>(.*)<\/Version>/,
        projDetails = readFileSync(projPath, { encoding: "utf-8" }),
        isVersionPresent = versionRegex.test(projDetails)

    if (!isVersionPresent) {
        console.log(`##[warning]😢 skipping due to no version`)
        return
    }

    const currentVersion = versionRegex.exec(projDetails)[1],
        tagFormat = process.env.INPUT_TAG_FORMAT,
        tag = tagFormat.replace("*", currentVersion),
        istagPresent = runCap(`git ls-remote --tags origin ${tag}`).indexOf(tag) >= 0

    if (istagPresent) {
        console.log(`##[warning]😢 tag ${currentVersion} already exists`)
        return
    }

    console.log(`👍 found a new version (${currentVersion}) of ${projName}`)

    runProc(`git tag ${tag}`)
    runProc(`git push origin ${tag}`)

    // pack & push
    const nugetKey = process.env.INPUT_NUGET_KEY

    if (!nugetKey) {
        console.log(`##[warning]😢 nuget_key not found`)
        return
    }

    if (!runCap("dotnet --version")) {
        failed("😭 dotnet not found")
        return
    }

    runProc(`dotnet pack -c Release ${projPath} -o .`)
    const out = runCap(`dotnet nuget push *.nupkg -s https://api.nuget.org/v3/index.json -k ${nugetKey}`)
    const errorRegex = /(error: Response status code does not indicate success.*)/

    if (errorRegex.test(out))
        failed(`😭 ${errorRegex.exec(out)[1]}`)
}

function runCap(cmd) { return runCmd(cmd, { encoding: "utf-8" }).stdout }

function runProc(cmd) { runCmd(cmd, { encoding: "utf-8", stdio: [process.stdin, process.stdout, process.stderr] }) }

function runCmd(cmd, options) {
    const input = cmd.split(" "), tool = input[0], args = input.slice(1)
    return spawnSync(tool, args, options)
}

function failed(msg) {
    process.exitCode = 1
    console.log(`##[error]${msg}`)
}

run()