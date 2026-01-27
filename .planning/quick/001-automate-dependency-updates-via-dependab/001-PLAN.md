---
phase: quick-001
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .github/dependabot.yml
  - .github/workflows/update-feed.yaml
autonomous: true

must_haves:
  truths:
    - "Dependabot checks for npm package updates daily"
    - "Dependabot checks for GitHub Actions updates weekly"
    - "All GitHub Actions are pinned to SHA with tag comments"
    - "Dependabot auto-updates both npm packages and GitHub Actions SHAs"
  artifacts:
    - path: ".github/dependabot.yml"
      provides: "Dependabot configuration for npm and GitHub Actions"
      min_lines: 20
    - path: ".github/workflows/update-feed.yaml"
      provides: "SHA-pinned GitHub Actions with tag comments"
      contains: "actions/checkout@[a-f0-9]{40} # v4"
  key_links:
    - from: ".github/dependabot.yml"
      to: "package.json"
      via: "npm ecosystem monitoring"
      pattern: "package-ecosystem: npm"
    - from: ".github/dependabot.yml"
      to: ".github/workflows/"
      via: "github-actions ecosystem monitoring"
      pattern: "package-ecosystem: github-actions"
---

<objective>
Automate all dependency updates via Dependabot, converting GitHub Actions from tag-based versions to SHA-pinned versions while maintaining automated updates.

Purpose: Improve security posture (SHA pinning prevents tag hijacking) while reducing maintenance burden (Dependabot keeps everything current automatically, including the moderate lodash vulnerability via @astrojs/check).

Output: Dependabot configuration + SHA-pinned workflow file with automated update PRs.
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
@package.json
@.github/workflows/update-feed.yaml

Current workflow uses:
- actions/checkout@v4
- actions/setup-node@v4
- actions/upload-pages-artifact@v3
- actions/deploy-pages@v4

Need to convert to SHA format: `actions/checkout@<full-sha> # v4`
</context>

<tasks>

<task type="auto">
  <name>Create Dependabot configuration with npm and GitHub Actions ecosystems</name>
  <files>.github/dependabot.yml</files>
  <action>
    Create `.github/dependabot.yml` with two package ecosystems:

    **npm ecosystem:**
    - Directory: `/` (root package.json)
    - Schedule: daily
    - Open pull requests limit: 10
    - Groups: Production dependencies (dependencies) and development dependencies (devDependencies)
    - This will automatically create PRs for:
      - Astro updates (currently ^5.16.15)
      - marked updates (currently ^17.0.1)
      - All other npm packages
      - Will address the moderate lodash vulnerability via @astrojs/check update

    **github-actions ecosystem:**
    - Directory: `/` (all workflows)
    - Schedule: weekly
    - Open pull requests limit: 5
    - This will automatically update SHA pins when new versions released

    Follow GitHub's official Dependabot configuration schema:
    - version: 2
    - Use YAML format
    - Enable versioning-strategy: increase for npm (use newer versions)
    - Add commit message prefix "chore(deps):" for npm, "chore(actions):" for GitHub Actions
  </action>
  <verify>
    ```bash
    cat .github/dependabot.yml
    # Should show valid YAML with npm and github-actions ecosystems
    # Check for schedule.interval, open-pull-requests-limit, groups
    ```
  </verify>
  <done>
    - File `.github/dependabot.yml` exists
    - Contains npm ecosystem targeting root directory with daily schedule
    - Contains github-actions ecosystem with weekly schedule
    - Includes grouped updates for npm dependencies
    - Valid YAML syntax
  </done>
</task>

