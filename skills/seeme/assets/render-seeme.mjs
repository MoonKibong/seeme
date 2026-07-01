#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [mdPath = 'SEEME.md', htmlPath = 'SEEME.html'] = process.argv.slice(2);
const here = path.dirname(new URL(import.meta.url).pathname);
const templatePath = path.join(here, 'render-template.html');

const markdown = fs.readFileSync(mdPath, 'utf8');
let template = fs.readFileSync(templatePath, 'utf8');
const mermaidBlocks = [...markdown.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)].map(m => m[1].trim());
const rendered = renderMermaidBlocks(mermaidBlocks);

if (rendered.length) {
  template = template.replace(
    '<script type="text/markdown" id="seeme-src">',
    `<script type="application/json" id="seeme-mermaid-svg">${JSON.stringify(rendered)}</script>\n<script type="text/markdown" id="seeme-src">`
  );
}

const title = firstHeading(markdown) || path.basename(path.dirname(path.resolve(mdPath))) || 'SEEME';
const html = template
  .replace('{{TITLE}}', escapeHtml(title))
  .replace('{{SEEME_MARKDOWN}}', escapeScriptText(markdown));

fs.writeFileSync(htmlPath, html);
console.log(`rendered ${htmlPath}${rendered.length ? ` with ${rendered.length} Mermaid SVG block(s)` : ' with runtime Mermaid fallback'}`);

function renderMermaidBlocks(blocks) {
  if (!blocks.length || !hasCommand('mmdc')) return [];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seeme-mermaid-'));
  const svgs = [];
  try {
    for (const [i, src] of blocks.entries()) {
      const inPath = path.join(dir, `${i}.mmd`);
      const outPath = path.join(dir, `${i}.svg`);
      fs.writeFileSync(inPath, src);
      const result = spawnSync('mmdc', ['-i', inPath, '-o', outPath, '-b', 'transparent'], { encoding: 'utf8' });
      if (result.status !== 0 || !fs.existsSync(outPath)) return [];
      svgs.push(fs.readFileSync(outPath, 'utf8'));
    }
    return svgs;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function hasCommand(cmd) {
  return spawnSync('command', ['-v', cmd], { shell: true, stdio: 'ignore' }).status === 0;
}

function firstHeading(md) {
  return (md.match(/^#\s+(.+)$/m) || [])[1];
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function escapeScriptText(s) {
  return s.replace(/<\/script/gi, '<\\/script');
}
