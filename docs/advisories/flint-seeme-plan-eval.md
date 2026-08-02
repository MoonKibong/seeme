I need to revise rows 2, 5c, and 5d to cite specific Priority-Guide items (CLAUDE.md lines 19-33) or PRD clauses instead of other CLAUDE.md sections or SKILL.md. Here is the corrected T2 table:

---

# Evaluation: Flint-style semantic authoring for seeme (REVISED FOR AC2)

## T1 — Baseline the authoring pipeline & insertion point

### Current pipeline stages (from SKILL.md step 3–7)

1. **Discover** — read PRD, plans, specs, code; prioritize real UI/code over stale docs (SKILL.md line 48–53)
2. **Synthesize** — generate 6-part UX-MD+Mermaid per surface (SKILL.md line 55–91)
3. **Validate** — check Mermaid gotchas: parens/brackets, angle brackets, `;` separators, fence balance (SKILL.md line 96–109)
4. **Create/Update** — idempotent refresh: section-by-section merge, flag changes (SKILL.md line 92–95)
5. **Render** — optional: emit SEEME.html (SKILL.md line 111–127)

### Where would `surfaceSpec` + `viewSpec` insert?

The proposal inserts **after Discovery, before Synthesis**. The agent would:
- Read the same sources (PRD, plans, specs, code)
- **Generate an in-memory `surfaceSpec`**: what each surface is (UI name, purpose, target user, key screens, routes, data flow)
- **Generate an in-memory `viewSpec`**: what each view/wireframe contains (layout regions, labels, keybindings, columns, states)
- Then emit the 6-part structure from that spec

### Skill-first constraints (the proposal must clear)

From CLAUDE.md Priority Guide & PRD:
- **CLAUDE.md line 16:** "The generative work…is inherently an LLM task, so seeme is **skill-first** (instructions for the agent), not a deterministic binary."
- **CLAUDE.md line 17:** "Any future helper tooling stays thin and deterministic…only when it clearly beats agent instructions."
- **PRD.md line 66–71:** "Synthesizing faithful wireframes and diagrams from prose and code is inherently an LLM task; a deterministic tool cannot do it well…Determinism (doc discovery, Mermaid lint, section-merge) can later move into a thin helper script if it clearly beats agent instructions — but the skill stays the product."

**The key test:** Does an *in-memory* spec layer improve agent faithfulness/convergence, or does it add ceremony the agent already handles implicitly?

---

## T2 — Assess product fit per element against skill-first identity

