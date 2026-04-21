# Eval Case Design: Doc-to-Execution Diagnostic Suite

## Design Principles

1. **Each case targets a specific region of the Stage × Pattern matrix.** A case is not designed to "test caching" — it is designed to create conditions where a specific failure stage and fallback pattern are most likely to manifest, and to include assertions that can detect them.

2. **Assertions are multi-stage.** Every case includes assertions at Stage 0 (did it read docs?), Stage 2-3 (did it satisfy constraints and scope?), and Stage 4 (does it build?). A case with only Stage 4 assertions is a benchmark, not a diagnostic.

3. **One question per case.** Each case isolates one variable. If a case fails, it should be attributable to a single cause, not a compound of multiple difficulties.

4. **Documentation is the independent variable.** Every case runs twice: baseline (no documentation injected) and +docs (documentation injected via setup()). The delta between these two conditions is the core measurement.

---

## Case Inventory

5 cases. Ordered by expected diagnostic target, not by difficulty.

---

### Case D1 — Direct API Replacement

**Diagnostic target:** Stage 0 detection. Does the model recognize that it needs new knowledge?

**Expected dominant pattern on failure:** F1 (Confident Substitution)

**Task:**

A single-file Next.js page component uses `unstable_noStore()` to opt into dynamic rendering. The task is to replace it with the current API for opting into dynamic rendering.

The prompt does NOT name the target API. It says: "This page uses a deprecated API for dynamic rendering. Update it to use the current recommended approach."

**Why this design:** By not naming `connection()`, the case tests whether the model independently arrives at it (from docs or training data) or defaults to its training-data knowledge. If the model uses `unstable_noStore()` and considers it "current," that's F1 — it doesn't know the API changed. If it searches for documentation, that's Stage 0 success regardless of subsequent stages.

**Source files:**

```
app/
  page.tsx          # Uses unstable_noStore(), renders dynamic data
  layout.tsx        # Standard layout
package.json        # Next.js 15
next.config.ts      # Standard config
```

**Injected documentation (+docs condition):**

A 200-line markdown file covering `connection()`: what it does, why it replaces `unstable_noStore()`, import path, basic usage example.

**Assertions (mapped to stages):**

