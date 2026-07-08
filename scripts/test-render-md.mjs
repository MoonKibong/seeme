import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const fixture = `# CFO Strategy Brief

## Decision Frame

The source Markdown stays unchanged while the HTML export handles tables and managed Mermaid blocks.

| Workstream | Owner | Status |
|------------|-------|--------|
| Capital plan | CFO | Ready |
| Integration | COO | In review |

<!-- visualize:start id="strategy-flow" source="docs/strategy_brief.md#decision-frame" -->
\`\`\`mermaid
flowchart TD
  A[Baseline] --> B[Board review]
  B --> C[Decision]
\`\`\`
<!-- visualize:end -->
`;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seeme-render-md-'));
const input = path.join(dir, 'strategy_brief.md');
const output = path.join(dir, 'render', 'strategy_brief.html');
fs.writeFileSync(input, fixture);

const renderer = new URL('../skills/seeme/assets/render-seeme.mjs', import.meta.url).pathname;
const result = spawnSync(process.execPath, [renderer, 'render-md', input, '--output', output, '--title', 'CFO Strategy Brief'], {
  encoding: 'utf8'
});
if (result.status !== 0) {
  console.error(result.stdout);
  console.error(result.stderr);
  throw new Error(`render-md exited with ${result.status}`);
}

if (!fs.existsSync(output)) throw new Error('expected HTML output file');
if (fs.readFileSync(input, 'utf8') !== fixture) throw new Error('input Markdown was mutated');

const html = fs.readFileSync(output, 'utf8');
if (!html.includes('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs')) {
  throw new Error('expected Mermaid module import');
}
if (!html.includes('querySelectorAll("pre.mermaid, pre > code.language-mermaid")')) {
  throw new Error('expected browser normalization for both Pandoc Mermaid shapes');
}
if (!html.includes('flowchart TD') || !html.includes('A[Baseline] --&gt; B[Board review]')) {
  throw new Error('expected Mermaid source to remain in the HTML before browser rendering');
}
if (!html.includes('<table>') || !html.includes('<th>Workstream</th>') || !html.includes('<td>Capital plan</td>')) {
  throw new Error('expected rendered table markup');
}
if (!html.includes('class="table-scroll"')) {
  throw new Error('expected responsive table wrapper');
}
if (!html.includes('<!-- visualize:start id="strategy-flow"')) {
  throw new Error('expected visualize comments to remain harmless as comments');
}
const titleCount = (html.match(/<h1>CFO Strategy Brief<\/h1>/g) || []).length;
if (titleCount !== 1) {
  throw new Error(`expected one rendered title, got ${titleCount}`);
}

console.log('render-md regression OK');
