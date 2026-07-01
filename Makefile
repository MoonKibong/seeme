# seeme — install the `seeme` and `visualize` skills for Claude Code and Codex.
# Canonical sources live under skills/; install copies them into the agent skill dirs.

SEEME_SRC := skills/seeme
VISUALIZE_SRC := skills/visualize
CLAUDE_SKILLS := $(HOME)/.claude/skills
CODEX_SKILLS  := $(HOME)/.codex/skills
SEEME_CLAUDE_DST := $(CLAUDE_SKILLS)/seeme
SEEME_CODEX_DST  := $(CODEX_SKILLS)/seeme
VISUALIZE_CLAUDE_DST := $(CLAUDE_SKILLS)/visualize
VISUALIZE_CODEX_DST  := $(CODEX_SKILLS)/visualize

.PHONY: install uninstall reinstall check lint-mermaid lint-visualize-blocks lint-render-template

install:
	@mkdir -p "$(CLAUDE_SKILLS)" "$(CODEX_SKILLS)"
	@rm -rf "$(SEEME_CLAUDE_DST)" "$(SEEME_CODEX_DST)" "$(VISUALIZE_CLAUDE_DST)" "$(VISUALIZE_CODEX_DST)"
	@cp -R "$(SEEME_SRC)" "$(CLAUDE_SKILLS)/"
	@cp -R "$(SEEME_SRC)" "$(CODEX_SKILLS)/"
	@cp -R "$(VISUALIZE_SRC)" "$(CLAUDE_SKILLS)/"
	@cp -R "$(VISUALIZE_SRC)" "$(CODEX_SKILLS)/"
	@echo "Installed seeme and visualize skills:"
	@echo "  -> $(SEEME_CLAUDE_DST)/SKILL.md"
	@echo "  -> $(SEEME_CODEX_DST)/SKILL.md"
	@echo "  -> $(VISUALIZE_CLAUDE_DST)/SKILL.md"
	@echo "  -> $(VISUALIZE_CODEX_DST)/SKILL.md"
	@echo "Restart the agent session to pick up the skills."
	@echo "Claude Code: run /seeme or /visualize. Codex: choose seeme or visualize from /skills."

uninstall:
	@rm -rf "$(SEEME_CLAUDE_DST)" "$(SEEME_CODEX_DST)" "$(VISUALIZE_CLAUDE_DST)" "$(VISUALIZE_CODEX_DST)"
	@echo "Removed seeme and visualize skills."

reinstall: uninstall install

check:
	@test -f "$(SEEME_SRC)/SKILL.md" && echo "source OK: $(SEEME_SRC)/SKILL.md" || (echo "MISSING $(SEEME_SRC)/SKILL.md" && exit 1)
	@test -f "$(SEEME_SRC)/assets/render-template.html" && echo "template OK: $(SEEME_SRC)/assets/render-template.html" || (echo "MISSING $(SEEME_SRC)/assets/render-template.html" && exit 1)
	@test -f "$(SEEME_SRC)/assets/render-seeme.mjs" && echo "renderer OK: $(SEEME_SRC)/assets/render-seeme.mjs" || (echo "MISSING $(SEEME_SRC)/assets/render-seeme.mjs" && exit 1)
	@test -f "$(VISUALIZE_SRC)/SKILL.md" && echo "source OK: $(VISUALIZE_SRC)/SKILL.md" || (echo "MISSING $(VISUALIZE_SRC)/SKILL.md" && exit 1)
	@head -6 "$(SEEME_SRC)/SKILL.md"
	@head -6 "$(VISUALIZE_SRC)/SKILL.md"
	@$(MAKE) lint-mermaid
	@$(MAKE) lint-visualize-blocks
	@$(MAKE) lint-render-template
	@node scripts/lint-mermaid-source.mjs SEEME.md docs/patterns/UX_MD_MERMAID.md
	@node scripts/test-render-template.mjs

