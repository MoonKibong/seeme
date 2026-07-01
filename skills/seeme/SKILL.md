---
name: seeme
description: "Generate or update standalone SEEME.md, a repo-level or product-level visual companion that explains UI surfaces, codebase surfaces, data flows, actions, and sequences using Markdown wireframes and Mermaid diagrams; also render SEEME.md to shareable SEEME.html when the user asks to render, export, share, or produce HTML. Use when the user types /seeme, names the seeme skill, asks for SEEME.md or SEEME.html, or asks for a separate repo/product visual spec."
user-invocable: true
argument-hint: "[surface/feature/doc | render | --update | --html]"
---

# seeme → SEEME.md and SEEME.html

Use this skill when the user types `/seeme`, names `seeme`, asks for `SEEME.md`, or asks to
produce/refresh a separate repo-level or product-level visual spec. It synthesizes a **SEEME.md** —
the visual companion to README (README *tells*, SEEME *shows*) — from the repo's existing knowledge,
using the **UX-MD+Mermaid** convention.

If the user asks to insert a visual into an existing README, design doc, getting-started guide, PRD,
plan, or spec, use the `visualize` skill instead.

Use render mode when the user asks to render, export, share, or produce HTML from `SEEME.md`. Render
mode generates or replaces **SEEME.html**, a shareable HTML rendering of the Markdown wireframes and
Mermaid diagrams.

## What you produce

Default mode produces a `SEEME.md` at the repo root. It explains the product's **UIs and how they
work** using **Markdown wireframes + Mermaid diagrams** — readable in any Markdown viewer, rendered
natively by GitHub. Not prose-heavy: it *shows*.

Render mode produces `SEEME.html` from `SEEME.md`. The HTML should be shareable, self-contained when
practical, and visually sketch-like: Markdown sections become readable panels, UI wireframe fences
become drawn DOM wireframes, terminal/tree fences become hand-drawn window cards, and Mermaid blocks
become rendered SVG diagrams with graceful fallback.

## Workflow

1. **Choose mode.**
   - Default: generate or update `SEEME.md`.
   - `render`: generate or replace `SEEME.html` from the existing `SEEME.md`.
   - `--html`: refresh `SEEME.md`, then render `SEEME.html`.

2. **Scope.** If the user named a surface/feature/doc, cover that in `SEEME.md`. Otherwise cover the
   whole product or codebase (one SEEME.md with a section per major surface). Ask only if scope is
   genuinely ambiguous.