| ID | Stage | Assertion | Detects |
|----|-------|-----------|---------|
| D1-S0 | 0 | Transcript: agent read docs/* before first code write | Stage 0 pass/fail |
| D1-S2a | 2 | Code: `connection` is imported from `next/server` | Correct API knowledge |
| D1-S2b | 2 | Code: `unstable_noStore` does not appear in any file | Old API fully removed |
| D1-S4 | 4 | `next build` exits with code 0 | Build validity |
| D1-S5 | 5 | Transcript: agent ran build or dev command after code changes | Self-verification behavior |

**Interpretation matrix:**

| D1-S0 | D1-S2a | D1-S2b | D1-S4 | Diagnosis |
|-------|--------|--------|-------|-----------|
| ❌ | ❌ | ❌ | ✅ | F1: Confident Substitution. Old API works, agent doesn't know it's wrong. |
| ✅ | ✅ | ✅ | ✅ | Clean pass. Agent recognized the need, found docs, executed correctly. |
| ✅ | ❌ | ❌ | ✅ | Stage 1 or 2 failure: read docs but didn't extract correct API. Check if F3 (hallucinated alternative) or F1 (read docs but still used old API). |
| ✅ | ✅ | ❌ | ✅ | F2: Partial Adoption. Used new API somewhere but left old API in another location. |
| ✅ | ✅ | ✅ | ❌ | Stage 4: Correct API, wrong usage syntax. Likely F4 if import path or call signature is wrong. |

---

### Case D2 — Context Adaptation

**Diagnostic target:** Stage 2 (Semantic Comprehension). Can the model adapt a new API from its documented example context to a different usage context?

**Expected dominant pattern on failure:** F4 (Correct Syntax, Wrong Semantics) or F2 (Partial Adoption)

**Task:**

A product listing page needs component-level caching. The documentation provides an example of function-level `"use cache"` (marking an async data-fetching function). The task requires applying `"use cache"` at the React Server Component level, where the component receives props that should serve as cache keys.

The prompt says: "Add caching to the ProductList component so it doesn't re-fetch on every request. Use the caching approach described in the provided documentation. The cache should be invalidated per-category."

**Why this design:** The documentation example and the task context diverge in two dimensions: (1) function vs. component scope, (2) the need to understand how props interact with cache keys. The task additionally requires `cacheTag()` for per-category invalidation, which is described in the documentation but not in the same example as `"use cache"`. This tests whether the model can compose information from multiple documentation sections.

**Source files:**

```
app/
  products/
    page.tsx        # Renders <ProductList category={params.category} />
  components/
    ProductList.tsx  # Async RSC, fetches products by category, no caching
  lib/
    db.ts           # Mock database query function
  layout.tsx
package.json
next.config.ts      # Has useCache: true in experimental
```

**Injected documentation (+docs condition):**

A markdown file containing:
- Section 1: `"use cache"` directive — function-level example only
- Section 2: `cacheTag()` — standalone example with a static tag name
- Section 3: Constraints — "do not call cookies(), headers(), or searchParams inside a 'use cache' scope"
- No combined example. No component-level example.

**Assertions (mapped to stages):**

| ID | Stage | Assertion | Detects |
|----|-------|-----------|---------|
| D2-S0 | 0 | Transcript: agent read docs before modifying ProductList.tsx | Stage 0 |
| D2-S2a | 2 | Code: `"use cache"` directive appears at top of ProductList component or a wrapping function | Correct scope application |
| D2-S2b | 2 | Code: `cacheTag()` is called with a dynamic tag derived from the `category` prop | Dynamic tag understanding |
| D2-S2c | 2 | Code: No `cookies()`, `headers()`, or `searchParams` calls inside the cached scope | Constraint adherence |
| D2-S3 | 3 | Code: `unstable_cache` does NOT appear (old API not used as fallback) | F2 detection |
| D2-S4 | 4 | `next build` exits with code 0 | Build validity |

**Interpretation matrix:**

| D2-S2a | D2-S2b | D2-S2c | D2-S3 | Diagnosis |
|--------|--------|--------|-------|-----------|
| ❌ | - | - | ❌ | F1: Never attempted new API. Used unstable_cache or no caching. |
| ❌ | - | - | ✅ (old present) | F2: Attempted something but fell back to old API. |
| ✅ | ❌ | ✅ | ✅ | Stage 2 partial: understood directive but not dynamic tagging. |
| ✅ | ✅ | ❌ | ✅ | F4: Correct API usage but violated constraint (e.g., called cookies() inside cache scope). |
| ✅ | ✅ | ✅ | ✅ | Clean pass. |

---

### Case D3 — API Composition with Interaction Constraints

**Diagnostic target:** Stage 2 (constraint inference across documents) and Stage 3 (planning under constraints).

**Expected dominant pattern on failure:** F4 (Correct Syntax, Wrong Semantics) or F2 (Partial Adoption)

**Task:**

An analytics-enabled page that must: (1) opt into dynamic rendering (every request gets fresh data), and (2) send an analytics event after the response is sent (non-blocking). The documentation for these two APIs is provided separately. Critically, the documentation for `after()` states that `connection()` cannot be called inside `after()`.

The prompt says: "This page needs to render dynamic data on every request and send an analytics event after the response without blocking. The analytics event should include the request timestamp. Use the APIs described in the provided documentation."

**Why this design:** This case tests whether the model can compose two new APIs that have an interaction constraint. The constraint is not in the `connection()` documentation — it's in the `after()` documentation. The model must cross-reference two documents and correctly infer the constraint.

**Source files:**

```
app/
  analytics/
    page.tsx        # Renders real-time dashboard data, currently no special API usage
  lib/
    analytics.ts    # sendEvent(data: AnalyticsPayload): Promise<void>
  layout.tsx
package.json
next.config.ts
```

**Injected documentation (+docs condition):**

Two separate markdown files:
- `docs/connection.md`: Describes `connection()` as the API for opting into dynamic rendering. Import path, basic example, explains it replaces `unstable_noStore()`.
- `docs/after.md`: Describes `after()` for post-response work. Import path, basic example with console.log. **Contains the constraint:** "Do not call `connection()` inside `after()`. The `connection()` function signals that subsequent code requires an active request, but `after()` executes after the request has completed."

**Assertions (mapped to stages):**

| ID | Stage | Assertion | Detects |
|----|-------|-----------|---------|
| D3-S0 | 0 | Transcript: agent read both docs/connection.md and docs/after.md | Stage 0 + Stage 1 (both docs found) |
| D3-S2a | 2 | Code: `connection()` is called in the component body (not inside after) | Correct placement |
| D3-S2b | 2 | Code: `after()` is called with a callback that invokes `sendEvent` | Correct after usage |
| D3-S2c | 2 | Code: `connection()` does NOT appear inside the `after()` callback | Cross-document constraint |
| D3-S2d | 2 | Code: The analytics callback captures request timestamp from the component scope, not from a new connection() call inside after | Closure design understanding |
| D3-S4 | 4 | `next build` exits with code 0 | Build validity |

**Key diagnostic assertion:** D3-S2c is the critical differentiator. It can only pass if the model read the `after()` documentation AND extracted the `connection()` prohibition AND respected it during code generation. This is a three-stage pipeline (Stage 1 → Stage 2 → Stage 4) where failure at any point produces a specific signature:

- Didn't read after.md → may place connection() inside after (F4) or not use after at all (F1/F2)
- Read after.md but missed constraint → places connection() inside after (F4)
- Read and understood constraint → correct placement (pass)

---

### Case D4 — Incremental Migration with Preservation Boundary

**Diagnostic target:** Stage 3 (Solution Planning — discrimination between upgrade and preserve).

**Expected dominant pattern on failure:** F5 (Over-Migration) or F2 (Partial Adoption)

**Task:**

A codebase with mixed old and new routing patterns. App Router pages use old caching APIs (`unstable_cache`, `unstable_noStore`). A Pages Router API route (`pages/api/legacy.ts`) uses `getServerSideProps`-era patterns and is consumed by external clients — it must not be modified.

The prompt says: "Upgrade the App Router pages to use the current caching and dynamic rendering APIs as described in the documentation. Do NOT modify anything in the pages/ directory — the legacy API route is consumed by external clients and must remain unchanged."

**Why this design:** This is the only case that tests Stage 3 discrimination ability. The model must: (1) correctly upgrade App Router code (testing doc-to-execution transfer), AND (2) correctly leave Pages Router code untouched (testing preservation boundary awareness). The two requirements can conflict — an overly aggressive agent will upgrade everything, including the Pages Router code.

**Source files:**

```
app/
  dashboard/
    page.tsx        # Uses unstable_cache() for data, unstable_noStore() for dynamic
  components/
    Stats.tsx        # Uses unstable_cache() for stats query
  layout.tsx
pages/
  api/
    legacy.ts       # Express-style API route, uses req/res pattern, must NOT be modified
lib/
  db.ts
package.json
next.config.ts
```

**Injected documentation (+docs condition):**

Same documentation as D1 and D2 combined: covers `connection()`, `"use cache"`, `cacheTag()`.

**Assertions (mapped to stages):**

| ID | Stage | Assertion | Detects |
|----|-------|-----------|---------|
| D4-S0 | 0 | Transcript: agent read documentation | Stage 0 |
| D4-S2a | 2 | Code in app/dashboard/page.tsx: `connection()` replaces `unstable_noStore()` | API upgrade in target scope |
| D4-S2b | 2 | Code in app/components/Stats.tsx: `"use cache"` replaces `unstable_cache()` | API upgrade in target scope |
| D4-S3a | 3 | File pages/api/legacy.ts: content is IDENTICAL to original (byte-level diff) | Preservation boundary: F5 detection |
| D4-S3b | 3 | No files in pages/ directory were modified (git diff --name-only) | Broad preservation check |
| D4-S4 | 4 | `next build` exits with code 0 | Build validity (both App Router and Pages Router must build) |

**Interpretation matrix:**

| D4-S2a/b (upgrade) | D4-S3a/b (preserve) | Diagnosis |
|-------|--------|-----------|
| ❌ old APIs remain | ✅ legacy untouched | F1 or F2: didn't upgrade but at least didn't break legacy. |
| ✅ new APIs used | ❌ legacy modified | F5: Over-Migration. Successfully learned new API but applied it beyond scope. |
| ❌ old APIs remain | ❌ legacy modified | F5 + F1: worst case. Didn't even upgrade correctly AND broke legacy. |
| ✅ new APIs used | ✅ legacy untouched | Clean pass. Correct discrimination between upgrade and preserve. |

---

### Case D0 — Control (Training-Data API, Context Adaptation)

**Diagnostic target:** Establish baseline for context adaptation ability using APIs the model already knows. This case is NOT about doc-to-execution transfer — it is about confirming that the model can adapt a known API to a new context.

**Expected result:** Pass for all models, in both baseline and +docs conditions. If a model fails D0, its D2 failures cannot be attributed to doc-transfer deficits — they may reflect a general inability to adapt APIs across contexts.

**Task:**

Same functional requirement as D2 (cache a product list component per category), but using `unstable_cache()` (old API that all models know) + `revalidateTag()` (old API).

The prompt says: "Add caching to the ProductList component using unstable_cache so it doesn't re-fetch on every request. Use tag-based invalidation so the cache can be cleared per-category."

**Why this design:** D0 creates a **paired comparison** with D2. Same task, same complexity, same codebase structure, but D0 uses APIs the model already knows and D2 uses APIs it doesn't. If a model passes D0 but fails D2, the failure is specifically in doc-to-execution transfer, not in general adaptation ability.

**Source files:**

Identical structure to D2, but `next.config.ts` does NOT have `useCache: true` (since we're using old APIs).

**Documentation:** None needed (model already knows these APIs). For the +docs condition, provide documentation for `unstable_cache` anyway — this controls for the effect of "having documentation in the workspace" on agent behavior, independent of whether the documentation covers new APIs.

**Assertions:**

| ID | Stage | Assertion | Detects |
|----|-------|-----------|---------|
| D0-S2a | 2 | Code: `unstable_cache` wraps the data fetching logic | Correct API usage |
| D0-S2b | 2 | Code: Tag-based invalidation is configured per category | Context adaptation |
| D0-S4 | 4 | `next build` exits with code 0 | Build validity |

---

## Experiment Design

### Core Experiments (Method Validation)

| Experiment | Model | Doc Condition | Runs |
|------------|-------|---------------|------|
| `k25-baseline` | K2.5 | No docs injected | 3 per case |
| `k25-docs` | K2.5 | Docs injected via setup() | 3 per case |
| `k26-baseline` | K2.6 | No docs injected | 3 per case |
| `k26-docs` | K2.6 | Docs injected via setup() | 3 per case |

Total: 4 experiments × 5 cases × 3 runs = **60 runs**

### Pre-flight Probe

Before committing to 60 runs, run a **single probe** of K2.6-baseline on D1. If K2.6 already knows `connection()` without documentation:
- K2.6's training data covers Next.js 15 new APIs
- The baseline vs. +docs comparison for K2.6 will not measure doc-transfer (it measures nothing)
- **Action:** If probe passes, select a different API target for K2.6 that is NOT in its training data, OR accept that K2.6 data is a ceiling reference only

### Reference Experiments (Capability Ceiling, Budget Permitting)

| Experiment | Model | Doc Condition | Runs |
|------------|-------|---------------|------|
| `sonnet46-baseline` | Sonnet 4.6 | No docs | 1 per case |
| `opus46-baseline` | Opus 4.6 | No docs | 1 per case |

These are single-run references to establish an upper bound. They do not participate in the method validation analysis.

## Output Specification

### Per-Run Output

Each run produces:

```json
{
  "case": "D1",
  "model": "k25",
  "condition": "docs",
  "run": 1,
  "assertions": {
    "D1-S0": { "pass": false, "detail": "No doc reads before first code write" },
    "D1-S2a": { "pass": false, "detail": "connection not found in imports" },
    "D1-S2b": { "pass": false, "detail": "unstable_noStore found in app/page.tsx:7" },
    "D1-S4": { "pass": true, "detail": "Build succeeded" },
    "D1-S5": { "pass": true, "detail": "Agent ran 'npm run build' at transcript step 14" }
  },
  "diagnosis": {
    "stage_of_failure": 0,
    "fallback_pattern": "F1",
    "detail": "Agent used unstable_noStore() without consulting documentation. Build passed with old API."
  }
}
```

### Aggregate Analysis

Primary output is a **Stage × Pattern frequency table** per model per condition:

```
K2.5 Baseline:
         F1   F2   F3   F4   F5   Pass
Stage 0 [ 3] [  ] [  ] [  ] [  ] [  ]    ← D1
Stage 2 [  ] [  ] [  ] [  ] [  ] [  ]    ← D2, D3
Stage 3 [  ] [  ] [  ] [  ] [  ] [  ]    ← D4
Control [  ] [  ] [  ] [  ] [  ] [ 3]    ← D0

K2.5 +Docs:
         F1   F2   F3   F4   F5   Pass
Stage 0 [  ] [  ] [  ] [  ] [  ] [ 3]    ← D1 (docs fixed it)
Stage 2 [  ] [ 1] [  ] [ 2] [  ] [  ]    ← D2, D3
Stage 3 [  ] [  ] [  ] [  ] [ 2] [ 1]    ← D4
Control [  ] [  ] [  ] [  ] [  ] [ 3]    ← D0
```

This table is the core deliverable. It answers:
- **What does documentation fix?** Compare baseline vs. +docs tables.
- **Where does the model still fail after getting docs?** Look at +docs table for non-Pass cells.
- **What TYPE of failure persists?** Pattern column tells you the nature of the deficit.
- **K2.5 vs K2.6 gap:** Compare their +docs tables. Which cells moved from failure to Pass?
