# Modern Furniture Dashboard — Netlify deployment scaffold

Place your current dashboard HTML file at the project root and rename it to `index.html`.

Project structure:

modern-furniture-dashboard/
├── index.html
├── package.json
├── netlify.toml
├── .gitignore
└── netlify/
    └── functions/
        └── analyze.mjs

Important:
- The frontend should call `/api/analyze`.
- Do not put your Gemini API key in `index.html`.
- Add `GEMINI_API_KEY` in Netlify Site Configuration → Environment variables.