3. **Discover the source material** (read, don't guess). Look for, in priority order:
   - PRD / product docs: `docs/PRD.md`, `README.md`, `docs/product/`.
   - Plans & features: `docs/implementation/*_PLAN.md`, `docs/specs/`, `docs/architecture/`, `docs/features/`.
   - **The code itself** — the UI/CLI/TUI/endpoint implementation. When docs and code disagree,
     **code is truth**; note the drift in the output rather than copying a stale doc.
   Use `nini`/grep to locate the real screens, routes, components, columns, keybindings, states.

4. **Synthesize SEEME.md** in the **UX-MD+Mermaid 6-part structure**, per surface:
   1. **Product frame & target user** — what it is, who it's for, the success signal.
   2. **Information architecture / navigation** — the structure or nav tree (fenced text).
   3. **Markdown wireframes** — ASCII/box depictions of the key surfaces, in fenced blocks with
      `title="..."`. Pick the fence by **render mode**, not by whether the ASCII has a border
      (transcripts, schemas, and tables are all boxed too):
      - **`wireframe`/`screen` = SKETCH mode** — a genuinely *interactive, multi-region* app/TUI
        screen the renderer re-draws as hand-sketched UI: nav/sidebar, side-by-side panels, forms,
        chat, a detail pane, selectable rows, keybinding help, dashboards with real columns (e.g. an
        order/queue dashboard: a list rail + a detail pane). Reserve it for surfaces a wireframe
        *clarifies* — not for a single stream of output. Streaming command/run output is **not** a
        screen even when ornamented with progress (`2/6`), gate/`[PASS]` badges, spinners (`⟳`), or
        `▸` markers (e.g. a staged build runner's live log) — that is `terminal`.
      - **`terminal`/`console`/`tree`/`diagram` = VERBATIM mode** — shown faithfully as mono text,
        layout preserved: CLI/REPL transcripts, command/run/build **logs and progress output**,
        one-shot tabular output, and `tree` listings. **Author transcripts as plain prompt + output —
        do not wrap them in a decorative `┌─┐` box.** The window chrome is the frame; a hand-drawn box
        around real (unboxed) command output is redundant and unfaithful (the renderer strips a
        redundant full outer frame, but cleaner not to add one). Use `diagram` only for ASCII whose
        exact character layout *is* the artifact and Mermaid can't produce it (byte/field/memory maps,
        alignment-sensitive matrices, box art).
      **Prefer the most semantic form.** A relational schema *with relationships* is a
      `mermaid erDiagram`; an object model is a `classDiagram`; a lifecycle is a `stateDiagram`. But a
      diagram must EARN its shape: `erDiagram` is worth it only when there are **relationships to show
      (2+ related entities)**. A single standalone table has none — render it as a **Markdown table**,
      not a one-entity `erDiagram` (which renders as an isolated box in its own card). Flat tabular
      data generally — lookup/scoring/columns-of-values — is a **Markdown table** too, not a `diagram`
      ASCII box. Reserve verbatim `diagram` for ASCII whose exact character layout is the artifact.
      Use the actual labels the implementation renders. The renderer content-checks these tags and
      falls back to VERBATIM when a `wireframe`/`screen` block doesn't read as an interactive screen —
      but tag it correctly so intent is explicit.
   4. **Mermaid flowchart** — the core business/interaction process.
   5. **Mermaid sequence diagram** — the user ↔ agent/app ↔ system handoff.
   6. **Design principles → evidence** — principles and how each maps to a real code path / metric.
   Keep it **faithful and convergent**: cite real screens/columns/keys/routes; show the 6–10
   things that matter, not everything. Wireframes use the actual labels the implementation renders.

5. **Create or update.** If `SEEME.md` exists (or `--update`), refresh it: keep the structure, update
   each section from current docs/code, and flag what changed. Do not clobber hand-written notes
   blindly — merge section by section.

6. **Validate the Mermaid** before finishing (these silently break rendering):
   - Flowchart node labels: **no raw `(` `)` `[` `]`** inside `[...]`/`{...}` — use `<br/>` for line
     breaks, spell out or drop punctuation, write `orders.` not `orders[]`.
   - Sequence diagram messages/aliases: **no `<...>` angle brackets** (render as HTML tags) — write
     `{slug}` or `SLUG`, not `<slug>`; avoid parens in participant `as` aliases.
   - Sequence diagram participant **ids must not be reserved keywords** (case-insensitive):
     `loop`, `alt`, `opt`, `par`, `and`, `end`, `note`, `rect`, `activate`, `deactivate`, `break`,
     `critical`, `box`, `actor`, `participant`. e.g. a participant id `LOOP` is parsed as the `loop`
     block keyword and breaks the diagram — use `AGL`/`AGENTLOOP` with `as agent_loop` for display.
   - **No `;` anywhere in Mermaid** — it is a statement separator, so a `;` in a sequence message or
     label truncates it and throws a parse error. Use a comma, `and`, or a line break.
   - **Balanced ``` fences**; each ```mermaid block closed. Edge labels: avoid bare `/` (use a word).
   - If a `mmdc` (mermaid CLI) is available, render each block to catch errors; else sanity-check the
     above by eye.

7. **Render HTML when requested.** Treat `SEEME.md` as the source of truth. Generate or replace
   `SEEME.html`; do not hand-edit it as canonical content. Prefer
   `assets/render-seeme.mjs SEEME.md SEEME.html`, which uses `assets/render-template.html` and
   embeds Mermaid SVGs when `mmdc` is available. If `mmdc` is unavailable, the helper still emits
   HTML with runtime Mermaid fallback. Preserve the sections, wireframes, and Mermaid diagrams from
   `SEEME.md`. The template must render Markdown before Mermaid, dynamically import Mermaid with
   `.catch()`, and degrade failed diagrams to readable `<pre>` blocks.

## Render contract

- Use `skills/seeme/assets/render-seeme.mjs` to generate `SEEME.html`; it uses
  `skills/seeme/assets/render-template.html` as the source template.
- Load fonts in the template head:
  - `Architects Daughter` for hand-drawn chrome, labels, headings, and Mermaid font family.
  - `JetBrains Mono` for terminal bodies and table/data cells.
- Guard Markdown rendering: if `marked` fails to load, use the template's fallback Markdown renderer
  so extracted wireframes and diagrams still render instead of showing only raw source.
- Never put Markdown rendering behind a top-level static Mermaid import. Render Markdown first, then
  load Mermaid with dynamic `import()`.
- When `mmdc` is available during render mode, embed Mermaid diagrams as static SVGs. If not, keep
  runtime Mermaid as a fallback. If runtime Mermaid fails, replace each diagram with a readable
  source `<pre>`; never blank the page.
- Use real DOM placeholders for extracted fenced blocks, not HTML comments that Markdown parsers may
  drop.
- Wrap each extracted block render in its own error boundary. If a wireframe/terminal extractor
  throws, replace only that block with a source terminal card; never leave placeholders blank and
  never abort later blocks.
- Pass Mermaid source through `textContent`.
- **Dispatch on content, not just the tag.** Redraw a `wireframe`/`screen` fence (or a UI-shaped
  legacy plain fence) as drawn UI — window chrome, traffic-light dots, status strip, CSS-grid
  panels/table, detail/help bars — ONLY when its content reads as a genuine interactive screen: real
  columns/panels, live-status ornaments (gate/pass badges, `▸`, `⟳`, progress, `⚑`), or app widgets
  (composer, nav, buttons, form fields). This is `looksLikeAppScreen` in the template. Frame shape
  alone is not evidence — transcripts, schemas, and tables are boxed too.
- Render `terminal`/`console`/`tree` fences — and any `wireframe`/`screen` block that is really a
  transcript, ER/schema diagram, or data table — as hand-drawn window cards with faithful mono text.
  Never reinterpret verbatim ASCII through the screen heuristics; that is what inverts terminals and
  TUIs (terminals drawn as napkin UI, TUIs collapsed to raw ASCII).
- `terminal`/`console`/`tree` are authoritative-faithful even when boxed. `wireframe`/`screen`
  express authoring intent but are content-gated: a mistagged transcript or schema degrades to a
  faithful card instead of a mangled screen, and a real screen still redraws even with a `$` prompt.
- **Draw every wireframe from the block's ACTUAL content. Never hardcode a repo-specific screen**
  (no fixed sidebar items, bubbles, meters, or labels keyed off content keywords). A content-keyword
  special-case is a bug: it stamps the same canned mockup onto unrelated screens (e.g. a "chat"
  renderer that fires on any block containing words like `sources`/`confidence`/`evidence` will
  overwrite the ontology and admin screens). Parse the frame columns/regions and render the real
  rows, panels, sub-cards, and chips that the ASCII actually contains.
- Reconstruct generic tables by computing column start offsets from the header row, then slicing all
  data rows at those same offsets. Do not split each row independently.
- Create the sketch look with uneven per-corner `border-radius`, dark strokes, and offset shadows;
  keep text crisp and do not use rough.js or SVG displacement filters.

## Output discipline

- Default location: `SEEME.md` at repo root (or the path the user gives). One file per product;
  per-surface sections.
- Start the file with a one-line note that it follows the UX-MD+Mermaid convention and is generated
  by `/seeme`, plus the commit/date so staleness is visible.
- `SEEME.html` is derived output. Regenerate it from `SEEME.md` when requested; do not let it become
  the source of truth.
- Prefer explicit fence info strings in generated Markdown: `wireframe`, `terminal`, and `mermaid`
  (`screen` aliases `wireframe`; `console`, `tree`, and `diagram` alias `terminal` for verbatim mono
  content). Plain legacy fences remain valid, but deterministic tags make rendering reliable.
- Self-check tags by **render mode**, not by a surface pattern: would this block be re-drawn as UI
  (a real interactive screen) or shown verbatim (a transcript, schema, or table)? Do NOT retag on the
  mere presence of a `$`/`❯` prompt — a persistent TUI legitimately opens with its invocation line.
  Tag verbatim content `terminal`/`console`/`tree`; reserve `wireframe`/`screen` for real screens.
- This **complements** real UI verification (screenshots, Playwright, `/verify`) — it does not replace
  them. It is an explanation artifact, not a test.

## Anti-patterns

- Don't invent screens or fields the code doesn't have. Faithful > impressive.
- Don't write paragraphs where a wireframe or diagram is clearer.
- Don't exhaustively enumerate — rank and show what matters (convergence).
- Don't copy a doc that contradicts the code; surface the drift.
