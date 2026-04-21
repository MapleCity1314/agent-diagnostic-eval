# Repository Guidelines

## Project Structure & Module Organization
This repository is a pnpm/TypeScript workspace for agent evaluation scenarios. Top-level experiment configs live in `experiments/` (`cc.ts`, `codex.ts`, `d-suite.ts`) and define which agent, run count, and timeout to use. Scenario fixtures live under `evals/` and follow a paired naming pattern such as `d0-control-baseline` and `d0-control-docs`. Each fixture is a self-contained Next.js app with its own `app/`, optional `components/`, `lib/`, `pages/`, `docs/`, `PROMPT.md`, and `EVAL.ts`.

## Build, Test, and Development Commands
Install dependencies once at the repo root with `pnpm install`.

Key commands:
- `npx @vercel/agent-eval cc --dry`: preview the Claude Code run without API calls.
- `npx @vercel/agent-eval cc`: execute the Claude Code experiment from `experiments/cc.ts`.
- `npx @vercel/agent-eval codex`: execute the Codex experiment from `experiments/codex.ts`.
- `npx @vercel/agent-eval playground`: open the local results viewer.
- `npm run build`: run inside a specific fixture directory to verify the target app builds.
- `npm run typecheck`: run inside a fixture to catch TypeScript regressions before an eval.

## Coding Style & Naming Conventions
Use TypeScript with ES modules and 2-space indentation, matching existing files. Keep experiment configs minimal and declarative. Preserve fixture naming patterns: `d<number>-<scenario>-<variant>`, where variant is usually `baseline` or `docs`. Use `PascalCase` for React components, `camelCase` for variables/functions, and keep prompt or docs filenames descriptive (`PROMPT.md`, `connection.md`, `use-cache.md`).

## Testing Guidelines
Vitest is used for evaluation assertions. Tests live in each fixture’s `EVAL.ts` and typically inspect source files plus a real `next build`. Name tests with the scenario ID first, for example `D0-S2a: unstable_cache wraps data fetching`. Before submitting changes to a fixture, run that fixture’s `npm run build` and, when relevant, `vitest` against its `EVAL.ts`.

## Commit & Pull Request Guidelines
Git history is not included in this workspace snapshot, so no repository-specific commit convention can be verified here. Use short imperative commit subjects scoped to the fixture, such as `d2-context-adaptation-docs: add category cache tags`. PRs should state which fixture(s) changed, what behavior the eval is measuring, how you verified it, and include screenshots only when UI output is part of the task.

## Configuration Tips
Copy `.env.example` to `.env.local` and provide exactly one agent API key plus one sandbox option before running paid evals. Do not commit secrets, generated result artifacts, or per-user environment files.
