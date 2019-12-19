const resolve = require("path").resolve,
    spawnSync = require("child_process").spawnSync,
    { readdirSync, readFileSync } = require("fs")

function run() {
    // check fetch-depth
    const commitCount = parseInt(runCap("git rev-list --count HEAD"))
    if (commitCount < 2) {
        failed("😤 git commit history must be >= 2")
        return
    }

    // find project
    const repoDir = process.env.GITHUB_WORKSPACE,
        projDir = resolve(repoDir, process.env.INPUT_PROJECT_DIR),
        projFiles = readdirSync(projDir).filter(f => f.endsWith(".csproj"))

    if (projFiles.length === 0) {
        failed("😭 project not found")
        return
    }

    // check for version changes
    const projName = projFiles[0],
        projPath = resolve(projDir, projName).replace("\\", "\\\\"),
        versionRegex = /<Version>(.*)<\/Version>/,
        gitDiff = runCap(`git diff -U0 HEAD^ -- ${projPath}`),
        isVersionChanged = versionRegex.test(gitDiff)

    if (!isVersionChanged) {
        console.log(`🥱 no version change for ${projName}`)
        return
    }

    console.log(`👍 found a new version for ${projName}`)

    // create tag
    const projContents = readFileSync(projPath, { encoding: "utf-8" }),
        newVersion = versionRegex.exec(projContents)[1],
        tagFormat = process.env.INPUT_TAG_FORMAT,
        tag = tagFormat.replace("*", newVersion),
        istagPresent = runCap(`git ls-remote --tags origin ${tag}`).indexOf(tag) >= 0

    if (istagPresent) {
        console.log(`##[warning]😢 tag ${newVersion} already exists`)
        return
    }

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