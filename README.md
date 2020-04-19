# ✨ Publish NuGet
GitHub action to build, pack & publish nuget packages automatically when a project version is updated

## Usage
Create new `.github/workflows/publish.yml` file:

```yml
name: publish to nuget
on:
  push:
    branches:
      - master # Default release branch
jobs:
  publish:
    name: build, pack & push
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      # Required in case of previous dotnet SDK versions as the host always has latest version installed
      # Visit bit.ly/2synnZl to see the list of SDKs that are pre-installed with ubuntu-latest / windows-latest
      # - name: Setup dotnet
      #   uses: actions/setup-dotnet@v1
      #   with:
      #     dotnet-version: 3.1.100

      # Publish
      - name: publish on version change
        uses: rohith/publish-nuget@v2
        with:
          PROJECT_FILE_PATH: Core/Core.csproj # Relative to repository root
          # PACKAGE_NAME: NuGet package id, REQUIRED if it's different from project name
          # VERSION_FILE_PATH: Directory.Build.props # Relative to repository root, defaults to project file
          # VERSION_REGEX: <Version>(.*)<\/Version> # Regex pattern to extract version info in a capturing group
          # VERSION_STATIC: Static version, useful for external providers like Nerdbank.GitVersioning
          # TAG_COMMIT: true # Flag to enable / disable git tagging
          # TAG_FORMAT: v* # Format of the git tag, [*] gets replaced with version
          # NUGET_KEY: ${{secrets.NUGET_API_KEY}} # API key for the NuGet feed
```

- Project gets built, packed & published only if there's a `NUGET_KEY` configured in the repository

## Inputs

Input | Default Value | Description
--- | --- | ---
PROJECT_FILE_PATH | | Filepath of the project to be packaged, relative to root of repository
PACKAGE_NAME | | NuGet package id to check against version changes, defaults to project name
VERSION_FILE_PATH | `[PROJECT_FILE_PATH]` | Filepath containing version info, relative to root of repository
VERSION_REGEX | `<Version>(.*)<\/Version>` | Regex pattern to extract version info in a capturing group
VERSION_STATIC| | Static version, useful for external providers like Nerdbank.GitVersioning
TAG_COMMIT | `true` | Flag to enable / disable git tagging
TAG_FORMAT | `v*` | Format of the git tag, `[*]` gets replaced with version
NUGET_KEY | | API key for the NuGet feed

**Note:**
Multiple projects can make use of steps to configure each project individually, common inputs between steps can be given as `env` for [job / workflow](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/workflow-syntax-for-github-actions#env)

## License
[MIT](LICENSE)
