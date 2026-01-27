---
phase: quick-001
plan: 01
subsystem: automation
tags: [dependabot, security, maintenance, github-actions]

dependencies:
  requires: []
  provides:
    - Dependabot automation for npm packages
    - Dependabot automation for GitHub Actions
    - SHA-pinned GitHub Actions for security
  affects: []

tech-stack:
  added: []
  patterns:
    - SHA-pinned GitHub Actions with version comments
    - Grouped dependency updates (production/development)

key-files:
  created:
    - .github/dependabot.yml
  modified:
    - .github/workflows/update-feed.yaml

decisions:
  - id: dependabot-npm-daily
    what: npm packages checked daily
    rationale: Keep security patches current, especially @astrojs/check (lodash vulnerability)
  - id: dependabot-actions-weekly
    what: GitHub Actions checked weekly
    rationale: Balance freshness with stability for CI/CD
  - id: sha-pinned-actions
    what: Convert all actions to SHA-pinned format
    rationale: Immutable references prevent tag hijacking attacks
  - id: grouped-updates
    what: Group npm updates by production vs development
    rationale: Reduce PR noise, logical separation of concerns

metrics:
  duration: ~1 minute
  completed: 2026-01-27
---

# Quick Task 001: Automate Dependency Updates via Dependabot

**One-liner:** Dependabot automation for npm packages (daily) and SHA-pinned GitHub Actions (weekly) with grouped updates.

## Objective

Automate all dependency updates via Dependabot, converting GitHub Actions from tag-based versions to SHA-pinned versions while maintaining automated updates.

**Purpose:** Improve security posture (SHA pinning prevents tag hijacking) while reducing maintenance burden (Dependabot keeps everything current automatically, including the moderate lodash vulnerability via @astrojs/check).

## Execution Summary

### Tasks Completed

**Task 1: Create Dependabot configuration with npm and GitHub Actions ecosystems**
- Created `.github/dependabot.yml` with two package ecosystems
- npm ecosystem: daily checks, 10 PR limit, grouped by production/development
- GitHub Actions ecosystem: weekly checks, 5 PR limit
- Commit: c1e3341

**Task 2: Convert GitHub Actions to SHA-pinned versions**
- actions/checkout@v4 → actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4
- actions/setup-node@v4 → actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
- actions/upload-pages-artifact@v3 → actions/upload-pages-artifact@56afc609e74202658d3ffba0e8f6dda462b719fa # v3
- actions/deploy-pages@v4 → actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e # v4
- All 4 actions converted successfully
- Commit: c1e3341

**Task 3: Commit Dependabot automation setup**
- Committed both files with comprehensive message
- Commit hash: c1e3341
- Files: .github/dependabot.yml (new), .github/workflows/update-feed.yaml (modified)

### Deviations from Plan

None - plan executed exactly as written.

## Dependabot Configuration Details

### npm Ecosystem
- **Directory:** `/` (root package.json)
- **Schedule:** Daily
- **Open PRs limit:** 10
- **Versioning strategy:** increase (prefer newer versions)
- **Commit prefix:** `chore(deps):`
- **Groups:**
  - `production-dependencies`: All production deps (minor + patch)
  - `development-dependencies`: All dev deps (minor + patch)

**Packages monitored:**
- astro (^5.16.15)
- marked (^17.0.1)
- rss-parser (^3.13.0)
- js-yaml (^4.1.1)
- marked-gfm-heading-id (^4.1.3)
- marked-highlight (^2.2.3)
- zod (^3.25.76)
- @astrojs/check (^0.9.6) - will fix lodash vulnerability
- @types/js-yaml (^4.0.9)
- @types/marked (^5.0.2)
- pagefind (^1.4.0)

### GitHub Actions Ecosystem
- **Directory:** `/` (all workflows)
- **Schedule:** Weekly
- **Open PRs limit:** 5
- **Commit prefix:** `chore(actions):`

**Actions monitored:**
- actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4
- actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
- actions/upload-pages-artifact@56afc609e74202658d3ffba0e8f6dda462b719fa # v3
- actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e # v4

## SHA Conversions

| Action | Old Version | New SHA (with comment) |
|--------|-------------|------------------------|
| actions/checkout | @v4 | @34e114876b0b11c390a56381ad16ebd13914f8d5 # v4 |
| actions/setup-node | @v4 | @49933ea5288caeca8642d1e84afbd3f7d6820020 # v4 |
| actions/upload-pages-artifact | @v3 | @56afc609e74202658d3ffba0e8f6dda462b719fa # v3 |
| actions/deploy-pages | @v4 | @d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e # v4 |

**Security improvement:** SHAs are immutable (cryptographically secure), while tags can be force-pushed. Dependabot will automatically update SHAs when new versions are released.

## Expected Dependabot Behavior After Push

### Immediate (within minutes)
1. GitHub will detect `.github/dependabot.yml`
2. Dependabot will appear in repository Insights → Dependency graph
3. Initial dependency scan will run

