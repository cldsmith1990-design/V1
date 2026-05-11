# Family Command Center

A React + Vite + Tailwind CSS dashboard that surfaces kid-related email action items in one place.

## Features

- **Priority Action Queue** — top-4 urgent items always visible at a glance
- **Category tabs** — School, Dance, Theater, Sports, Calendar
- **May 2026 calendar view** — month grid with email-sourced events
- **Child filter** — All / Lily / Cole
- **Search** — filters cards by title or action text
- **Completion toggle** — mark cards done; they fade with strikethrough
- **Gmail deep links** — Open button goes directly to the source email
- **Google Calendar links** — Add Event button pre-fills title, dates, location
- **Built-in validation panel** — 11 sanity checks shown as PASS / FAIL

## Quick start

```bash
npm install
npm run dev
```

## Open in CodeSandbox (one click)

Open `open-in-codesandbox.html` in any browser and click the button.  
The launcher compresses all project files using LZ-String and POSTs them to  
`https://codesandbox.io/api/v1/sandboxes/define` — no manual copy-paste needed.

## Project structure

```
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── open-in-codesandbox.html   ← one-click launcher
└── src/
    ├── main.jsx
    ├── App.jsx                ← entire dashboard
    └── index.css
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Blank preview in CodeSandbox | Wait for the dependency install spinner to finish, then click the refresh icon in the preview pane. |
| `tailwindcss` classes not applied | Confirm `postcss.config.js` and `tailwind.config.js` are present; CSB sometimes caches old config. Fork the sandbox to reset. |
| `@vitejs/plugin-react` missing | Open the CSB terminal and run `npm install`. |
| Popup blocked on launcher | Allow popups for the local file in your browser settings, then click again. |
| LZ-String error in console | The launcher HTML must be opened from a local file (`file://`) or any HTTP server — not pasted into the address bar. |

## Tech stack

- React 18
- Vite 5
- Tailwind CSS 3
- No external icon libraries (inline Unicode / emoji only)
