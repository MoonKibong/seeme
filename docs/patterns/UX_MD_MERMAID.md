# UX-MD+Mermaid — the SEEME.md convention

How seeme presents product UI/UX: **Markdown UX wireframes + Mermaid process maps**. Every `SEEME.md`
(and any UI section in a plan/spec/PR) follows this. Concise and implementation-oriented; it survives
in repo docs and renders natively on GitHub.

## The six parts (in order, per surface)

1. **Product frame & target user** — what the surface is, who it's for, the success signal.
2. **Information architecture / navigation** — the structure or nav hierarchy (fenced text tree).
3. **Markdown wireframes** — ASCII/box wireframes of the key screens in fenced `wireframe` blocks,
   using the REAL labels the implementation renders (columns, keys, fields, states). Use `terminal`
   fences for CLI output, trees, logs, and non-UI ASCII diagrams/schemas/tables (shown verbatim).
4. **Mermaid flowchart** — the core business/interaction process.
5. **Mermaid sequence diagram** — the user ↔ agent/app ↔ system handoff.
6. **Design principles → evidence** — each principle mapped to a real code path or metric.

A whole-product SEEME.md repeats parts 2–6 per major surface, with one shared part 1.

## Faithfulness rules

- Reflect the REAL screens/columns/keys/routes/states — read the code, don't paraphrase a doc.
- When docs and code disagree, **code is truth**: render the code's reality and flag the doc drift.
- **Convergent, not exhaustive**: the 6–10 things that matter, ranked. A tight, correct view beats a
  complete one.
- **Show, don't tell**: a wireframe or diagram instead of a paragraph wherever it's clearer.

## Mermaid gotchas (these SILENTLY break rendering — always check)

- **Flowchart node labels**: no raw `(` `)` `[` `]` inside `[...]` / `{...}`. Use `<br/>` for line
  breaks; spell out or drop punctuation; write `orders.` not `orders[]`. `?` and `!=`/`==` are fine.
- **Sequence diagrams**: no `<...>` angle brackets in messages or participant `as` aliases — Mermaid
  treats them as HTML tags and eats the text. Write `{slug}` or `SLUG`, not `<slug>`. Avoid parens in
  participant aliases (`participant DB as SQLite truth`, not `SQLite (truth)`); parens inside a
  message line are usually fine.
- **No `;` anywhere in Mermaid**: Mermaid treats `;` as a statement separator, so a `;` inside a
  sequence message (or any label) truncates the statement and throws a parse error. Use a comma,
  `and`, or a line break — write `synthesize and validate`, not `synthesize; validate`.
- **Edge labels**: avoid a bare `/` (e.g. write `slash` or `run` instead of `/`).
- **Fences**: every ```mermaid block must be closed; keep the total count of ``` even.
- **Validate**: if a `mmdc` (mermaid CLI) is installed, render each block to catch errors; otherwise
  grep for node labels containing `(`/`[` and for `<` in sequence blocks.
- **Self-correct**: run `assets/md-repair.mjs TARGET.md --fix` (ships with the `seeme`/`visualize`
  skills) before finishing. It's a deterministic, single-pass repair — no LLM re-generation, no retry
  loop — for the node-label/edge-label/subgraph-title quoting and unclosed-delimiter classes of error
  above, plus malformed Markdown tables (missing separator row, ragged columns). It leaves content
  errors it can't safely guess at (e.g. a literal `<token>` in a sequence message) flagged for a manual
  fix rather than mangling them.

## Wireframe style

