# agent-diagnostic-eval

**Diagnostic evaluation for Coding Agents at knowledge boundaries.**

Most benchmarks answer *"did it pass?"* — this suite answers *"where did it fail, why, and would documentation have fixed it?"*

```
Task: "Update this page to use the current caching API."

Agent output: unstable_cache()        ← old API, build passes, eval fails.

Diagnosis:
  Stage of failure:   0 — Problem Recognition
  Fallback pattern:   F1 — Confident Substitution
  Root cause:         Agent didn't know its knowledge was outdated.
  Doc injection fix:  Yes — +docs condition passes.
```

---

## What This Measures

Every agent run is analyzed through two complementary lenses:

```
                    ┌─────────────────────────────────────────┐
                    │            DIAGNOSTIC OUTPUT            │
                    ├────────────────────┬────────────────────┤
                    │   Failure Stage    │  Fallback Pattern  │
                    │   (where)          │  (what behavior)   │
                    ├────────────────────┼────────────────────┤
                    │ S0  Recognition    │ F1  Confident Sub. │
                    │ S1  Retrieval      │ F2  Partial Adopt. │
                    │ S2  Comprehension  │ F3  Hallucinated   │
                    │ S3  Planning       │ F4  Wrong Semantic  │
                    │ S4  Code Gen       │ F5  Over-Migration │
                    │ S5  Verification   │                    │
                    └────────────────────┴────────────────────┘
```

A failed run doesn't just get a ❌. It gets a coordinate: **Stage 0, Pattern F1** — the agent didn't know it didn't know, used the old API with full confidence, and its own build verification passed. That's actionable.

---

## The Six Stages

Each stage represents a cognitive checkpoint in the agent's execution:

| Stage | Name | Question | Observable Via |
|-------|------|----------|----------------|
| **S0** | Problem Recognition | Does the agent know its knowledge might be outdated? | Transcript: doc reads before first code write |
| **S1** | Document Retrieval | Does it find and read the right documentation sections? | Transcript: file-read operations, line ranges |
| **S2** | Semantic Comprehension | Does it understand constraints, not just call signatures? | Code: constraint adherence assertions |
| **S3** | Solution Planning | Does it choose the right files to modify — and the right ones to leave alone? | Diff: modification scope analysis |
| **S4** | Code Generation | Does the code compile and use correct API signatures? | Build exit code, AST inspection |
| **S5** | Self-Verification | Does it check its own work? Does the check actually catch errors? | Transcript: post-generation commands |

The most common failure path skips S0–S2 entirely:

```
skip S0 → skip S1 → skip S2 → S3 (old knowledge) → S4 → S5 (pass!) → done
                                                                  ↑
                                              agent thinks it succeeded
```

## The Five Fallback Patterns

When an agent's knowledge is insufficient, it doesn't just stop — it falls back to training-data patterns in classifiable ways:

| Pattern | Name | Signature | Severity |
|---------|------|-----------|----------|
| **F1** | Confident Substitution | Old API used exclusively, no docs consulted, build passes | 🔴 Highest |
| **F2** | Partial Adoption | Mix of old and new APIs; old appears in complex sections | 🟡 Lower |
| **F3** | Hallucinated API | Nonexistent API calls (portmanteau of old + new, or cross-framework analogy) | 🟠 Moderate |
| **F4** | Correct Syntax, Wrong Semantics | Right API, right signature, violated constraint | 🔴 High |
| **F5** | Over-Migration | New API applied where old should be preserved; breaks legacy code | 🟡 Lowest |

F1 is uniquely dangerous: it's the only pattern that produces **no error signal**. The agent's self-verification passes, reinforcing the incorrect solution. Every other pattern generates at least some failure feedback.

### Stage × Pattern Matrix

These two dimensions intersect predictably:

```
                     F1      F2      F3      F4      F5
                   ┌───────┬───────┬───────┬───────┬───────┐
  S0 Recognition   │ █████ │       │   ░   │       │       │
  S1 Retrieval     │   ░   │       │ █████ │       │       │
  S2 Comprehension │       │   ░   │       │ █████ │       │
  S3 Planning      │       │ █████ │       │       │ █████ │
  S4 Code Gen      │       │       │   ░   │       │       │
  S5 Verification  │   ░   │       │       │   ░   │       │
                   └───────┴───────┴───────┴───────┴───────┘
                   █████ = primary association    ░ = secondary
```

---

## Eval Cases

Five cases. Each targets a specific region of the Stage × Pattern matrix. Each runs twice: **baseline** (no docs) and **+docs** (documentation injected). The delta is the measurement.

| Case | Task | Primary Diagnostic | Expected Failure Pattern |
|------|------|--------------------|--------------------------|
| **D0** | Cache a product list with known APIs | Control — baseline adaptation ability | Should pass for all models |
| **D1** | Replace deprecated `unstable_noStore()` with current API | S0: Does it know things changed? | F1 (Confident Substitution) |
| **D2** | Apply `"use cache"` at component level from function-level docs | S2: Can it adapt API semantics to new context? | F4 (Wrong Semantics) / F2 |
| **D3** | Compose `connection()` + `after()` with cross-doc constraint | S2: Can it infer interaction constraints across docs? | F4 (Wrong Semantics) |
| **D4** | Upgrade App Router caching, preserve Pages Router legacy | S3: Can it discriminate upgrade vs. preserve? | F5 (Over-Migration) |

**D0 exists as a paired control for D2.** Same task, same complexity, but with APIs the model already knows. If a model passes D0 but fails D2, the failure is specifically in doc-to-execution transfer, not general adaptation ability.

### Multi-Stage Assertions

Each case includes assertions mapped to multiple stages. Example from D1:

```
D1-S0   Transcript: docs read before first code write          → Stage 0
D1-S2a  Code: connection imported from next/server              → Stage 2
D1-S2b  Code: unstable_noStore does not appear in any file      → Stage 2
D1-S4   next build exits 0                                      → Stage 4
D1-S5   Transcript: agent ran build after changes               → Stage 5
```

A case with only `next build` assertions is a benchmark. A case with assertions at S0, S2, S4, and S5 is a diagnostic tool.

---

## Per-Run Output

Each run produces structured diagnostic data:

```json
{
  "case": "D1",
  "model": "k25",
  "condition": "docs",
  "run": 1,
  "assertions": {
    "D1-S0":  { "pass": false, "detail": "No doc reads before first code write" },
    "D1-S2a": { "pass": false, "detail": "connection not found in imports" },
    "D1-S2b": { "pass": false, "detail": "unstable_noStore found in app/page.tsx:7" },
    "D1-S4":  { "pass": true,  "detail": "Build succeeded" },
    "D1-S5":  { "pass": true,  "detail": "Agent ran npm run build at step 14" }
  },
  "diagnosis": {
    "stage_of_failure": 0,
    "fallback_pattern": "F1",
    "detail": "Agent used unstable_noStore() without consulting docs. Build passed with old API."
  }
}
```

### Aggregate Output

The core deliverable is a **Stage × Pattern frequency table** per model per condition:

```
K2.5 Baseline                              K2.5 +Docs
         F1   F2   F3   F4   F5   Pass              F1   F2   F3   F4   F5   Pass
S0      [ 3] [  ] [  ] [  ] [  ] [  ]      S0      [  ] [  ] [  ] [  ] [  ] [ 3]
S2      [  ] [  ] [  ] [  ] [  ] [  ]      S2      [  ] [ 1] [  ] [ 2] [  ] [  ]
S3      [  ] [  ] [  ] [  ] [  ] [  ]      S3      [  ] [  ] [  ] [  ] [ 2] [ 1]
Ctrl    [  ] [  ] [  ] [  ] [  ] [ 3]      Ctrl    [  ] [  ] [  ] [  ] [  ] [ 3]
```

