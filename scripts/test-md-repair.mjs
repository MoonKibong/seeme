import {
  repairMermaid,
  lintMermaid,
  repairMarkdownTable,
  isValidMarkdownTable,
  looksLikeWireframe,
} from '../skills/seeme/assets/md-repair.mjs';

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

// Nested same-char parens inside a node label repair cleanly.
{
  const src = 'flowchart TD\n  A[Load orders()] --> B(Process (data))\n  B --> C{Check status}';
  const repaired = repairMermaid(src);
  assert(lintMermaid(repaired).length === 0, `expected clean repair, got: ${lintMermaid(repaired).join('; ')}`);
  assert(repaired.includes('A["Load orders()"]'), `expected quoted bracket label, got: ${repaired}`);
  assert(repaired.includes('B("Process (data)")'), `expected quoted paren label, got: ${repaired}`);
}

// Content that can't be safely auto-repaired (angle brackets in a sequence
// message) is left as-is and flagged, not silently mangled.
{
  const src = 'sequenceDiagram\n  participant U as User\n  U->>S: fetch <token>';
  const repaired = repairMermaid(src);
  const errors = lintMermaid(repaired);
  assert(errors.some(e => e.includes('angle brackets')), 'expected angle-bracket error to survive repair');
}

// Reserved sequence participant id is flagged.
{
  const src = 'sequenceDiagram\n  participant loop as Loop\n  loop->>loop: tick';
  assert(lintMermaid(src).some(e => e.includes('reserved keyword')), 'expected reserved participant id error');
}

// Unclosed delimiters within the auto-close budget get closed.
{
  const src = 'flowchart TD\n  A[[Unclosed';
  const repaired = repairMermaid(src);
  assert(!lintMermaid(repaired).some(e => e.includes('unclosed')), `expected delimiters closed, got: ${lintMermaid(repaired).join('; ')}`);
}

// Mermaid statement-separator ";" is flagged.
{
  const src = 'flowchart TD\n  A[Start] --> B[synthesize; validate]';
  assert(lintMermaid(src).some(e => e.includes('";"')), 'expected ";" separator error');
}

// Table: missing separator row and ragged columns get normalized.
{
  const raw = '| Name | Value\n|---\n| foo | 1 | extra |\n| bar';
  assert(!isValidMarkdownTable(raw.split('\n')), 'fixture should start invalid');
  const repaired = repairMarkdownTable(raw);
  const lines = repaired.split('\n');
  assert(isValidMarkdownTable(lines), `expected valid table after repair, got:\n${repaired}`);
  assert(lines.length === 4, `expected header+sep+2 rows, got ${lines.length}`);
}

// Table: already-valid tables are left semantically unchanged.
{
  const good = '| A | B |\n| --- | --- |\n| 1 | 2 |';
  assert(isValidMarkdownTable(good.split('\n')), 'expected fixture to already be valid');
}

// Wireframe heuristic distinguishes structured ASCII from prose.
{
  const box = '┌────────┐\n│ Inbox  │\n└────────┘';
  assert(looksLikeWireframe(box), 'expected box-drawing block to be recognized as a wireframe');
  assert(!looksLikeWireframe('just two\nplain lines'), 'expected plain prose to be rejected');
}

console.log('md-repair unit tests OK');