### Daily (npm packages)
1. Dependabot checks all npm packages at random time each day
2. If updates available, creates grouped PRs:
   - One PR for production dependencies (if any)
   - One PR for development dependencies (if any)
3. Each PR will have commit message: `chore(deps): update production dependencies` or `chore(deps): update development dependencies`
4. PRs will include:
   - Package name and version changes
   - Release notes and changelogs
   - Compatibility scores

### Weekly (GitHub Actions)
1. Dependabot checks GitHub Actions on random day each week
2. If new versions available, creates PRs to update SHA pins
3. Each PR will have commit message: `chore(actions): bump actions/checkout from v4.0.0 to v4.1.0`
4. PRs will show old SHA → new SHA with version comments

### Expected First Wave
After push, likely to see:
- ✅ PR for @astrojs/check update (fixes lodash vulnerability)
- ✅ Possible PRs for other npm packages if patches available
- 🔄 GitHub Actions PRs will come within 7 days if newer versions exist

## Monitoring Dependabot PRs

### Via GitHub UI
1. Go to repository → Pull requests
2. Filter by `author:app/dependabot`
3. Review changes, check test results
4. Merge when green ✅

### Via GitHub CLI
```bash
# List all Dependabot PRs
gh pr list --author app/dependabot

# View specific PR
gh pr view <number>

# Merge PR when ready
gh pr merge <number> --auto --squash
```

### Dependabot Insights
1. Go to repository → Insights → Dependency graph
2. Click "Dependabot" tab
3. View:
   - Last check times
   - Update status
   - Any errors or warnings
   - Alert statuses

### Auto-merge (Optional - Not Configured)
To enable auto-merge for Dependabot PRs:
1. Add `.github/dependabot.yml` configuration for auto-approve
2. Enable branch protection rules with required status checks
3. Dependabot will auto-merge when CI passes

**Not recommended initially** - better to review first few PRs manually to ensure everything works.

## Decisions Made

### Technical Decisions
1. **SHA-pinned actions:** Use full 40-character SHA instead of tags for immutable security
2. **Version comments:** Keep `# v4` comments for human readability
3. **Grouped updates:** Separate production/development to reduce PR noise
4. **Daily npm checks:** Aggressive schedule for security patches
5. **Weekly actions checks:** Conservative schedule for CI/CD stability

### Commit Message Conventions
- npm updates: `chore(deps):` prefix
- GitHub Actions updates: `chore(actions):` prefix
- Follows project's conventional commits format

## Files Modified

### Created
- `.github/dependabot.yml` (31 lines)
  - npm ecosystem configuration
  - GitHub Actions ecosystem configuration
  - Grouped update rules

### Modified
- `.github/workflows/update-feed.yaml` (8 lines changed)
  - 4 actions converted to SHA-pinned format
  - All other configuration unchanged

## Next Phase Readiness

**Ready for production:** ✅

This change:
- ✅ Requires no user intervention (automated)
- ✅ Reduces maintenance burden
- ✅ Improves security posture
- ✅ Keeps dependencies current automatically
- ✅ Follows GitHub security best practices

**After push:**
- Dependabot will start monitoring immediately
- First PRs expected within 24 hours (npm) or 7 days (actions)
- Review and merge PRs as they arrive
- Monitor Dependabot insights for any issues

## Verification

### Pre-Push Verification ✅
- [x] Dependabot config is valid YAML
- [x] npm ecosystem configured with daily schedule
- [x] GitHub Actions ecosystem configured with weekly schedule
- [x] All 4 actions use SHA-pinned format
- [x] No tag-based versions remain (@v4, @v3)
- [x] Workflow syntax is valid (unchanged structure)
- [x] Changes committed locally

### Post-Push Verification (User)
1. Push to GitHub: `git push origin main`
2. Check repository → Insights → Dependency graph → Dependabot
3. Verify Dependabot runs automatically
4. Monitor for PRs within 24 hours (npm) or 7 days (actions)

## Success Criteria

- [x] `.github/dependabot.yml` exists with npm + github-actions ecosystems
- [x] All 4 GitHub Actions in update-feed.yaml are SHA-pinned with tag comments
- [x] No tag-based versions remain in workflow file
- [x] Dependabot config includes schedules, limits, and grouping
- [x] Changes committed locally with clear message
- [x] Workflow file remains syntactically valid
- [x] User can review before pushing to trigger Dependabot

## Performance

**Execution time:** ~44 seconds
**Tasks completed:** 3/3
**Commits created:** 1
**Files created:** 1
**Files modified:** 1

## Conclusion

Dependabot automation is now configured and ready to deploy. After push, the repository will receive automatic dependency update PRs:
- npm packages daily (fixes lodash vulnerability automatically)
- GitHub Actions weekly (maintains security)
- Grouped by dependency type (reduces noise)
- SHA-pinned for immutable security

**Manual maintenance reduced to:** Review and merge PRs when Dependabot creates them. Everything else is automated.

---

**Summary created:** 2026-01-27  
**Plan executed by:** Claude 3.5 Sonnet via OpenCode