This answers: What does documentation fix? Where does the model still fail after getting docs? What *type* of failure persists?

---

## Quick Start

```bash
# Install
pnpm install

# Configure — copy .env.example to .env.local, set:
#   AI_GATEWAY_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY
#   VERCEL_TOKEN / VERCEL_OIDC_TOKEN, or use Docker sandbox

# Preview execution plan (no model calls, no cost)
npx @vercel/agent-eval cc --dry

# Run experiments
npx @vercel/agent-eval cc        # Claude Code
npx @vercel/agent-eval codex     # Codex

# View results
npx @vercel/agent-eval playground
```

---

## Repository Structure

```
├── docs/
│   ├── failure-stage-model.md          # S0–S5 stage definitions
│   ├── fallback-pattern-taxonomy.md    # F1–F5 pattern definitions
│   └── eval-case-design.md             # Case design rationale
│
├── experiments/
│   ├── cc.ts                           # Claude Code experiment config
│   ├── codex.ts                        # Codex experiment config
│   └── d-suite.ts                      # Full diagnostic suite
│
├── evals/
│   ├── d0-control-baseline/
│   ├── d1-direct-replacement-baseline/
│   ├── d1-direct-replacement-docs/
│   ├── d2-context-adaptation-baseline/
│   ├── d2-context-adaptation-docs/
│   ├── d3-api-composition-baseline/
│   ├── d3-api-composition-docs/
│   ├── d4-incremental-migration-baseline/
│   └── d4-incremental-migration-docs/
│       ├── PROMPT.md                   # Task description for agent
│       ├── EVAL.ts                     # Vitest assertions (multi-stage)
│       ├── app/                        # Minimal Next.js fixture
│       └── docs/                       # Injected documentation (+docs only)
│
└── AGENTS.md
```

---

## Experiment Design

### Core Experiments

| Experiment | Model | Doc Condition | Runs | Purpose |
|------------|-------|---------------|------|---------|
| `k25-baseline` | Kimi K2.5 | No docs | 3 × 5 cases | Baseline failure patterns |
| `k25-docs` | Kimi K2.5 | Docs injected | 3 × 5 cases | Document transfer measurement |
| `k26-baseline` | Kimi K2.6 | No docs | 3 × 5 cases | Training data recency effect |
| `k26-docs` | Kimi K2.6 | Docs injected | 3 × 5 cases | Document transfer measurement |

Total: **60 runs.** Each run produces one diagnostic coordinate (Stage × Pattern).

### Reference Experiments (budget permitting)

Single-run references against Sonnet 4.6 and Opus 4.6 to establish capability ceiling. These do not participate in method validation analysis.

### Pre-flight Probe

Before committing to 60 runs: one probe of K2.6-baseline on D1. If K2.6 already knows the target API without docs, the baseline/+docs comparison measures nothing. Action: select a different API target or treat K2.6 as ceiling reference only.

---

## Methodology Documents

Read in order:

1. **[Failure Stage Model](docs/failure-stage-model.md)** — Defines S0–S5. Where in the cognitive pipeline did the failure originate?
2. **[Fallback Pattern Taxonomy](docs/fallback-pattern-taxonomy.md)** — Defines F1–F5. What behavioral pattern did the failure manifest as?
3. **[Eval Case Design](docs/eval-case-design.md)** — How D0–D4 map to the Stage × Pattern matrix, with multi-stage assertion specifications.

One sentence: **Locate the failure stage, classify the fallback pattern, compare baseline vs. +docs.**

---

## Contributing

Before adding a new case, answer two questions:

1. Which Stage does this case primarily diagnose?
2. Which Fallback Pattern is it most likely to trigger?

These matter more than "is the task hard enough." A case without a clear diagnostic target is noise.

See [AGENTS.md](AGENTS.md) for conventions: TypeScript + ESM, 2-space indent, `d<n>-<scenario>-<variant>` directory naming, multi-stage assertions required.

---

## License

MIT