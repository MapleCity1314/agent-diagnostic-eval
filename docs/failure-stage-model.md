# Failure Stage Model for Document-Dependent Coding Agent Tasks

## Abstract

This document defines a stage-based diagnostic model for analyzing Coding Agent failures on **document-dependent tasks** — tasks requiring the use of APIs, libraries, or frameworks not present in the model's training data. The model decomposes the agent's execution into six sequential stages, each with distinct failure modes and observable indicators. Unlike pass/fail benchmarks, this model enables **failure localization**: identifying not just *that* an agent failed, but *at which cognitive stage* the failure originated.

## 1. Motivation

Current Coding Agent evaluation methodology is dominated by the benchmark paradigm (SWE-Bench, HumanEval, MBPP, and their variants). These benchmarks share a common structure: present a task, measure whether the output is correct, aggregate into a score. This design answers the question *"which model scores higher?"* but does not answer *"why did it fail?"* or *"what would fix it?"*.

The distinction matters for three stakeholders:

- **Model developers** need to know whether a failure stems from insufficient training data, poor instruction following, or weak multi-step reasoning — each requires a different intervention.
- **Harness/tool developers** need to know whether failures can be mitigated at the harness level (better document injection, better prompting, tool design) or require model-level improvements.
- **End users** need to know whether providing documentation, examples, or constraints will help the agent succeed, or whether the task exceeds the agent's current capability boundary.

Pass/fail benchmarks collapse all of these into a single number.

## 2. Scope and Assumptions

The model applies to tasks with the following properties:

1. **The target API exists but is absent from the model's training data.** The model has never seen this API during training, or has only seen an older, functionally equivalent version.
2. **Documentation for the target API is available to the agent.** The agent can, in principle, read and learn from the documentation during the task.
3. **The model's baseline coding ability is sufficient.** If the same task were expressed using APIs the model already knows, it would succeed. This isolates the "knowledge transfer" dimension from the "coding ability" dimension.
4. **A functionally equivalent old API exists in the model's training data.** This creates the conditions for the most common failure mode: the model uses the old API instead of the new one, producing code that works but does not meet the evaluation criteria.

Assumption (4) is not strictly required but dramatically increases the diagnostic value of the model, because it creates a clean separation between "can't do the task at all" and "can do it but with the wrong API." When (4) holds, the failure mode is almost always **confident substitution** (see Fallback Pattern Taxonomy), and the diagnostic question shifts from "can it code?" to "can it learn from documentation?"

## 3. Stage Definitions

### Stage 0 — Problem Recognition

**Definition:** The agent correctly identifies that the task requires knowledge it does not possess, and initiates information-seeking behavior.

**Cognitive requirement:** Meta-cognitive awareness of knowledge boundaries.

**Observable indicators of success:**
- The agent's transcript contains file-read operations targeting documentation files before any code generation begins.
- The agent produces explicit uncertainty signals in its reasoning (e.g., "I need to check the docs for the current API," "This might have changed in the latest version").
- The agent queries the file system or searches for documentation rather than proceeding directly to code generation.

**Observable indicators of failure:**
- The agent begins code generation immediately after reading the prompt, with no intervening documentation consultation.
- No uncertainty signals in the transcript. The agent proceeds with full confidence.
- The agent's first code output already contains old API calls — it never entered an information-seeking state.

**Why this stage matters:** Stage 0 failure is the root cause of the most prevalent failure pattern observed across models. When a model's training data contains a functionally equivalent old API, it has no reason to suspect its knowledge is outdated. The task description says "implement caching" — the model knows how to implement caching — so it proceeds. The failure is not in execution but in **the absence of doubt**. This is particularly insidious because the agent's confidence is locally rational: it *does* know how to solve the problem, just not with the API the evaluation expects.

**Relationship to model capability:** Stage 0 performance correlates with the model's training on tasks involving knowledge uncertainty and self-monitoring. Models trained with explicit "I don't know" or "let me verify" behaviors are more likely to pass Stage 0. This is partially addressable at the harness level through prompt engineering (e.g., "Check the documentation before writing any code") but this converts a diagnostic signal into a workaround — it doesn't tell you whether the model *would have* checked on its own.

### Stage 1 — Document Retrieval

**Definition:** The agent locates and reads the relevant sections of the available documentation.

**Cognitive requirement:** Information retrieval within an unstructured or semi-structured text corpus.

**Observable indicators of success:**
- Transcript shows file-read operations on the correct documentation file(s).
- Read operations cover the sections describing the target API (not just the table of contents or introduction).
- For long documents (>1000 lines), the agent uses targeted reading strategies (searching for keywords, jumping to relevant sections) rather than reading sequentially from the top and stopping early.

**Observable indicators of failure:**
- No documentation files are read.
- Documentation is read but the wrong sections are accessed (e.g., the agent reads about API X when the task requires API Y, both of which are described in the same document).
- The agent reads only the first N lines of a long document and misses the relevant section.
- The agent reads the correct file but a different version or an outdated section.

