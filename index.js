const resolve = require("path").resolve,
    execSync = require("child_process").execSync,
    { readdirSync, readFileSync } = require("fs")

function run() {
    // check fetch-depth
    const commitCount = execSync("git rev-list --count HEAD", { encoding: "utf-8" })
    if (commitCount < 2) {
        failure("😤 commit history needs to be >= 2")
        return
    }

    // find project
    const repoDir = process.env.GITHUB_WORKSPACE,
        projDir = resolve(repoDir, process.env.INPUT_PROJECT_DIR),
        projFiles = readdirSync(projDir).filter(f => f.endsWith(".csproj"))

    if (projFiles.length === 0) {
        failure("😭 project not found")
        return
    }

    // check for version changes
    const projName = projFiles[0],
        projPath = resolve(projDir, projName),
        versionRegex = /<Version>(.*)<\/Version>/,
        gitDiff = execSync(`git diff -U0 HEAD^ -- ${projPath}`, { encoding: "utf-8" }),
        isVersionChanged = versionRegex.test(gitDiff)

    if (!isVersionChanged) {
        console.log(`🥱 no version change in ${projName}`)
        return
    }

    console.log(`👍 found version change in ${projName}`)

    // create tag
    const projContents = readFileSync(projPath, { encoding: "utf-8" }),
        newVersion = versionRegex.exec(projContents)[1],
        tagFormat = process.env.INPUT_TAG_FORMAT,
        tag = tagFormat.replace("*", newVersion),
        istagPresent = execSync("git tag -l --contains", { encoding: "utf-8" }).indexOf(tag) >= 0

    if (istagPresent) {
        console.log(`😢 tag named ${newVersion} already exists`)
        return
    }

    execSync(`git tag ${tag}`, { encoding: "utf-8" })
    execSync(`git push origin ${tag}`, { encoding: "utf-8" })

    // pack & push
    const nugetKey = process.env.INPUT_NUGET_KEY

    if (!nugetKey)
        return

    if (!execSync("command -v dotnet", { encoding: "utf-8" })) {
        failure("😭 dotnet not found")
        return
    }

    execSync(`dotnet pack -c Release ${projPath} -o .`, { encoding: "utf-8" })

    if (nugetKey)
        execSync(`dotnet nuget push *.nupkg -s https://api.nuget.org/v3/index.json -k ${nugetKey}`, { encoding: "utf-8" })
}

function failure(msg) {
    process.exitCode = 1
    console.log(msg)
}

run()