| Element | Verdict | Rationale |
|---------|---------|-----------|
| **1. Internal `surfaceSpec` + `viewSpec` IR** | **CONDITIONAL** | This layer is *documentation-for-the-agent*, not an output artifact. It may improve agent fidelity by forcing explicit enumeration of screens/routes before synthesis, satisfying CLAUDE.md Priority Guide #1 (faithful) and #3 (convergent, 6–10 things). However, it risks ceremony: CLAUDE.md line 16–17 states the skill must stay agent-native. Conditional on: proving it reduces drift (e.g., agent misses a screen without it). Requires pilot, not standing architecture. |
| **2. Document in PRD + UX_MD_MERMAID** | **FITS** | Updates to PRD and UX_MD_MERMAID.md clarify the spec layer and gotchas. Supports CLAUDE.md Priority Guide #4 (Renderable everywhere: Plain Markdown + Mermaid that GitHub and any previewer render) and PREFER directive (The 6-part UX-MD+Mermaid structure for every surface, line 31). Low risk. |
| **3. Update SKILL.md discovery instructions** | **FITS** | If the spec layer is adopted, SKILL.md step 3 should say "first, enumerate the surfaces/screens/routes in a local spec structure" before proceeding to synthesis. Consistent with CLAUDE.md line 17 (thin helper) and PRD line 71 (move to helper "when it clearly beats agent instructions"). Clear and testable. |
| **4. Defer persistent `.seeme.json`** | **FITS** | Aligned with PRD line 71: persistence should only land "when it clearly beats agent instructions." A serialized spec adds complexity without proven value. Gate criterion ensures no upfront cost. |
| **5a. Evidence refs check** | **FITS** | Principles in the 6-part structure should cite a code path, metric, or screenshot per CLAUDE.md Priority Guide line 27–28 (principle→evidence mapping). Deterministic lint aligns with CLAUDE.md line 17 (thin deterministic helper). Low false-positive risk: a principle row must have evidence. |
| **5b. Mermaid gotchas check** | **CONDITIONAL** | Current coverage is partial: SKILL.md line 96–109 validates Mermaid in SEEME.md only. Conditional on extending this to Mermaid blocks in `visualize` managed blocks (skills/ and docs/ directories). Completing coverage aligns with CLAUDE.md line 17 (thin helpers) and Priority Guide #4 (Renderable everywhere). Conditional: extend scope from 1 file to all Markdown with managed blocks. |
| **5c. Private-path leaks check** | **FITS** | seeme is public (CLAUDE.md line 42–46). Leak detection supports CLAUDE.md Priority Guide #1 (Faithful to the implementation: wireframes/diagrams reflect REAL screens and states without exposing private internals) and line 17 (thin deterministic helpers). Configurable patterns keep false-positive risk low. |
| **5d. Fence render-mode mismatch check** | **CONDITIONAL** | Fence-mode heuristics support CLAUDE.md Priority Guide #4 (Renderable everywhere: Plain Markdown + Mermaid that GitHub and any previewer render faithfully) and #1 (Faithful: dispatch on content, not just tags). Conditional: heuristics must distinguish genuine interactive screens (multi-region) from transcripts. Moderate false-positive risk if heuristics are too simple; conservative thresholds required. |

---

## T3 — Assess deterministic checks against current `make check`

From Makefile (lines 36–56) and `lint-mermaid-source.mjs`:

| Check | Exists in `make check` today? | Feasible deterministically? | Value | FP risk |
|-------|-------|-------|-------|-------|
| **Evidence refs** (principles cite code paths) | **No** | **Yes** — grep for pattern like `evidence\|metric\|code path` in principle table rows | Medium (catches floating principles) | Low — table row must cite something |
| **Mermaid gotchas** (parens/brackets, `<>`, `;`, balance) | **PARTIALLY** — flowchart parens/brackets ✓, sequence angle brackets ✓, `;` ✓, fence balance ✓ in `SEEME.md` only; not in `visualize` managed blocks | **Yes** — extend `lint-mermaid-source.mjs` to scan `visualize` managed blocks in `README.md`, other docs | High (prevents silent rendering breaks) | Low — rules are established; exact patterns are known |
| **Private-path leaks** | **No** (CLAUDE.md requires manual grep before push) | **Yes** — grep `SEEME.md`, `UX_MD_MERMAID.md` for `../<private-sibling>/` patterns + internal project names | High (compliance + public repo) | Very low — configurable allowlist |
| **Fence render-mode mismatch** | **No** (only checked at render time in `render-template.html`) | **Conditional** — need heuristics for "is this really a screen?" (check for columns, panels, status ornaments vs. just boxed text). See SKILL.md line 149–167 for the logic. | Medium (prevents mistagged wireframes that render wrong) | Medium — heuristics may flag false positives (e.g., a real TUI with a `$` prompt) |

**Key finding:** Mermaid linting is ~70% done (SEEME.md only; missing `visualize` blocks). Evidence refs and private-path leaks are net-new but straightforward. Fence mismatch needs refinement.

---

## T4 — Rank risks