lint-mermaid:
	@awk 'BEGIN { fences = 0 } /^```/ { fences++ } END { if (fences % 2) { print "unbalanced markdown fences"; exit 1 } print "markdown fences balanced" }' SEEME.md docs/patterns/UX_MD_MERMAID.md "$(SEEME_SRC)/SKILL.md" "$(VISUALIZE_SRC)/SKILL.md"
	@awk 'BEGIN { in_mermaid = 0; bad = 0 } /^```mermaid/ { in_mermaid = 1; next } /^```/ { in_mermaid = 0; next } in_mermaid && /[A-Za-z0-9_]+[[:space:]]*\[[^]]*[()]/ { print FILENAME ":" FNR ": flowchart node label contains parens"; bad = 1 } END { exit bad }' SEEME.md
	@awk 'BEGIN { in_seq = 0; bad = 0 } /^```mermaid/ { in_mermaid = 1; in_seq = 0; next } in_mermaid && /^sequenceDiagram/ { in_seq = 1; next } /^```/ { in_mermaid = 0; in_seq = 0; next } in_seq && /<[^>]+>/ { print FILENAME ":" FNR ": sequence diagram contains angle brackets"; bad = 1 } END { exit bad }' SEEME.md
	@awk 'BEGIN { in_mermaid = 0; bad = 0 } /^```mermaid/ { in_mermaid = 1; next } /^```/ { in_mermaid = 0; next } in_mermaid && /;/ { print FILENAME ":" FNR ": mermaid contains ; (statement separator — use a comma, and, or a line break)"; bad = 1 } END { exit bad }' SEEME.md
	@echo "Mermaid lint OK"

lint-visualize-blocks:
	@awk 'match($$0, /visualize:start id="[^"]+"/) { id = substr($$0, RSTART + 20, RLENGTH - 21); seen[id]++; loc[id] = loc[id] " " FILENAME ":" FNR } END { for (id in seen) if (seen[id] > 1) { print "duplicate visualize block id=\"" id "\":" loc[id]; bad = 1 } if (bad) exit 1; print "visualize block ids unique" }' README.md SEEME.md docs/*.md skills/*/SKILL.md

lint-render-template:
	@grep -q "typeof marked === 'undefined'" "$(SEEME_SRC)/assets/render-template.html"
	@grep -q "import('https://cdn.jsdelivr.net/npm/mermaid" "$(SEEME_SRC)/assets/render-template.html"
	@! grep -Eq "^[[:space:]]*import[[:space:]].*mermaid" "$(SEEME_SRC)/assets/render-template.html"
	@grep -q "staticMermaidSvgs" "$(SEEME_SRC)/assets/render-template.html"
	@grep -q "mermaid-static" "$(SEEME_SRC)/assets/render-template.html"
	@grep -q "wireframe" "$(SEEME_SRC)/assets/render-template.html"
	@grep -q "terminal" "$(SEEME_SRC)/assets/render-template.html"
	@grep -q "UI_KINDS" "$(SEEME_SRC)/assets/render-template.html"
	@grep -q "TERM_KINDS" "$(SEEME_SRC)/assets/render-template.html"
	@grep -q "languageFor" "$(SEEME_SRC)/assets/render-template.html"
	@grep -q "renderExtractedBlock" "$(SEEME_SRC)/assets/render-template.html"
	@grep -q "block render failed" "$(SEEME_SRC)/assets/render-template.html"
	@grep -q "looksLikeAppScreen" "$(SEEME_SRC)/assets/render-template.html"
	@grep -q "framedWireframeBlock" "$(SEEME_SRC)/assets/render-template.html"
	@grep -q "terminal/console/tree: always faithful" "$(SEEME_SRC)/assets/render-template.html"
	@! grep -q "mis-tagged" "$(SEEME_SRC)/assets/render-template.html"
	@! grep -q "chatWireframeBlock" "$(SEEME_SRC)/assets/render-template.html"
	@! grep -q "isChatWireframe" "$(SEEME_SRC)/assets/render-template.html"
	@grep -q "tableByHeaderOffsets" "$(SEEME_SRC)/assets/render-template.html"
	@grep -q "mmdc" "$(SEEME_SRC)/assets/render-seeme.mjs"
	@grep -q "seeme-mermaid-svg" "$(SEEME_SRC)/assets/render-seeme.mjs"
	@echo "render template OK"