**Why this stage matters:** Even when Stage 0 succeeds (the agent knows it needs documentation), retrieval can fail due to document length, organizational structure, or the agent's reading strategy. In sandbox-based evaluations where documentation is injected as a file, the agent must first discover the file's existence, then navigate its contents. This is non-trivial for documents like AGENTS.md files that may span thousands of lines covering dozens of APIs.

**Measurement approach:** Transcript analysis. Count the number of file-read tool calls, identify which files and line ranges were accessed, and compare against the location of the target API's documentation within those files.

### Stage 2 — Semantic Comprehension

**Definition:** The agent correctly understands the target API's semantics — not just its call signature, but its usage constraints, scope rules, interaction patterns with other APIs, and behavioral guarantees.

**Cognitive requirement:** Deep reading comprehension with technical reasoning.

**Observable indicators of success:**
- Subsequent code adheres to all constraints described in the documentation, including edge cases and prohibitions.
- When the API has interaction constraints with other APIs (e.g., "do not call X inside Y"), the agent respects these constraints without being explicitly reminded.
- The agent's reasoning (if visible in transcript) demonstrates understanding of *why* the API works the way it does, not just *how* to call it.

**Observable indicators of failure:**
- Code uses the correct API name and call signature but violates a documented constraint (e.g., calling a prohibited function inside a cached scope).
- The agent treats the new API as a drop-in replacement for the old one, ignoring semantic differences (e.g., different scope rules, different execution timing, different return value semantics).
- The agent correctly uses the API in simple cases but fails when the usage context requires understanding of deeper semantics.

**Why this stage matters:** Stage 2 is the hardest to observe directly because comprehension is an internal state. It can only be inferred from downstream behavior (Stages 3-4). However, it produces a distinctive failure pattern: **correct syntax, wrong semantics** (Pattern F4 in the Fallback Pattern Taxonomy). The code compiles, may even pass basic tests, but violates a constraint that only manifests in specific conditions.

**Measurement approach:** Requires fine-grained behavioral assertions in the evaluation, specifically designed to test constraint adherence. A simple "does it build?" test cannot detect Stage 2 failures. The evaluation must include assertions like "function X is NOT called inside scope Y" or "operation Z occurs AFTER the response is sent, not before."

### Stage 3 — Solution Planning

**Definition:** The agent selects an implementation strategy, including which files to modify, which APIs to use, and in what order.

**Cognitive requirement:** Multi-step planning with constraint satisfaction.

**Observable indicators of success:**
- The agent's transcript shows deliberate choice between alternatives (e.g., "I could use X or Y, but the docs say X is preferred for this case").
- In migration tasks, the agent correctly identifies which code should be modified and which should be left unchanged.
- The agent's modification plan is consistent with the constraints identified in Stage 2.

**Observable indicators of failure:**
- The agent adopts the first viable solution without considering alternatives. When a functionally equivalent old API exists in its training data, this means it defaults to the old API without exploring whether a newer alternative exists.
- In migration tasks, the agent plans to modify all instances of the old API, including those that should be preserved (over-migration).
- The agent plans modifications in an order that creates intermediate broken states it cannot recover from.

**Why this stage matters:** Stage 3 is where the interaction between old knowledge and new documentation creates the most conflict. A model that passed Stage 0-2 (knows it needs new knowledge, found the docs, understood the API) can still fail at Stage 3 if its planning heuristics are biased toward familiar patterns. The planning stage is also where migration tasks (L4 difficulty) create unique challenges: the agent must distinguish between code that should be upgraded and code that should be preserved, a discrimination task that requires understanding both the old and new systems.

**Measurement approach:** Transcript analysis of the agent's file modification sequence. In migration tasks, diff analysis of which files were modified versus which were specified as off-limits.

### Stage 4 — Code Generation

**Definition:** The agent translates its plan into working code.

**Cognitive requirement:** Code synthesis consistent with the planned approach and API semantics.

**Observable indicators of success:**
- Build/compilation passes.
- Generated code matches the plan from Stage 3.
- API calls use correct signatures, parameters, and return value handling.

**Observable indicators of failure:**
- Build failure due to incorrect API usage (wrong import path, wrong function name, wrong parameter types).
- Code structure does not match the plan — the agent deviated during generation.
- Syntactic errors unrelated to API knowledge (general coding mistakes).

**Why this stage matters:** Stage 4 failures are the easiest to detect (build failures are binary) but the least informative for the doc-to-execution diagnostic. A build failure tells you something went wrong but not whether the root cause was in Stage 0 (never consulted docs), Stage 1 (read wrong docs), Stage 2 (misunderstood docs), Stage 3 (bad plan), or Stage 4 itself (plan was right but translation to code was faulty). This is why Stage 4-only evaluation (the benchmark paradigm) has low diagnostic resolution.

**Measurement approach:** Build output analysis, AST-level code inspection, functional test assertions.

### Stage 5 — Self-Verification

**Definition:** The agent validates its own output, detects errors, and attempts correction.

**Cognitive requirement:** Self-monitoring, error detection, and iterative refinement.

