# Dashboard Folder Standard

This folder is the safe home for every dashboard in this repository.

## Rule

Every dashboard gets its own folder.

```text
dashboards/
  dashboard-name/
    index.html
    data.js
    app.js
    styles.css
```

## Why this exists

This prevents one dashboard from accidentally overwriting or breaking another dashboard.

For example:

```text
dashboards/chore-allowance/index.html
```

is separate from:

```text
dashboards/family-dashboard/index.html
```

Each dashboard should have its own local files unless there is a deliberate shared-library decision.

## Safe creation rule for ChatGPT, Codex, and other AI tools

Do not overwrite existing dashboard files unless Doug explicitly says to replace them.

When creating a new dashboard:

1. Create a new folder under `dashboards/`.
2. Use a unique dashboard folder name.
3. Put that dashboard's files inside that folder.
4. If a file or folder already exists, stop and report what exists before changing it.
5. Do not reuse root-level files like `app.js`, `styles.css`, or `data.js` for unrelated dashboards.

## Current organized dashboards

```text
dashboards/chore-allowance/
```

This is the organized dashboard-folder version of the existing Kids Chore Dashboard.
The original root-level files were left untouched for safety.

```text
dashboards/smart-goal-command/
```

This is the standalone 2026 SMART Goal Command Dashboard for Douglas Smith's IT goals, ELT evidence readiness, and local-first progress tracking.
