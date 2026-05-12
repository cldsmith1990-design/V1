# Idea Hub Command Dashboard

The Idea Hub Command Dashboard is a fully static, offline-capable dashboard for capturing, organizing, pressure-testing, scoring, prioritizing, backing up, and exporting ideas.

## Files

- `Idea Dashboard.html` — the static HTML shell and root mount point.
- `idea-styles.css` — dedicated dark-mode dashboard styling.
- `idea-dashboard-data.js` — replaceable seed data file that defines `window.IDEA_DASHBOARD_DATA`.
- `idea-app.js` — vanilla JavaScript app logic that reads seed data, renders the UI, saves edits to `localStorage`, and handles exports/imports.

## How to use

1. Open `Idea Dashboard.html` directly in a browser.
2. Use **New Idea** to capture an idea.
3. Move ideas on the **Idea Board** by changing the status dropdown or dragging cards into another status column.
4. Use **Pressure Test** to review each idea through the required sections.
5. Use **Notes** for global notes or notes attached to a specific idea.
6. Use **Export Center** or **Data Backup** to download Markdown or JSON files.

No backend, package manager, build step, external library, or network connection is required.

## Data and persistence

The default data lives in `idea-dashboard-data.js`. The app keeps that file as seed data and stores user edits in browser `localStorage` under the key configured in `window.IDEA_DASHBOARD_DATA.meta.localStorageKey`.

Use **Reset Seed** or **Reset from seed data** to reload the dashboard from `idea-dashboard-data.js` after confirmation. This replaces the saved local edits in that browser.

## Required statuses

The seed file includes these statuses:

- Raw Idea
- Clarify
- Pressure Test
- Research
- Low-Risk Test
- Build
- Parked
- Done

## Scoring

Each idea has four transparent 1–5 scores:

- Value
- Effort
- Risk
- Executive Function Load

The dashboard calculates the Next Best Move score with:

```text
(valueScore * 3) - effortScore - riskScore - executiveFunctionLoad
```

The Command Center sorts active, non-parked, non-done ideas by this score and shows the top three.

## Backup and restore

- **Export JSON backup** downloads the full current app state, including ideas and notes.
- **Import JSON backup** replaces the current saved state with a compatible JSON backup after confirmation.
- **Copy JSON** copies the current state to the clipboard where supported; otherwise the browser shows a copy prompt.

## Markdown export

Markdown exports include:

- Title
- Generated date
- Summary
- Ideas grouped by status
- Idea details: title, category, priority, status, scores, raw idea, pressure-test sections, notes, and next action

## Accessibility notes

The dashboard uses semantic buttons, visible focus styling, `aria` labels for important controls, Escape-to-close modal behavior, focus trapping inside dialogs, and focus restoration when overlays close.
