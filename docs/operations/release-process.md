# Release Process

## Goals
- Reproducible releases with automated validation.
- Clear mapping between tags, changelog entries, and deployable artifacts.

## CI Automation
GitHub workflow: `.github/workflows/release.yml`

Behavior:
- triggered manually (`workflow_dispatch`) with a tag input
- verifies the tag exists
- runs `pnpm check`
- creates a GitHub release with generated notes

## Operator Steps

## 1. Prepare Changelog
- Ensure `CHANGELOG.md` contains accurate entries for the release scope.

## 2. Create and Push Tag
```bash
git tag v0.1.0
git push origin v0.1.0
```

## 3. Run Release Workflow
- Open GitHub Actions.
- Run the `Release` workflow.
- Provide the tag (for example `v0.1.0`).

## 4. Verify Outputs
- Release exists under GitHub Releases.
- `pnpm check` passed in release job logs.
- Published notes reflect latest changelog scope.

## Failure Handling
If the release job fails:
1. fix failing checks on main
2. rerun workflow for same tag (if no artifact inconsistency)
3. if retag required, create a new tag and document superseded tag in changelog
