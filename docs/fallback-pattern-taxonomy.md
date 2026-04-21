# Fallback Pattern Taxonomy for Coding Agents at Knowledge Boundaries

## Abstract

This document defines a classification system for the behavioral patterns exhibited by Coding Agents when encountering tasks that exceed their training data coverage. When an agent's knowledge is insufficient for a task and a functionally equivalent older approach exists in its training data, the agent does not simply fail — it **falls back** to familiar patterns in predictable, classifiable ways. This taxonomy identifies five distinct fallback patterns, defines their observable indicators, and establishes their relationship to the Failure Stage Model.

## 1. Motivation

The standard framing of Coding Agent failure is binary: the agent's output is correct or incorrect. This framing discards the behavioral information embedded in *how* the agent failed. Two agents can both fail the same task, but for diagnostically distinct reasons: one may have never consulted documentation and confidently produced outdated code, while the other read the documentation, partially understood it, and produced code that was syntactically correct but semantically wrong.

These behavioral differences are not noise — they are **signals about the nature and severity of the capability gap**. A model that exhibits confident substitution (using old APIs without hesitation) has a fundamentally different deficit than a model that exhibits partial adoption (using new APIs in simple cases but falling back to old ones in complex cases). The former needs better knowledge coverage or meta-cognitive training; the latter needs better compositional reasoning.

The taxonomy is defined at the behavioral level: each pattern is identified by observable features in the agent's output and transcript, not by assumptions about the model's internal representations.

## 2. Pattern Definitions

### Pattern F1 — Confident Substitution

**Definition:** The agent uses a functionally equivalent old API from its training data without any indication that it considered alternatives, consulted documentation, or experienced uncertainty.

**Behavioral signature:**
- Old API calls appear in the agent's **first** code generation attempt — not as a fallback after trying the new API.
- Transcript contains no file-read operations targeting documentation before the first code generation.
- No uncertainty markers in the agent's reasoning (no "I should check," "this might have changed," or "let me verify").
- The agent's self-verification (if any) passes, because the old API produces functionally correct results.
- The agent reports task completion with confidence.

**Root cause:** The agent does not know that it does not know. Its training data contains a working solution to the problem, and nothing in the task prompt triggers suspicion that the training-data solution is outdated. This is a Stage 0 (Problem Recognition) failure — the agent never enters the information-seeking pathway.

**Prevalence:** This is the **dominant** failure pattern across current-generation models when the task involves API migrations or framework version upgrades. Empirical data from Next.js 15/16 agent evaluations shows that the majority of failures across multiple models follow this pattern. The rate decreases with more recent training data cutoffs but does not disappear entirely — even models with relatively recent training data exhibit F1 when encountering APIs introduced after their cutoff.

**Example manifestation:**
- Task requires `connection()` (new API). Agent writes `unstable_noStore()` (old API). Build passes. Eval fails.
- Task requires `"use cache"` directive. Agent writes `unstable_cache()` wrapper. Build passes. Eval fails.
- Task requires `after()` for post-response work. Agent uses `waitUntil()` or inline execution. Build passes. Behavior differs.

**Distinguishing from other patterns:** F1 is characterized by the **absence** of new-API-related behavior. The agent does not read documentation about the new API, does not mention the new API in its reasoning, and does not attempt to use the new API at any point. The old API appears as the agent's only and unquestioned choice.

**Mitigation pathways:**
- *At model level:* Training on tasks that require knowledge boundary detection; calibration training that encourages uncertainty when encountering potentially outdated patterns.
- *At harness level:* Explicit prompt instructions to check documentation before coding; injecting documentation into the agent's context window rather than relying on the agent to seek it; system prompts that highlight the possibility of API changes.
- *At evaluation level:* Stage 0 assertions in eval design (did the agent read docs before coding?) to distinguish F1 from other patterns.

### Pattern F2 — Partial Adoption

**Definition:** The agent successfully uses the new API in some parts of its implementation but falls back to old APIs in others, resulting in a hybrid solution that mixes old and new approaches.

**Behavioral signature:**
- New API calls appear in the agent's code, indicating it has at least partial knowledge of or access to the new API.
- Old API calls also appear, typically in the more complex portions of the implementation.
- The boundary between new and old API usage correlates with complexity: simpler use cases get the new API, more complex ones revert to the old API.
- Transcript may show documentation consultation, but the agent's reading may have been incomplete (stopped after simple examples, did not read advanced usage sections).