<task type="auto">
  <name>Convert GitHub Actions to SHA-pinned versions</name>
  <files>.github/workflows/update-feed.yaml</files>
  <action>
    Replace all tag-based action versions with SHA-pinned versions using format `<action>@<full-sha> # <tag>`.

    **Look up current SHAs for v4/v3 tags:**
    1. actions/checkout@v4 → Find SHA for v4 tag
    2. actions/setup-node@v4 → Find SHA for v4 tag  
    3. actions/upload-pages-artifact@v3 → Find SHA for v3 tag
    4. actions/deploy-pages@v4 → Find SHA for v4 tag

    **Use gh CLI to find SHAs:**
    ```bash
    # Example for checkout
    gh api repos/actions/checkout/git/ref/tags/v4 --jq '.object.sha'
    ```

    **Format:** `uses: actions/checkout@<40-char-sha> # v4`

    **Why SHA pinning:**
    - Tags are mutable (can be force-pushed)
    - SHAs are immutable (cryptographically secure)
    - Dependabot will update SHAs when new versions released
    - Comments preserve human-readable version for reference

    Update all 4 actions in update-feed.yaml. Keep all other workflow configuration unchanged (permissions, concurrency, steps, etc.).
  </action>
  <verify>
    ```bash
    grep -E 'uses:.*@[a-f0-9]{40}' .github/workflows/update-feed.yaml | wc -l
    # Should return 4 (one for each action)
    
    grep -E 'uses:.*@v[0-9]' .github/workflows/update-feed.yaml | wc -l
    # Should return 0 (no more tag-based versions)
    
    cat .github/workflows/update-feed.yaml
    # Manually verify SHA format and comments are correct
    ```
  </verify>
  <done>
    - All 4 GitHub Actions use SHA-pinned format: `@<sha> # v4`
    - No tag-based versions remain (@v4, @v3)
    - Workflow syntax is valid
    - All other configuration unchanged
  </done>
</task>

<task type="auto">
  <name>Commit Dependabot automation setup</name>
  <files>.github/dependabot.yml, .github/workflows/update-feed.yaml</files>
  <action>
    Commit both files with clear message:

    ```bash
    git add .github/dependabot.yml .github/workflows/update-feed.yaml
    git commit -m "chore(deps): automate dependency updates via dependabot

    - Add Dependabot config for npm (daily) and GitHub Actions (weekly)
    - Convert GitHub Actions to SHA-pinned versions for security
    - Group npm updates by dependency type (prod vs dev)
    - Enable automatic PRs for all dependency updates

    This will:
    - Keep all npm packages current (including fixing lodash vulnerability)
    - Keep GitHub Actions secure and up-to-date
    - Reduce manual maintenance burden

    Assisted-by: Claude 3.5 Sonnet via OpenCode"
    ```

    Do NOT push yet - user may want to review first.
  </action>
  <verify>
    ```bash
    git log -1 --stat
    # Should show commit with 2 files changed
    
    git diff HEAD~1 HEAD -- .github/dependabot.yml
    # Should show new Dependabot config
    
    git diff HEAD~1 HEAD -- .github/workflows/update-feed.yaml
    # Should show SHA conversions
    ```
  </verify>
  <done>
    - Commit exists with both files
    - Commit message follows conventional commits format
    - Changes staged correctly
    - Ready to push when user approves
  </done>
</task>

</tasks>

<verification>
**Before push:**
1. Validate Dependabot config syntax (valid YAML, correct schema)
2. Verify all GitHub Actions use SHA@comment format
3. Check workflow file still valid (no syntax errors introduced)

**After push:**
1. Check GitHub repository → Insights → Dependency graph → Dependabot
2. Verify Dependabot runs automatically (may take a few minutes)
3. Expect PRs for any outdated dependencies within 24 hours (npm) or 7 days (actions)

**Expected behavior:**
- Dependabot checks npm packages daily at random time
- Dependabot checks GitHub Actions weekly on random day
- PRs will auto-create with commit message prefix "chore(deps):" or "chore(actions):"
- Grouped npm updates reduce PR noise (prod deps in one PR, dev deps in another)
</verification>

<success_criteria>
- [ ] `.github/dependabot.yml` exists with npm + github-actions ecosystems
- [ ] All 4 GitHub Actions in update-feed.yaml are SHA-pinned with tag comments
- [ ] No tag-based versions remain in workflow file
- [ ] Dependabot config includes schedules, limits, and grouping
- [ ] Changes committed locally with clear message
- [ ] Workflow file remains syntactically valid
- [ ] User can review before pushing to trigger Dependabot
</success_criteria>

<output>
After completion, create `.planning/quick/001-automate-dependency-updates-via-dependab/001-SUMMARY.md` with:
- Dependabot configuration details (ecosystems, schedules, groups)
- List of SHA conversions (action → old version → new SHA)
- Expected Dependabot behavior after push
- Instructions for monitoring Dependabot PRs
</output>
