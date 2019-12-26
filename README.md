# ✨ Publish NuGet
GitHub action to build, pack & publish nuget pacakges automatically when a project version is updated

## Usage
Create a new `.github/workflows/publish-nuget.yml` file:

```yaml
name: publish to nuget
on:
  push:
    branches:
      - master # Your default release branch
jobs:
  publish:
    name: publish to nuget
    runs-on: ubuntu-latest
    steps:
      # Checkout
      - uses: actions/checkout@v2

      # Optional step, add only for a specific dotnet version that doesn't come with ubuntu-latest / windows-latest
      # Visit bit.ly/2synnZl for a list of software that comes pre-installed with ubuntu-latest / windows-latest
      # - name: Setup dotnet
      #   uses: actions/setup-dotnet@v1
      #   with:
      #     dotnet-version: 3.1.100
      
      # Publish
      - name: Publish if version is updated
        uses: rohith/publish-nuget@v1
        # with: # All inputs are optional (details given below)
        #   project_dir: src # Defaults to repository root
        #   tag_format: v* # [*] gets replaced with version
        #   nuget_key: ${{secrets.NUGET_API_KEY}} # nuget.org API key
```

- Project version updates are monitored on every push / PR merge to master & a new tag is created to denote the updated version
- If a `nuget_key` is present then the project gets built, packed & published to nuget.org

## Inputs
All these inputs are optional

Input | Description
--- | ---
project_dir | Directory path containing the project file, defaults to repository root
tag_format | Defaults to `v*` - `[*]` is a placeholder for the actual project version
nuget_key | API key to authorize the package upload to nuget.org

**Note:**  
`project_dir` & `tag_format` have default values but a package cannot be published without the `nuget_key`

## License
[MIT](LICENSE)