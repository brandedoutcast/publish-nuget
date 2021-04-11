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
    name: build, pack & publish
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      # - name: Setup dotnet
      #   uses: actions/setup-dotnet@v1
      #   with:
      #     dotnet-version: 3.1.200

      # Publish
      - name: Build Projects and Publish on Version Change
        id: publish_nuget
        uses: drusellers/publish-nuget@master
        with:
          # Filepath of the project to be packaged, relative to root of repository
          project-file-path: Core/Core.csproj

          # NuGet package id, used for version detection & defaults to project name
          # package-name: Core

          # Useful with external providers like Nerdbank.GitVersioning, ignores
          #     `extract-version-file-path` & `extract-version-regex`
          # version: 1.0.0

          # Filepath with version info, relative to root of repository &
          #     defaults to `project-file-path`
          # extract-version-file-path: Directory.Build.props

          # Regex pattern to extract version info in a capturing group
          # extract-version-regex: ^\s*<Version>(.*)<\/Version>\s*$

          # Flag to toggle git tagging, enabled by default
          # tag-commit: true

          # Format of the git tag, [*] gets replaced with actual version
          # tag-format: v*

          # API key to authenticate with NuGet server
          # nuget-key: ${{secrets.NUGET_API_KEY}}

          # NuGet server uri hosting the packages, defaults to https://api.nuget.org
          # nuget-source: https://api.nuget.org

          # Flag to toggle pushing symbols along with nuget package to the server,
          #     disabled by default
          # include-symbols: false
```

- Project gets published only if there's a `nuget-key` configured in the repository

## Inputs

Input | Default Value | Description
--- | --- | ---
project-file-path | | Filepath of the project to be packaged, relative to root of repository
package-name | | NuGet package id, used for version detection & defaults to project name
version| | Useful with external providers like Nerdbank.GitVersioning, ignores `extract-version-file-path` & `extract-version-regex`
extract-version-file-path | `[PROJECT_FILE_PATH]` | Filepath with version info, relative to root of repository & defaults to PROJECT_FILE_PATH
extract-version-regex | `^\s*<Version>(.*)<\/Version>\s*$` | Regex pattern to extract version info in a capturing group
tag-commit | `true` | Flag to toggle git tagging, enabled by default
tag-format | `v*` | Format of the git tag, `[*]` gets replaced with actual version
nuget-key | | API key to authenticate with NuGet server
nuget-source | `https://api.nuget.org` | NuGet server uri hosting the packages, defaults to https://api.nuget.org
include-symbols | `false` | Flag to toggle pushing symbols along with nuget package to the server, disabled by default

**FYI:**
- `nuget-source` must support `/v3-flatcontainer/PACKAGE_NAME/index.json` for version change detection to work
- Multiple projects can make use of steps to configure each project individually, common inputs between steps can be given as `env` for [job / workflow](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/workflow-syntax-for-github-actions#env)

## Outputs

Output | Description
--- | ---
version | Version of the associated git tag
package-name | Name of the NuGet package generated
package-path | Path to the generated NuGet package
symbols-package-name | Name of the symbols package generated
symbols-package-path | Path to the generated symbols package

**FYI:**
- Outputs may or may not be set depending on the action inputs or if the action failed

## License
[MIT](LICENSE)