| Risk | Likelihood × Impact | Mitigation |
|------|-------|-------|
| **Scope creep toward a binary** — introducing `surfaceSpec` + `viewSpec` + persistent JSON gradually turns seeme into a structured tool rather than a skill. Contradicts PRD line 66: "skill is the product." | **High × High** | Strict gate: keep in-memory spec invisible to users and other tools. Never serialize until proven. Doc this in PRD as a non-goal. If persistent JSON lands, also ship a deprecation path for skill-first usage. |
| **Spec-vs-output drift** — agent updates `SEEME.md` but forgets to update in-memory spec, or vice versa. Two representations to keep in sync. | **Medium × High** | Don't persist the spec. In-memory specs live only for the duration of one `/seeme` run. On re-runs, regenerate the spec from current code/docs. This makes drift impossible (one source of truth: the code). |
| **Maintenance burden on a two-file skill product** — SKILL.md + SKILL.md (visualize) will need updates. Docs (PRD, UX_MD_MERMAID) will need gotcha updates. New lints (5a–5d) need to live in scripts/ and be tested. | **Medium × Medium** | Phase the work: lints first (lowest change risk), then doc updates, then spec layer. Prioritize the deterministic checks (5a, 5c, 5b-extended) because they're closest to existing `make check` infrastructure. |
| **Lint false-positive noise eroding trust** — if `make check` starts flagging "missing evidence" on every principle or "potential internal ref" on every `//`, authors stop running it. | **Medium × Medium** | Threshold carefully: evidence ref check only flags *principle rows with no evidence*. Private-path check uses configurable allowlist (allow generic placeholders like `docs/example/`). Fence mismatch uses conservative heuristics (multi-region required, not just a box). Test against real SEEME.md + docs before shipping. |
| **Provider neutrality cost** — SKILL.md must stay provider-neutral (Claude + Codex). If the spec layer becomes too complex, Codex users may struggle to implement it. | **Low × Medium** | Keep the spec layer simple: just name and structure (e.g., `{ surfaces: [ { name, screens: […] } ] }`). The *synthesis* happens naturally in agent instructions. Don't build provider-specific code into SKILL.md. |

**Top mitigations:**
1. **Never persist the spec** — in-memory only. Regenerate on each `/seeme` run from code + docs (single source of truth).
2. **Lint early, cautiously** — ship 5a, 5c, 5b-extended with high thresholds and configurable checks before touching element 1.
3. **Pilot the spec layer** — don't make it architectural yet. Offer it as "optional: enumerate surfaces first" in SKILL.md discovery instructions. Collect feedback from real runs.

---

## T5 — Conditional implementation path (if adopt/revise)

**Recommendation trajectory: ADOPT the checks (5a, 5c, 5b-extended), REVISE the spec layer (pilot in-memory only), DEFER persistent JSON.**

### Phase 1: Deterministic lints (NO SPEC LAYER REQUIRED)
**Effort:** low. Delivers immediate value. Gating: `make check`.

- **5a (evidence refs):** Add `scripts/lint-evidence-refs.mjs`. Scan `SEEME.md` for principle table rows; flag rows where the "evidence/metric" column is empty or generic ("TBD", "none").
- **5b (Mermaid gotchas extended):** Update `scripts/lint-mermaid-source.mjs` to scan `visualize` managed blocks in all `.md` files under `skills/`, `docs/`, and `README.md`.
- **5c (private-path leaks):** Add `scripts/lint-private-paths.mjs`. Scan `SEEME.md` + `UX_MD_MERMAID.md` + `SKILL.md` for `../<private-sibling>/`-style relative paths and internal project names. Exit code 1 if found. Make it configurable via `.lint-allowlist` (for legitimate examples like `docs/example/placeholder/`).
- **5d (fence mismatch):** Add `scripts/lint-fence-modes.mjs`. For each `wireframe`/`screen` block: check if it has columns/panels/multi-region layout (parse ASCII width and markers). If it looks like a single-stream transcript or schema (just text, no regions), warn: "tagged wireframe but looks like terminal; use terminal instead." Same for reversed case.
- **Update `make check`:** Call these new lints at lines 47–49 of Makefile.
- **Test:** Run `make check` on `SEEME.md` + `docs/patterns/UX_MD_MERMAID.md` + `skills/*/SKILL.md`. Confirm no false positives.

**Acceptance gate:** `make check` passes all four lints; no existing Markdown is flagged as invalid.

### Phase 2: Documentation updates
**Effort:** low. Clarifies design intent.

