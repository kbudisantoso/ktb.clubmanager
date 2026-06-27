# Branch Ruleset Configuration

## Overview

After deploying the CodeQL workflow, configure a branch ruleset to block PR merges when CodeQL finds critical or high severity issues.

## Prerequisites

- CodeQL workflow (`.github/workflows/codeql-analysis.yml`) must be merged to `main`
- At least one CodeQL scan must have completed successfully (check Repository > Security > Code scanning)

## Configuration Steps

### 1. Required Status Checks (CI Pipeline)

These ensure all CI jobs pass before merge:

1. Go to **Repository Settings > Rules > Rulesets**
2. Click **New branch ruleset**
3. **Ruleset name:** `CI and Security`
4. **Enforcement status:** Active
5. **Target branches:** Click "Add target" > "Include default branch"
6. Under **Branch rules**, enable **Require status checks to pass**
7. Click **Add checks** and add:
   - `CI Success` (from the CI workflow — this is the aggregation job)
8. Enable **Require branches to be up to date before merging**

### 2. Code Scanning Merge Protection

This blocks merges on critical/high CodeQL findings:

9. Under **Branch rules**, enable **Require code scanning results**
10. Click **Add tool** > Select **CodeQL**
11. Set **Alert severity threshold:** `High or higher`
    - This blocks merges on **Critical** and **High** severity alerts
    - Medium and lower alerts are visible in the Security tab but do not block merges
12. Click **Create** to save the ruleset

## Verification

After configuration:

1. Create a test PR
2. Verify CodeQL analysis runs automatically
3. Verify the `CI Success` status check is required
4. Check that the ruleset appears in Settings > Rules > Rulesets

## Dependabot & Auto-Merge

Dependabot updates are configured in `.github/dependabot.yml` to minimise PRs that
block each other on `pnpm-lock.yaml` and shared workflow files (e.g. `sbom.yml`):

- **Grouping** – npm version updates are grouped (minor/patch and major separately),
  github-actions updates are grouped into a single PR, and security updates (npm +
  actions) are bundled via `applies-to: security-updates`. This collapses what used
  to be many single-package PRs into a few.
- **Lower PR limits** (`open-pull-requests-limit`: npm 5, actions 3) and
  `rebase-strategy: auto` keep the number of simultaneously open, lockfile-touching
  PRs small and let Dependabot regenerate the lockfile after each merge.
- **Auto-merge** – `.github/workflows/dependabot-auto-merge.yml` waits for CI and
  enables auto-merge for non-major updates. Grouped PRs are evaluated by their
  highest update type, so a group containing a major bump needs manual review.

**Required repo setting:** "Allow auto-merge" must be enabled under
**Settings > General > Pull Requests**, otherwise `gh pr merge --auto` is a no-op and
PRs accumulate again. Combined with the required `CI Success` check above, auto-merge
only completes once CI is green.

## Notes

- Rulesets with code scanning merge protection are available for public repos on GitHub Free
- If severity threshold options are limited on your plan, fall back to requiring the `CI Success` status check only
- CodeQL alerts can always be reviewed in the **Security > Code scanning** tab regardless of merge blocking