**Root cause:** The agent has passed Stage 0 (it knows new APIs exist) and Stage 1 (it found some documentation), but its Stage 2 comprehension is incomplete. It understands the new API well enough for direct-match scenarios (L1 difficulty) but its understanding breaks down at higher divergence levels. When the implementation becomes complex enough that the agent's partial understanding is insufficient, it reverts to the old API where it has complete, training-data-backed knowledge.

This can also indicate a Stage 3 (planning) failure: the agent may have fully understood the new API but made a planning decision to use the old API for "safety" in complex sections, judging that a working old approach is better than a potentially broken new approach.

**Prevalence:** Less common than F1 in fully training-data-absent scenarios, but frequently observed when:
- The agent has access to documentation but the documentation is incomplete or lacks complex examples.
- The task involves multiple new APIs, and the agent successfully adopts some but not all.
- The new API has been partially discussed in the agent's training data (e.g., in blog posts or pre-release documentation) but not with enough depth for complex usage.

**Example manifestation:**
- Task requires migrating three caching functions. Agent correctly converts two simple ones to `"use cache"` but keeps the third (which involves dynamic tag generation) as `unstable_cache()`.
- Task requires using `connection()` + `after()`. Agent uses `connection()` correctly but implements the after-response logic inline instead of using `after()`.

**Distinguishing from F1:** F2 requires the presence of *both* new and old API calls. If only old API calls are present, it's F1. If old and new calls coexist *and* the boundary correlates with complexity, it's F2. Note that in L4 (incremental migration) tasks, new/old API coexistence is **expected and correct** — F2 only applies when the coexistence is unintentional.

**Distinguishing from F5:** F2 uses old APIs where new ones were needed (under-migration). F5 uses new APIs where old ones should have been preserved (over-migration). They are directional opposites.

### Pattern F3 — Hallucinated API

**Definition:** The agent generates code that calls an API which does not exist in any version of the target framework — neither the old version in its training data nor the new version described in the documentation.

**Behavioral signature:**
- Code contains function calls, import paths, or configuration options that do not exist.
- Build failure with "module not found," "function not defined," or similar errors.
- The hallucinated API name may resemble real APIs (a portmanteau of old and new names, or a plausible-sounding function that the framework does not actually provide).
- The agent may express confidence in the hallucinated API's existence.

**Root cause:** Multiple possible origins:

1. *Interpolation:* The agent has partial knowledge of both old and new APIs and generates a synthetic blend. For example, knowing `unstable_cache()` (old) and having read about `"use cache"` (new), it might generate `useCache()` (doesn't exist) or `cache()` (different function).

2. *Analogical transfer:* The agent knows how a similar API works in a different framework and assumes the target framework has an equivalent. For example, knowing React Query's `useQuery()` and assuming Next.js has a similar caching hook.

3. *Documentation misreading:* The agent reads documentation and extracts an API name from a context where it was mentioned but not defined (e.g., a comparison table, a deprecation notice, a future roadmap item).

**Prevalence:** Less common than F1 or F2 in well-documented API migration scenarios. More common in scenarios where:
- Documentation is sparse or ambiguous.
- Multiple frameworks with similar naming conventions are involved.
- The model has low confidence and is "guessing" rather than retrieving or reasoning.

**Example manifestation:**
- Task requires `cacheTag()`. Agent writes `cache.tag()` (object-method syntax that doesn't exist).
- Task requires `"use cache"` directive. Agent writes `export const dynamic = 'cache'` (config-based caching that doesn't exist in this form).
- Task requires the `after()` function. Agent imports from `'next/after'` (wrong import path) or calls `response.after()` (method on wrong object).

**Distinguishing from F4:** F3 produces APIs that *don't exist at all*. F4 uses APIs that *do exist* but with incorrect semantics. F3 typically causes build failures; F4 typically causes behavioral failures.

### Pattern F4 — Correct Syntax, Wrong Semantics

**Definition:** The agent uses the correct new API with a valid call signature, but violates one or more semantic constraints documented in the API specification. The code may compile and even pass basic tests, but exhibits incorrect behavior under specific conditions.

**Behavioral signature:**
- New API is imported from the correct module.
- Function calls use correct parameter names and types.
- **But:** The API is used in a context where its documentation explicitly prohibits it, or with assumptions about its behavior that are incorrect.
- Build may pass. Basic functional tests may pass. Constraint-specific assertions fail.

**Root cause:** Stage 2 (Semantic Comprehension) failure. The agent read the documentation and extracted the call signature, but did not fully process the usage constraints, scope rules, or interaction prohibitions. This is a **depth-of-comprehension** issue — the agent understood the surface (how to call it) but not the depth (when and where it is valid to call it).

This pattern is particularly likely when:
- The new API has constraints that the old API did not have (e.g., the new caching directive prohibits calling request-dependent functions inside its scope, while the old caching function had no such restriction).
- The constraints are described in a different section of the documentation than the basic usage examples.
- The constraints involve interaction with other APIs that the agent may not have read about.

**Prevalence:** Moderate. More common in models that successfully pass Stage 0 and Stage 1 (they know to read docs and they find the right docs) but have weaker deep comprehension. This pattern is a marker of **intermediate capability** — the agent is beyond F1 (it knows the new API exists and attempts to use it) but has not achieved full understanding.

**Example manifestation:**
- Agent correctly uses `"use cache"` directive but calls `cookies()` inside the cached scope (documented as prohibited — request-dependent functions cannot be called inside cache boundaries).
- Agent correctly uses `after()` but calls `connection()` inside the after callback (documented as prohibited — `connection()` signals "wait for a real request" but `after()` executes after the request is complete).
- Agent correctly uses `cacheTag()` but places it outside the `"use cache"` scope where it has no effect.
- Agent correctly uses the new API in the right file but at the wrong level of nesting (e.g., at the function level when it should be at the component level, or vice versa).

**Distinguishing from F2:** F2 mixes old and new APIs. F4 uses only new APIs but uses them incorrectly. F2 is a planning failure (chose the wrong API); F4 is a comprehension failure (chose the right API but misunderstood its rules).

**Severity assessment:** F4 is often the hardest pattern to detect because it passes shallow validation (build, basic tests). Detection requires **constraint-specific assertions** — test cases designed to exercise the exact boundaries and prohibitions documented in the API specification. This has implications for evaluation design: an eval that only checks "does it build and produce output?" will miss F4 failures entirely.

### Pattern F5 — Over-Migration

**Definition:** In tasks that require selective or incremental adoption of new APIs, the agent applies new APIs to code that should have been left unchanged, breaking functionality that was previously working.

**Behavioral signature:**
- Files or code sections explicitly designated as "do not modify" are modified.
- Old API calls that are *correct in their current context* (e.g., in a legacy module that does not support the new API) are replaced with new API calls that are invalid in that context.
- The agent does not distinguish between code that should be upgraded and code that should be preserved.
- The overall diff is larger than necessary — the agent modified more files than the task required.

**Root cause:** Stage 3 (Solution Planning) failure, specifically in the discrimination sub-task of identifying upgrade boundaries. The agent applies a global find-and-replace heuristic ("all old API → new API") rather than a context-sensitive upgrade strategy.

This may be exacerbated by:
- Strong training signals that "new is always better" or "deprecated APIs should always be replaced."
- Lack of understanding of framework compatibility boundaries (e.g., not knowing that Pages Router and App Router in Next.js have different API surface areas).
- Overly aggressive interpretation of the task prompt (reading "upgrade the caching" as "upgrade all caching everywhere" rather than "upgrade caching in the specified components").

**Prevalence:** Primarily observed in L4 (incremental migration) tasks. Uncommon in L1-L3 tasks where there is no legacy code to preserve. More common in models with stronger general coding ability — they are more confident in applying changes broadly and less cautious about preservation boundaries.

**Example manifestation:**
- Task specifies upgrading App Router caching while preserving Pages Router API routes. Agent replaces `getServerSideProps` with Server Components in the Pages Router files, breaking them.
- Task specifies upgrading three of five caching functions. Agent upgrades all five.
- Task specifies migrating to new API while keeping a compatibility shim for external consumers. Agent removes the compatibility shim.

**Distinguishing from F2:** F2 and F5 are directional opposites. F2 under-migrates (uses old APIs where new ones are needed). F5 over-migrates (uses new APIs where old ones should be preserved). An agent can exhibit both F2 and F5 simultaneously in a complex migration task — using old APIs in the parts it was asked to upgrade, while also modifying parts it was asked to preserve.

## 3. Cross-Model: Stage × Pattern Matrix

The Failure Stage Model (defined in the companion document) identifies *where* in the execution sequence a failure originates. The Fallback Pattern Taxonomy identifies *what behavioral pattern* the failure manifests as. These two dimensions are complementary and should be used together for complete diagnosis.

The following matrix maps the most common Stage × Pattern co-occurrences:

### Primary Associations

| Stage of Origin | Typical Pattern | Mechanism |
|----------------|-----------------|-----------|
| Stage 0 (Problem Recognition) | F1 (Confident Substitution) | Agent doesn't know it doesn't know → uses old API as primary and only approach → no documentation is consulted → old API produces working code → self-verification passes → agent reports success |
| Stage 1 (Document Retrieval) | F3 (Hallucinated API) | Agent knows it needs new knowledge → fails to find correct documentation → constructs API from partial signals (naming conventions, analogies from other frameworks, fragments from incomplete reads) |
| Stage 2 (Semantic Comprehension) | F4 (Correct Syntax, Wrong Semantics) | Agent finds and reads documentation → extracts call signature correctly → misses or misinterprets usage constraints → produces code that compiles but violates semantic rules |
| Stage 3 (Solution Planning) | F2 (Partial Adoption) | Agent understands new API for simple cases → planning stage encounters complexity that exceeds its understanding → falls back to old API for complex portions → produces hybrid old/new code |
| Stage 3 (Solution Planning) | F5 (Over-Migration) | Agent understands new API and plans to apply it → fails to discriminate between code that should and should not be upgraded → applies new API globally → breaks preserved code |
| Stage 4 (Code Generation) | F3 (Hallucinated API) | Agent's plan is correct but code generation introduces API calls that do not exist (synthesis errors, wrong import paths, incorrect method names) |
| Stage 5 (Self-Verification) | F1 (Confident Substitution, reinforced) | Agent's verification step passes with old API → positive feedback signal reinforces the incorrect solution → no correction is attempted |

### Secondary Associations

Some stage-pattern combinations are less intuitive but diagnostically important:

**Stage 0 → F2:** Partial problem recognition. The agent recognizes *some* of its knowledge may be outdated but not all. It checks documentation for one API but not others, leading to partial adoption where the checked API is correctly updated and the unchecked ones remain old.

**Stage 2 → F2:** Selective comprehension. The agent reads documentation for multiple new APIs but only achieves comprehension for the simpler ones. Complex APIs are "understood" at the signature level but not the semantic level, leading to fallback to old APIs for those specific cases.

**Stage 5 → F4 (masked):** The agent's self-verification is too shallow to detect semantic violations. Build passes, basic output looks correct, but constraint violations exist. The agent's verification loop terminates with a false positive. This is not a Stage 5 failure per se (the agent *did* verify) but a verification-depth failure that allows F4 to persist undetected.

### Diagnostic Decision Tree

Given a failed eval, the following decision tree identifies the Stage × Pattern combination:

```
1. Did the agent read documentation before writing code?
   ├─ NO → Stage 0 failure
   │       └─ Does the code use old APIs exclusively?
   │           ├─ YES → F1 (Confident Substitution)
   │           └─ NO  → F3 (Hallucinated API, from memory fragments)
   │
   └─ YES → Stage 0 passed. Continue.
        │
        2. Did the agent read the CORRECT documentation sections?
           ├─ NO → Stage 1 failure
           │       └─ Does the code use plausible but nonexistent APIs?
           │           ├─ YES → F3 (Hallucinated API, from misdirected reading)
           │           └─ NO  → F1 (Read wrong docs, fell back to training knowledge)
           │
           └─ YES → Stage 1 passed. Continue.
                │
                3. Does the code use correct new API call signatures?
                   ├─ NO → Check if the API exists at all
                   │       ├─ API doesn't exist → F3 (Hallucinated API)
                   │       └─ API exists but wrong signature → Stage 2 surface failure
                   │
                   └─ YES → New API is syntactically present. Continue.
                        │
                        4. Does the code violate documented constraints?
                           ├─ YES → Stage 2 failure → F4 (Correct Syntax, Wrong Semantics)
                           │
                           └─ NO → Stage 2 passed. Continue.
                                │
                                5. Is there a mix of old and new APIs?
                                   ├─ YES, old APIs where new ones needed
                                   │       → Stage 3 failure → F2 (Partial Adoption)
                                   ├─ YES, new APIs where old ones should be preserved
                                   │       → Stage 3 failure → F5 (Over-Migration)
                                   │
                                   └─ NO → All new APIs, correctly placed.
                                        │
                                        6. Build passes and behavior is correct?
                                           ├─ NO → Stage 4 failure (code generation error)
                                           └─ YES → Task passed.
```

### Severity Ranking

Not all failures are equally indicative of capability gaps. The following ranking orders patterns from most to least severe in terms of the underlying capability deficit:

1. **F1 (Confident Substitution)** — Most severe. Indicates absence of meta-cognitive monitoring. The model cannot detect its own knowledge boundaries. This is the hardest deficit to address at the harness level because the model does not generate any signal that help is needed.

2. **F4 (Correct Syntax, Wrong Semantics)** — High severity. The model can find and superficially parse documentation but cannot extract deep semantic constraints. This deficit is partially addressable through better documentation design (making constraints more prominent) but fundamentally requires better reading comprehension.

3. **F3 (Hallucinated API)** — Moderate severity. The model knows it needs something new but fabricates rather than retrieves. This is addressable through better retrieval mechanisms (RAG, tool use for documentation search) and through calibration training that reduces confabulation.

4. **F2 (Partial Adoption)** — Lower severity. The model can learn new APIs from documentation but its learning degrades with complexity. This is the most addressable pattern at the harness level: providing more detailed documentation, examples at higher complexity levels, or breaking complex tasks into simpler sub-tasks can mitigate F2.

5. **F5 (Over-Migration)** — Lowest severity in terms of the model's API-learning ability (the model successfully learned the new API) but indicates a planning/discrimination deficit. Addressable through better task prompts that explicitly define preservation boundaries.

## 4. Measurement Methodology

### Transcript-Based Indicators

For each pattern, the following signals can be extracted from Coding Agent transcripts (tool-use logs):

| Pattern | Positive Transcript Signal | Negative Transcript Signal |
|---------|---------------------------|----------------------------|
| F1 | Old API in first code write; no doc reads | Any doc read before first code write |
| F2 | Both old and new API imports in final code | Only old or only new API imports |
| F3 | Build error with "not found" for a function/module | Build success |
| F4 | Build success + constraint violation in assertions | Build failure (rules out F4, suggests F3) |
| F5 | Diff includes files marked as "do not modify" | Diff limited to specified files |

### Code-Based Indicators

Static analysis of the agent's final output:

- **API inventory:** List all API calls, classify each as {old, new, nonexistent}.
- **Constraint audit:** For each new API call, verify all documented constraints are satisfied.
- **Modification scope:** In migration tasks, compare the set of modified files against the set of files that should have been modified.

### Quantitative Metrics

For aggregation across multiple runs:

- **F1 rate:** Proportion of runs where the agent used *only* old APIs (no new API attempts at all).
- **F2 rate:** Proportion of runs where the agent used a mix of old and new APIs in contexts where only new APIs were expected.
- **F3 rate:** Proportion of runs where the agent produced at least one nonexistent API call.
- **F4 rate:** Proportion of runs where the agent used new APIs with correct syntax but at least one constraint violation.
- **F5 rate:** Proportion of runs where the agent modified files designated as "do not modify."
- **Clean pass rate:** Proportion of runs with no fallback patterns detected (all new APIs, all constraints satisfied, correct modification scope).

## 5. Limitations and Open Questions

**Pattern co-occurrence:** A single run may exhibit multiple patterns simultaneously. For example, an agent might correctly adopt one new API (no pattern), partially adopt another (F2), and hallucinate a third (F3). The taxonomy treats patterns as independent labels that can co-occur, not as mutually exclusive categories. Aggregation methods should account for this.

**Pattern stability:** The same model may exhibit different patterns across runs of the same task due to sampling variance. Pattern classification should be based on majority behavior across multiple runs (≥3), not on individual runs.

**Attribution ambiguity:** Some failures are ambiguous between patterns. If the agent uses an API with the correct name but a slightly wrong signature (e.g., wrong parameter order), is this F3 (hallucinated a variant that doesn't exist) or F4 (used the right API with wrong semantics)? The taxonomy resolves this by checking whether the API *as called* exists in any version: if it does, it's F4; if it doesn't, it's F3.

**Framework specificity:** The prevalence of specific patterns varies by framework and API design. Frameworks with strong backward compatibility (where old APIs continue to work indefinitely) will see more F1 (confident substitution). Frameworks with breaking changes (where old APIs produce errors) will see more F3 and F4 (the agent is forced to try something new but may get it wrong). The taxonomy is framework-agnostic in its definitions but framework-dependent in its expected distributions.

**Positive feedback loop in F1:** Confident substitution is uniquely self-reinforcing. The agent's self-verification passes, reinforcing its belief that the solution is correct. No other pattern has this property — F2-F5 all produce some error signal (partial failures, build errors, test failures) that could trigger self-correction. F1 produces *no* error signal. This makes F1 the most important pattern to detect externally through evaluation, because the agent cannot detect it internally.
