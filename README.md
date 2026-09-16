# ChangeGuard

ChangeGuard is an AI-powered DevOps control center for reviewing code changes, detecting delivery risk, and monitoring deployment health.

## What is included

- Change queue with High, Medium, and Low risk filters
- AI insight panel for concentrated risk signals
- Review drawer with risk score, summary, and approval state
- Deployment health metrics and activity timeline
- Recent team activity feed
- Responsive layout for desktop, tablet, and mobile
- Light and dark workspace themes

The current release uses realistic local data so the workflow can be evaluated without external credentials. The UI is structured so the local data layer can be replaced by API calls later.

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173/`.

## Quality checks

```bash
npm run lint
npm run build
npm run preview
```

`npm run build` runs TypeScript compilation and creates the production bundle in `dist/`.

## Run with Docker

Build and start the production container:

```bash
docker compose up --build
```

Open `http://localhost:8080/`. The container serves the compiled Vite bundle with Nginx, supports client-side route fallback, and exposes `http://localhost:8080/health` for health checks.

## Continuous integration

Every push to `main` or `master`, and every pull request targeting those branches, runs `npm ci`, `npm run lint`, and `npm run build` through [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Project structure

```text
src/
  App.tsx       Dashboard UI, local workflow state, and sample change data
  App.css       ChangeGuard visual system and responsive layout
  index.css     Global browser defaults and typography setup
  main.tsx      React application entry point
public/
  favicon.svg   Browser icon
.github/
  workflows/ci.yml  CI validation pipeline
Dockerfile          Multi-stage production image
docker-compose.yml  Local production container
nginx.conf          Static hosting and health endpoint
```

## Extending the data layer

Copy `.env.example` to `.env.local` when connecting a backend. Keep secrets out of the frontend bundle. The UI currently expects no environment variables, so the app runs without configuration.

For a production integration, replace the `changes` collection and activity metrics in `src/App.tsx` with authenticated API queries, then keep approval actions server-side and auditable.