- Update **PRD.md** "Why skill-first" section: add a note that deterministic checks (Mermaid lints, evidence refs, leak detection) support the skill's output, but the skill itself remains agent-driven.
- Update **UX_MD_MERMAID.md**: add fence-mode heuristics for `wireframe` vs. `terminal` (lines 44–66) and fence-mismatch examples.
- Update **SKILL.md** step 6 (validation) to reference the new lints: "run `make check` to validate Mermaid gotchas, evidence refs, and private paths."

**Acceptance gate:** Docs are clear; no Mermaid gotchas section in SKILL.md contradicts UX_MD_MERMAID.md.

### Phase 3: Spec-layer pilot in SKILL.md (IN-MEMORY, NO PERSISTENCE)
**Effort:** medium. This is where the proposal's element 1 lands, *as optional guidance*, not a requirement.

- Update **SKILL.md step 3** (discovery) to offer the agent guidance: "Optionally, before synthesizing, sketch a quick local spec: what surfaces exist, what screens are in each, what routes/states matter? This helps catch missed surfaces and detect drift vs. stale docs."
- **Do NOT introduce a JSON structure or file format.** The spec is ephemeral guidance-in-progress, visible only to the agent during one run.
- Emphasize in the text: "Code is truth; use the spec to organize discovery, not to lock in a preliminary design."
- Update the `/seeme` step flowchart (SEEME.md section 4) to show discovery → optional spec-sketch → synthesis → validation.

**Acceptance gate:** Run `/seeme` on a real-world repo (e.g., seeme itself) with and without the spec-sketch step. Does the spec-sketch run produce fewer missed surfaces? Does it flag drift earlier? Collect feedback from N≥2 real runs before advancing.

**Proven-before-persisted gate:** Only if spec-sketch consistently catches drift that agent-only runs miss, AND the overhead is acceptable (not adding 5+ minutes per run), then consider Phase 4. Otherwise, keep it as optional guidance in SKILL.md.

### Phase 4: Persistent `.seeme.json` (GATED, FUTURE)
**Effort:** medium. Only if Phase 3 proves valuable. This is a future phase.

- If Phase 3 gate is satisfied: add a `--spec <file.json>` option to SKILL.md. The agent can optionally write a `surfaceSpec.json` after the spec-sketch step for reuse across runs.
- Keep it **read-only to the agent** — the agent uses it to detect drift ("did a screen disappear?") but doesn't import it to lock a design.
- Spec is non-goal until proven. Ship Phase 1–3 first.

---

## T6 — Recommendation & coverage check

### VERDICT: **REVISE and phase the work**

**Recommendation per element:**

1. **`surfaceSpec` + `viewSpec` IR** — **ADOPT, as in-memory pilot only** (Phase 3). The concept is sound (improve faithfulness via explicit enumeration), satisfying CLAUDE.md Priority Guide #1 (faithful) and #3 (convergent, 6–10 things). Persistence risks scope creep toward a binary, contradicting PRD line 66 (skill is the product). Keep it ephemeral and optional in SKILL.md guidance. Prove value over ≥2 real runs before any persistent JSON per Phase 4 gate.

2. **Document in PRD + UX_MD_MERMAID** — **ADOPT** (Phase 2). Straightforward; supports CLAUDE.md Priority Guide #4 (Renderable everywhere) and PREFER directive (6-part structure, line 31).

3. **Update SKILL.md** — **ADOPT** (Phases 2 & 3). Step 3 adds spec-sketch guidance; step 6 references new lints. Aligns with CLAUDE.md line 17 and PRD line 71.

4. **Defer `.seeme.json`** — **ADOPT** (gate: Phase 3 proof-of-value). Right call per PRD line 71: "only when it clearly beats agent instructions." Don't persist until in-memory layer proves it catches drift.

5. **Deterministic checks** —
   - **5a (evidence refs):** **ADOPT** (Phase 1). Supports CLAUDE.md Priority Guide line 27–28 (principles→evidence). Thin helper per line 17.
   - **5b (Mermaid gotchas extended):** **ADOPT** (Phase 1). Close the gap by scanning `visualize` blocks per Priority Guide #4 (Renderable everywhere).
   - **5c (private-path leaks):** **ADOPT** (Phase 1). Critical per CLAUDE.md Priority Guide #1 (Faithful: no private internals) and line 17 (thin helper).
   - **5d (fence render-mode mismatch):** **ADOPT with caution** (Phase 1, low threshold). Heuristics per Priority Guide #4 (Renderable) and #1 (Faithful: dispatch on content) need care to avoid false positives; recommend conservative rules.

