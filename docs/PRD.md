# seeme — Product Requirements

## Problem

A repo's UI knowledge is scattered across PRDs, plans, specs, and code. Reading it to understand
"what does this product look like and how does it work?" is slow, and the understanding is lost when
the reader moves on. README explains in prose; nothing *shows* the UIs.

## Product

**seeme** gives agents (Claude Code, Codex) two visual documentation capabilities:

- **`seeme`** reads repo knowledge and produces **`SEEME.md`**: a standalone visual explanation of
  the product's UIs and how they work, using Markdown wireframes + Mermaid diagrams. It can also
  render that source into **`SEEME.html`** for sharing, or render an explicit ordinary Markdown file
  to standalone HTML when export is requested.
- **`visualize`** edits an existing text-centric doc in place, inserting a compact visual block near
  the relevant prose.

**README tells; SEEME shows.**

## The SEEME.md contract

- One `SEEME.md` per product (repo root by default); a section per major surface.
- Each surface follows the **UX-MD+Mermaid** 6-part structure (`docs/patterns/UX_MD_MERMAID.md`):
  product frame → IA/nav → Markdown wireframes → Mermaid flowchart → Mermaid sequence → principles.
- **Faithful to the implementation** (code is truth over stale docs), **convergent** (the 6–10 things
  that matter), and **renderable** anywhere (validated Mermaid).
- Generated Markdown uses explicit fence info strings by **render mode**: `wireframe` for genuine
  interactive UI screens / persistent TUI surfaces (re-drawn as sketch UI), `terminal` for verbatim
  mono content — CLI/REPL transcripts, command output, trees, logs, one-shot tables, and non-UI ASCII
  diagrams/schemas — and `mermaid` for diagrams; `screen` aliases `wireframe`, and `console`/`tree`/
  `diagram` alias `terminal`.
  The renderer content-checks these: a `wireframe` block that is really a transcript or schema
  degrades to a faithful card, and a real screen still redraws even when it opens with a `$` prompt.
- Generating is **idempotent**: re-running `/seeme` refreshes sections from current docs/code and
  flags drift; it does not clobber hand-written notes.
- `SEEME.html` is derived output from `SEEME.md`, regenerated on request for sharing and discussion.
- `SEEME.html` renders Markdown independently of Mermaid, loads Mermaid dynamically with fallback,
  and draws genuine `wireframe` screens as sketch-style DOM while showing verbatim ASCII faithfully.
- Generic Markdown HTML export is derived output from an explicit source `.md` file. It preserves the
  Markdown unchanged, supports `visualize` managed Mermaid blocks, emits wide executive-readable HTML,
  applies no SEEME-specific wireframe transforms, and avoids duplicate title chrome when the source
  already starts with the same H1.

## The in-place visualization contract

- `visualize` edits the target doc in place; it does not create `SEEME.md`.
- `visualize` requires an explicit Markdown file/section target or an explicit `--all <directory>`
  scan. If omitted, the agent asks the user to choose; it does not silently mutate repo docs.
- Directory scans are bounded to `.md` and `.mdx` files under the requested directory and skip
  generated/derived files such as `SEEME.md`, `SEEME.html`, `CHANGELOG.md`, dependencies, `.git`, and
  build output.
- It inserts one compact visual by default: Markdown wireframe, Mermaid flowchart, Mermaid sequence,
  or data-flow diagram.
- The visual goes immediately before or after the prose it clarifies.
- Each generated visual is wrapped in a managed `visualize:start` / `visualize:end` block with a
  stable `id` and `source`.
- Re-running `visualize` for the same target skips unchanged visuals or replaces the existing managed
  block; it must not duplicate the same diagram.
- Surrounding prose, headings, and anchors stay stable unless a short bridge sentence is needed.
- The output remains plain Markdown + Mermaid and follows the same Mermaid gotchas convention.
- Managed blocks are renderer-neutral: comments provide update identity, while the visual content
  remains portable Markdown, Mermaid, or tables that work in GitHub and standalone HTML export.

## Why skill-first (not a binary)

Synthesizing faithful wireframes and diagrams from prose and code is inherently an LLM task; a
deterministic tool cannot do it well. So the capability is a **skill** (instructions the agent
follows). Determinism (doc discovery, Mermaid lint, section-merge) can later move into a thin helper
script if it clearly beats agent instructions — but the skill stays the product.

## Non-goals

- Not a replacement for screenshots, Playwright, or runtime `/verify` — SEEME.md is an explanation
  artifact, not a test.
- Not a live/auto-updating doc — it's regenerated on demand via `/seeme`.
- Not a design tool — it visualizes what exists (or is planned), it doesn't invent UI.
- `visualize` is not a repo-wide visual spec generator; use `seeme` for that.
- `visualize --all` is not permission to edit every file; it scans Markdown under the chosen
  directory and changes only sections where a visual clearly helps.

## Success

A reader (human or agent) opens `SEEME.md` and understands the product's surfaces and flows in
minutes, on GitHub, without launching anything — and an agent can refresh it in one command as the
product evolves. A team can render `SEEME.html`, or export a specific Markdown brief to HTML, when
they need a shareable visual artifact. A reader of an existing doc can understand a specific UI,
process, or data flow faster because `visualize` placed a compact, managed diagram at the point of
need without duplicating it on later runs.
