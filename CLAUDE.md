# CLAUDE.md
This file guides Claude Code and Codex (via the `AGENTS.md` symlink) when working in **seeme**.

> Keep this file under 150 lines: rules and links only. No code examples, no duplication (MECE).
> Everything else lives in `docs/`.

## What This Is

seeme is a small, agent-native toolkit for **visual documentation from existing repo knowledge**.
Its core skills are **`/seeme`** and **`/visualize`**. `seeme` creates a standalone **`SEEME.md`** —
a visual explanation of the product's UIs (Markdown wireframes + Mermaid diagrams) — and can render
it into shareable **`SEEME.html`**. `visualize` inserts compact visual blocks into existing docs at
the relevant prose. The framing: **README *tells*; SEEME *shows*.**

The generative work — turning prose/code into faithful wireframes and diagrams — is inherently an
LLM task, so seeme is **skill-first** (instructions for the agent), not a deterministic binary. Any
future helper tooling stays thin and deterministic (doc discovery, Mermaid lint, section-merge).

## Priority Guide

**ALWAYS ENFORCE:**
1. **Faithful to the implementation.** Wireframes/diagrams reflect the REAL screens, columns, keys,
   routes, and states. When docs and code disagree, code is truth — surface the drift, don't copy it.
2. **Show, don't tell.** Prefer a wireframe or diagram over a paragraph. SEEME.md is visual.
3. **Convergent, not exhaustive.** Rank and present the 6–10 things that matter, not everything.
4. **Renderable everywhere.** Plain Markdown + Mermaid that GitHub and any previewer render. Validate
   Mermaid (the gotchas in `docs/patterns/UX_MD_MERMAID.md`) before declaring done.
5. **Complement, never replace, real UI verification** (screenshots, Playwright, `/verify`).

**PREFER:**
- The 6-part UX-MD+Mermaid structure for every surface.
- Idempotent updates: refresh an existing SEEME.md section-by-section; don't clobber hand-written notes.
- `nini`/grep to locate the real UI before drawing it.

## The Convention

See `docs/patterns/UX_MD_MERMAID.md` — the 6-part structure (product frame · IA/nav · Markdown
wireframes · Mermaid flowchart · Mermaid sequence diagram · principles→evidence) plus the Mermaid
gotchas that silently break rendering (parens/brackets in flowchart nodes, angle brackets in
sequence messages, `;` statement-separators, unbalanced fences).

## Public Repo — Leak Hygiene

seeme is **public** open source (`github.com/MoonKibong/seeme`, **Apache-2.0**). Do **not** commit
references to private sibling projects or their `../<project>/…` fixture paths — genericize examples
and fixtures instead. Grep the tracked files for internal project names before every push.

## Layout

| Path | What |
|------|------|
| `skills/seeme/SKILL.md` | The `/seeme` skill (canonical source) |
| `skills/visualize/SKILL.md` | The `/visualize` skill for in-place doc visual blocks |
| `docs/PRD.md` | What seeme is and the SEEME.md contract |
| `docs/patterns/UX_MD_MERMAID.md` | The presentation convention + Mermaid gotchas |
| `SEEME.md` | seeme's own visual spec (dogfood) |
| `assets/seeme-card.*` | Branded share card (PNG + HTML source); the README banner |
| `LICENSE` | Apache-2.0 (this repo is public) |
| `Makefile` | Install skills; `make check` runs the Mermaid/render/visualize lints |

## Commands

`make install` — install the `seeme` and `visualize` skills into `~/.claude/skills/` and
`~/.codex/skills/`. Claude Code can invoke them as slash commands; Codex can use `/skills` or
natural language. `make uninstall` — remove them. See `README.md`.

## Working Here

- The skills are the product. Edit `skills/seeme/SKILL.md` and `skills/visualize/SKILL.md` as the
  canonical sources, then
  `make install` to propagate (the installed copy is generated from here — never hand-edit the
  installed copy, it gets overwritten).
- Keep the skill provider-neutral (Claude + Codex). Keep it lean; push determinism into a helper
  script only when it clearly beats agent instructions.
- When you improve the convention or learn a new Mermaid gotcha, record it in
  `docs/patterns/UX_MD_MERMAID.md` so every future SEEME.md benefits.
