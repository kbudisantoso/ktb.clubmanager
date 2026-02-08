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

## Notes

- Rulesets with code scanning merge protection are available for public repos on GitHub Free
- If severity threshold options are limited on your plan, fall back to requiring the `CI Success` status check only
- CodeQL alerts can always be reviewed in the **Security > Code scanning** tab regardless of merge blocking