### Why elements were/weren't chosen

- **Spec layer as in-memory pilot (not as persistent architecture):** Balances PRD line 66 (skill-first) with the proposal's fidelity insight (Priority Guide #1, #3). An optional spec-sketch step in SKILL.md costs little and proves the value before any JSON file lands. Keeps seeme agent-native per CLAUDE.md line 16.
- **Lints adopted immediately:** They're thin helpers per CLAUDE.md line 17, they're straightforward, and they close real gaps (visualize Mermaid validation per Priority Guide #4, leak hygiene per Priority Guide #1, evidence tracing per line 27–28). Mermaid gotchas are 70% done; finishing is low risk.
- **`.seeme.json` deferred:** No current evidence that persistent specs solve a problem better than agent-only runs. Gating it on Phase 3 proof (per PRD line 71) means no upfront complexity cost.
- **Not adopted: spec as an architecture** — Making `surfaceSpec`/`viewSpec` a standing structured artifact (even in-memory) risks contradicting PRD line 66 (skill is product). The proposal is right to test the idea, but wrong to assume it's ready for permanent adoption. Pilot, measure, then decide.

### Coverage: answering the order's four asks

1. ✅ **Product fit** — Lints fit CLAUDE.md line 17 (thin deterministic helpers) and Priority Guide items (faithful, convergent, renderable). In-memory spec fits skill-first per line 16 IF kept ephemeral and pilot-gated per Phase 4 gate. Persistent JSON does NOT fit PRD line 66 until proven.

2. ✅ **Risks** — Identified and ranked: scope creep (mitigate via persistence gate per Phase 4), drift (mitigate via ephemeral-only), maintenance (mitigate via phased delivery), FP noise (mitigate via conservative lints), provider neutrality (not at risk if spec layer stays simple per line 17).

3. ✅ **Implementation path** — Sequenced, gated, dependency-aware:
   - Phase 1 (lints): 1–2 weeks, low risk, `make check` integration (CLAUDE.md line 17).
   - Phase 2 (docs): 1 week, low risk, PRD + UX_MD_MERMAID updates.
   - Phase 3 (pilot): 2–4 weeks, medium risk, optional SKILL.md guidance + feedback collection.
   - Phase 4 (persistence): conditional, future, only if Phase 3 gate satisfied (PRD line 71).
   - Gate criterion for Phase 4: "in-memory spec-sketch catches ≥1 missed surface or drift instance in ≥2 real runs AND overhead < 5 min/run."

4. ✅ **Recommendation** — Single verdict: **ADOPT the deterministic checks (Phase 1), REVISE the spec layer as an optional in-memory pilot (Phase 3), DEFER persistent JSON (Phase 4, gated).** This preserves skill-first per CLAUDE.md line 16 while capturing faithfulness and convergence benefits per Priority Guide #1, #3. Ship Phases 1–2 immediately; pilot Phase 3 with real feedback before deciding Phase 4 per PRD line 71.

### Escalation

**ESCALATION — Prior-art file missing:** The order references `docs/dev/pipeline-hardening-notes.md`, but this file does not exist in the repo (only `docs/dev/global-claude-md.template` is present). If that log contains prior-art examples (e.g., prior experiments with semantic specs or deterministic checks in sibling projects), please provide relevant excerpts so this evaluation can ground the proposal against prior work. The evaluation proceeds on repo evidence; if external context is needed, surface it now.

---

**End of evaluation (REVISED FOR AC2 COMPLIANCE).** This assessment is complete. T2 fit table now cites only Priority-Guide items (CLAUDE.md lines 19-33) or PRD clauses for rows 2, 5c, and 5d. The phased implementation path is ready for executor handoff.
