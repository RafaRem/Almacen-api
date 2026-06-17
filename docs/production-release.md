# Production Release Deploys

Production deploys are driven by GitHub Releases:

1. Create a version tag from the commit that should go to production.
2. Create a GitHub Release for that tag.
3. Publish the GitHub Release.
4. The `Deploy Production` workflow builds the Docker image, pushes it to ACR, runs database migrations, applies Terraform, and verifies `/health`.

Draft releases do not deploy. Publishing the release is the production deploy action.

## Create A Draft Release

Use a draft while preparing release notes or asking for review. This does not deploy production.

```sh
git fetch origin main --tags
git checkout main
git pull --ff-only origin main
git tag -a v0.0.1 -m "Release v0.0.1"
git push origin v0.0.1
gh release create v0.0.1 --draft --title "v0.0.1" --notes "Production release v0.0.1"
```

You can also create the draft from the GitHub Releases page:

```text
https://github.com/RafaRem/Almacen-api/releases
```

## Publish To Production

When the release is ready, publish the draft release from GitHub. Publishing triggers `.github/workflows/deploy-prod.yml`.

The workflow deploys only normal releases. Pre-releases fail fast and do not deploy production.

## Image Tags

For a release tag such as `v0.0.1`, the workflow pushes:

```text
acrnuevaeraprod2xg97h.azurecr.io/almacen-api:v0.0.1
acrnuevaeraprod2xg97h.azurecr.io/almacen-api:sha-<commit>
acrnuevaeraprod2xg97h.azurecr.io/almacen-api:latest
```

Terraform deploys the release tag image, not `latest`.

## Verification

After the workflow succeeds, verify production with:

```sh
curl -i https://ca-api-nueva-era-prod.politebay-8cbb74a2.eastus2.azurecontainerapps.io/health
```
