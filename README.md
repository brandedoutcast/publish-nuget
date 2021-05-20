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
      - name: publish on version change
        id: publish_nuget
        uses: rohith/publish-nuget@v2
        with:
          # Filepath of the solution of which contains all the projects to be packed, relative to root of repository
          SOLUTION_FILE_PATH: solution.sln
          
          # Filepath of the project to be packaged, relative to root of repository
          PROJECT_FILE_PATH: Core/Core.csproj
          
          # Path to store all generated nuget packages, relative to root of repository
          PACKAGE_PATH: artifacts/
          
          # NuGet package id, used for version detection & defaults to project name
          # PACKAGE_NAME: Core
          
          # Filepath with version info, relative to root of repository & defaults to PROJECT_FILE_PATH
          # VERSION_FILE_PATH: Directory.Build.props

          # Regex pattern to extract version info in a capturing group
          # VERSION_REGEX: ^\s*<Version>(.*)<\/Version>\s*$
          
          # Useful with external providers like Nerdbank.GitVersioning, ignores VERSION_FILE_PATH & VERSION_REGEX
          # VERSION_STATIC: 1.0.0

          # Flag to toggle git tagging, enabled by default
          # TAG_COMMIT: true

          # Format of the git tag, [*] gets replaced with actual version
          # TAG_FORMAT: v*

          # API key to authenticate with NuGet server
          # NUGET_KEY: ${{secrets.NUGET_API_KEY}}

          # NuGet server uri hosting the packages, defaults to https://api.nuget.org
          # NUGET_SOURCE: https://api.nuget.org

          # Flag to toggle pushing symbols along with nuget package to the server, disabled by default
          # INCLUDE_SYMBOLS: false
```

- Project gets published only if there's a `NUGET_KEY` configured in the repository

## Inputs

Input | Default Value | Description
--- | --- | ---
SOLUTION_FILE_PATH | | Filepath of the solution of which contains all the projects to be packed, relative to root of repository
PROJECT_FILE_PATH | | Filepath of the project to be packaged or a glob of projects in the form of \*\*/\*.csproj, relative to root of repository
PACKAGE_PATH | | Path to store all generated nuget packages, relative to root of repository
PACKAGE_NAME | | NuGet package id, used for version detection & defaults to project name
VERSION_FILE_PATH | `[PROJECT_FILE_PATH]` | Filepath with version info, relative to root of repository & defaults to PROJECT_FILE_PATH
VERSION_REGEX | `^\s*<Version>(.*)<\/Version>\s*$` | Regex pattern to extract version info in a capturing group
VERSION_STATIC| | Useful with external providers like Nerdbank.GitVersioning, ignores VERSION_FILE_PATH & VERSION_REGEX
TAG_COMMIT | `true` | Flag to toggle git tagging, enabled by default
TAG_FORMAT | `v*` | Format of the git tag, `[*]` gets replaced with actual version
NUGET_KEY | | API key to authenticate with NuGet server
NUGET_SOURCE | `https://api.nuget.org` | NuGet server uri hosting the packages, defaults to https://api.nuget.org
INCLUDE_SYMBOLS | `false` | Flag to toggle pushing symbols along with nuget package to the server, disabled by default

## Outputs

Output | Description
--- | ---
VERSION | Version of the associated git tag
PACKAGE_NAME | Name of the NuGet package generated
PACKAGE_PATH | Path to the generated NuGet package
SYMBOLS_PACKAGE_NAME | Name of the symbols package generated
SYMBOLS_PACKAGE_PATH | Path to the generated symbols package

**FYI:**
- Outputs may or may not be set depending on the action inputs or if the action failed
- `NUGET_SOURCE` must support `/v3-flatcontainer/PACKAGE_NAME/index.json` for version change detection to work
- Multiple projects can use file globbing to package each of them up and push them.

## License
[MIT](LICENSE)