- Box-drawing (`┌─┐│└┘├┤`) or simple ASCII. Choose the fence by **render mode**, not by border shape
  (transcripts, schemas, and tables are all boxed too):
  - **`wireframe`/`screen` = SKETCH** — re-drawn as hand-sketched UI. Use only for *interactive,
    multi-region* screens: nav + side-by-side panels, forms, a detail pane, selectable rows, or
    dashboards with real columns (e.g. an order/queue dashboard: a list rail + a detail pane).
    Streaming run/log output is **not** a screen even with progress bars, gate/`[PASS]` badges,
    spinners, or `▸` markers.
  - **`terminal`/`console`/`tree`/`diagram` = VERBATIM** — shown faithfully as mono text, layout
    preserved. Use for CLI/REPL transcripts, stdout/flags/**run + build logs**, one-shot command
    tables, `tree` listings, and ASCII whose exact layout is the artifact (`diagram`). **Write
    transcripts as plain prompt + output — don't wrap them in a `┌─┐` box:** the window chrome is the
    frame, so an added box double-frames and misrepresents unboxed command output.
  - `mermaid` for anything semantic — flowchart, sequence, **ER schema (`erDiagram`)**, class/state.
    Prefer it over ASCII box art whenever a real diagram type fits. Use `erDiagram` only when there
    are **relationships to show (2+ related entities)** — a lone/standalone table is a **Markdown
    table**, not a one-box diagram. Flat data tables are Markdown tables too, not `diagram` boxes.
- A leading `$ cmd` / `❯ cmd` line does **not** by itself decide the fence: a persistent interactive
  TUI can open with its invocation, and a transcript can too. Decide by whether the body is an
  interactive multi-region screen (→ `wireframe`) or command output / a static diagram (→ `terminal`).
- Annotate with `←` callouts for the non-obvious (sort order, highlighted row, empty state).
- Show empty/error/loading states too — they're part of the UI.

## HTML render contract

- `SEEME.html` is derived from `SEEME.md`; do not treat it as canonical.
- Ordinary Markdown HTML exports are derived from their explicit source `.md` file; do not mutate the
  Markdown during render, and do not apply SEEME sketch transforms to non-SEEME docs. Export chrome
  can remove a duplicate first H1 when it matches the HTML title, but that is presentation only.
- `visualize` managed blocks render as their fenced Mermaid content. The surrounding
  `visualize:start` / `visualize:end` comments are harmless HTML comments, not visible content.
- Browser Mermaid setup must normalize both common Markdown-export shapes, `pre.mermaid` and
  `pre > code.language-mermaid`, before calling `mermaid.run`.
- Use the render helper when available so Mermaid diagrams are embedded as static SVGs if `mmdc`
  exists; otherwise keep runtime Mermaid as an explicit fallback.
- Render Markdown before loading Mermaid so a slow or blocked Mermaid CDN cannot blank the page.
- Load Mermaid with dynamic `import()` and degrade failed diagrams to readable source `<pre>` blocks.
- Guard Markdown rendering too: if `marked` is unavailable, use the template fallback renderer so
  extracted wireframes and diagrams still render.
- Render each extracted block behind its own error boundary; a bad wireframe extractor should degrade
  that one block to a source terminal card, not leave blank placeholders or abort later blocks.
- Dispatch on **content, not just the tag**. Redraw a `wireframe`/`screen` (or UI-shaped plain) fence
  as a DOM wireframe ONLY when its content reads as a real interactive screen — real columns/panels,
  live-status ornaments (gate/pass badges, `▸`, `⟳`, progress, `⚑`), or app widgets (composer, nav,
  buttons, fields). Frame shape alone is not evidence.
- Render `terminal`/`console`/`tree` fences — and any `wireframe`/`screen` block that is really a
  transcript, ER/schema diagram, or data table — as hand-drawn window cards with faithful mono text.
  Never reinterpret verbatim ASCII through the screen heuristics: that inverts terminals and TUIs
  (terminals drawn as napkin UI, TUIs collapsed to raw ASCII).
- `terminal`/`console`/`tree` are authoritative-faithful even when boxed. `wireframe`/`screen` are
  content-gated: a mistagged transcript or schema degrades to a faithful card, and a real screen
  still redraws even with a `$` prompt line.
- Reconstruct table regions by header column offsets, not independent per-row whitespace splitting.
- Use `Architects Daughter` for hand-drawn chrome/labels/headings and Mermaid font family; use
  `JetBrains Mono` for terminal bodies and table cells.
- Keep text crisp. Use uneven per-corner border radius, dark strokes, and offset shadows for the
  sketch look; do not use rough.js or displacement filters.

## Why

A consistent, reviewable, plain-text UI/UX spec that lives in the repo, renders on GitHub, and lets
both humans and agents reason about the product's surfaces without launching it. It complements —
never replaces — screenshots and runtime verification.