**Observable indicators of success:**
- The agent runs build commands, dev servers, or test suites after code generation.
- When errors are detected, the agent correctly diagnoses the cause and applies targeted fixes.
- The agent's fix attempts converge (each iteration gets closer to correctness) rather than diverge (thrashing between different approaches).

**Observable indicators of failure:**
- The agent completes code generation and stops without any verification step.
- The agent runs verification, detects an error, but applies an incorrect fix (e.g., reverting to the old API instead of correcting the new API usage).
- The agent enters a fix loop that does not converge — repeatedly applying and reverting changes.
- The agent's verification passes (build succeeds with old API) despite the solution being incorrect by evaluation criteria.

**Why this stage matters:** Self-verification is where the interaction between the agent's old knowledge and new documentation creates the most subtle failure mode. When the old API is functionally equivalent, build verification *succeeds* — the agent has no error signal to trigger correction. The agent believes it has completed the task successfully. This is why confident substitution (Pattern F1) is so persistent: the agent's self-verification loop confirms its incorrect solution.

**Measurement approach:** Transcript analysis of post-generation commands. Count verification attempts, classify fix strategies, measure convergence.

## 4. Stage Dependencies and Execution Flow

The stages are presented linearly but actual agent execution is **iterative and non-linear**. Common execution patterns include:

**Linear success:** 0 → 1 → 2 → 3 → 4 → 5 → done. The agent proceeds through all stages without backtracking.

**Self-correction loop:** 0 → 1 → 2 → 3 → 4 → 5 (fail) → back to 3 or 4. The agent detects an error in verification and revises its plan or code. This is healthy behavior.

**Documentation re-consultation:** 0 → 1 → 2 (partial) → 3 → 4 → 5 (fail) → back to 1. The agent realizes it misunderstood the documentation and re-reads it. This indicates Stage 2 partial failure with successful recovery.

**Stage 0 bypass (most common failure):** skip 0 → skip 1 → skip 2 → 3 (using old knowledge) → 4 → 5 (pass with old API) → done. The agent never enters the information-seeking pathway and completes the task with the wrong API. Its self-verification passes because the old API works. The evaluation fails but the agent does not know it failed.

**Stuck loop:** 0 → 1 → 2 → 3 → 4 → 5 (fail) → 4 (different attempt) → 5 (fail) → 4 ... The agent is stuck in a generate-verify loop without backtracking to Stage 1-2 for better understanding. This indicates inability to escalate from code-level fixes to conceptual-level re-evaluation.

The diagnostic value of the stage model comes from identifying **which pattern** the agent exhibited, not just which stage it reached.

## 5. Mapping to Evaluation Design

Each stage suggests specific evaluation assertions:

| Stage | Assertion Type | Example |
|-------|---------------|---------|
| 0 | Transcript: documentation access before code generation | `expect(firstFileRead).toBeBefore(firstCodeWrite)` |
| 1 | Transcript: correct file and line range accessed | `expect(readFiles).toContain('docs/new-api.md')` |
| 2 | Code: constraint adherence | `expect(codeInScope('after')).not.toContain('connection()')` |
| 3 | Diff: correct file modification scope | `expect(modifiedFiles).not.toContain('pages/api/legacy.ts')` |
| 4 | Build: compilation/transpilation success | `expect(buildExitCode).toBe(0)` |
| 5 | Transcript: verification behavior | `expect(postGenerationCommands).toContain('npm run build')` |

A well-designed eval case should include assertions at **multiple stages**, so that a failure can be localized. A case with only a Stage 4 assertion ("does it build?") tells you nothing about where the failure originated.

## 6. Limitations

**Observability ceiling:** Stages 0 and 2 involve internal model states (meta-cognition and comprehension) that are only indirectly observable through downstream behavior. A model that "thinks" in ways not reflected in its transcript may pass Stage 0 internally but appear to skip it. Tool-use transcript analysis mitigates this for agents that operate through explicit tool calls (file reads, shell commands), but does not fully resolve it.

**Training data opacity:** The model assumes a clear boundary between "APIs in training data" and "APIs not in training data." In practice, this boundary is fuzzy — a model may have seen a pre-release version, a blog post discussing the API, or related APIs that share naming conventions. This fuzziness affects Stage 0 (the model may have partial knowledge it is overconfident about) and Stage 3 (the model may attempt a hybrid approach mixing partial knowledge with documentation).

**Agent architecture dependence:** The stage model assumes an agent architecture where tool use (file reads, shell commands) is observable. Agents that operate through a single generation step (no tool use, no iterative refinement) collapse Stages 0-5 into a single forward pass, making stage-level diagnosis impossible.

**Harness contamination:** The harness (prompt template, system instructions, document injection method) can influence stage-level behavior. A harness that includes "always read documentation before coding" in the system prompt effectively forces Stage 0 success, converting it from a diagnostic signal into a controlled variable. This is useful for isolating downstream stages but obscures the model's natural Stage 0 behavior. Evaluations should explicitly state their harness configuration and its effect on stage-level diagnosis.
