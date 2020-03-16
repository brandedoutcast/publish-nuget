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
    name: list on nuget
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      # Required for a specific dotnet version that doesn't come with ubuntu-latest / windows-latest
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
          # VERSION_FILE_PATH: Directory.Build.props # Filepath with version info, relative to repository root. Defaults to project file
          # VERSION_REGEX: <Version>(.*)<\/Version> # Regex pattern to extract version info in a capturing group
          # VERSION_STATIC: Bypasses version resolution; useful for external providers like Nerdbank.GitVersioning
          # TAG_COMMIT: true # Flag to enable / disalge git tagging
          # TAG_FORMAT: v* # Format of the git tag, [*] gets replaced with version
          # NUGET_KEY: ${{secrets.NUGET_API_KEY}} # nuget.org API key
          # PACKAGE_NAME: NuGet package name, required when it's different from project name. Defaults to project name
```

- With all settings on default, updates to project version are monitored on every push / PR merge to master & a new tag is created
- If a `NUGET_KEY` is present then the project gets built, packed & published to nuget.org

## Inputs
Most of the inputs are optional

Input | Default Value | Description
--- | --- | ---
PROJECT_FILE_PATH | | File path of the project to be packaged, relative to repository root
VERSION_FILE_PATH | `[PROJECT_FILE_PATH]` | File path containing version info, relative to repository root
VERSION_REGEX | `<Version>(.*)<\/Version>` | Regex pattern to extract version info in a capturing group
VERSION_STATIC| | Bypasses version resolution; useful for external providers like Nerdbank.GitVersioning
TAG_COMMIT | `true` | Flag to enable / disable git tagging
TAG_FORMAT | `v*` | `[*]` is a placeholder for the actual project version
NUGET_KEY | | API key to authorize the package upload to nuget.org
PACKAGE_NAME | | Name of the NuGet package, required when it's different from project name

**Note:**  
For multiple projects, every input except `PROJECT_FILE_PATH` can be given as `env` variable at [job / workflow level](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/workflow-syntax-for-github-actions#env)

## License
[MIT](LICENSE)
