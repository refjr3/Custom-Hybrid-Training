# AGENTS.md

## Cursor Cloud specific instructions

### Overview
This is **Fagundo Training OS** — a React 18 SPA (PWA) for HYROX/endurance training, built with Vite and deployed on Vercel. It is a single-product repo (not a monorepo).

### Services

| Service | How to run | Notes |
|---|---|---|
| Vite dev server (frontend) | `npm run dev` | Serves React app at `http://localhost:5173`. Use `--host 0.0.0.0` to expose outside localhost. |

### Key development notes

- **No linter or test framework** is configured. There are no `lint`, `test`, ESLint, or Prettier configs in the project.
- **No lockfile** is committed; `npm install` resolves latest compatible versions each time.
- **Environment variables**: The app requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a `.env` file for the Supabase client to initialize. Without real Supabase credentials the auth screen renders but API calls fail with "Failed to fetch". Create a `.env` with placeholder values to get the frontend running.
- **API routes** live in `/api/` and are Vercel serverless functions. They do **not** run under `npm run dev` (Vite only serves the frontend). To test API routes locally, use `vercel dev` (Vercel CLI) or a custom proxy.
- **Build**: `npm run build` produces a production bundle in `dist/`.
- **Scripts reference** (from `package.json`): `dev`, `build`, `preview`, `migrate`, `seed`.
