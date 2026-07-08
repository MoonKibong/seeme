#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const here = path.dirname(new URL(import.meta.url).pathname);
const templatePath = path.join(here, 'render-template.html');
const markdownTemplatePath = path.join(here, 'render-md-template.html');

const args = process.argv.slice(2);

if (args[0] === '--help' || args[0] === '-h') {
  usage(0);
} else if (args[0] === 'render-md') {
  renderMarkdownCommand(args.slice(1));
} else {
  renderSeemeCommand(args);
}

function renderSeemeCommand(args) {
  const [mdPath = 'SEEME.md', htmlPath = 'SEEME.html'] = args;
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
}

function renderMarkdownCommand(args) {
  const opts = parseRenderMarkdownArgs(args);
  const markdown = fs.readFileSync(opts.input, 'utf8');
  const sourceTitle = firstHeading(markdown);
  const title = opts.title || sourceTitle || path.basename(opts.input, path.extname(opts.input));
  const bodyMarkdown = sourceTitle && sameText(sourceTitle, title) ? dropLeadingHeading(markdown, sourceTitle) : markdown;
  const body = renderMarkdownHtml(bodyMarkdown);
  const template = fs.readFileSync(markdownTemplatePath, 'utf8');
  const html = template
    .replaceAll('{{TITLE}}', escapeHtml(title))
    .replace('{{BODY}}', body)
    .replace('{{SOURCE_FILE}}', escapeHtml(path.basename(opts.input)));

  fs.mkdirSync(path.dirname(path.resolve(opts.output)), { recursive: true });
  fs.writeFileSync(opts.output, html);
  console.log(`rendered ${opts.output} from ${opts.input} with browser Mermaid support`);
}

function parseRenderMarkdownArgs(args) {
  const opts = { input: '', output: '', title: '' };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--output' || arg === '-o') opts.output = requireValue(args, ++i, arg);
    else if (arg === '--title' || arg === '-t') opts.title = requireValue(args, ++i, arg);
    else if (arg === '--help' || arg === '-h') usage(0);
    else if (!opts.input) opts.input = arg;
    else if (!opts.output) opts.output = arg;
    else usage(2, `unexpected argument: ${arg}`);
  }
  if (!opts.input || !opts.output) usage(2, 'render-md requires INPUT.md and --output OUTPUT.html');
  return opts;
}

function requireValue(args, index, flag) {
  if (!args[index] || args[index].startsWith('--')) usage(2, `${flag} requires a value`);
  return args[index];
}

function usage(code, message = '') {
  if (message) console.error(message);
  console.error('usage:');
  console.error('  render-seeme.mjs [SEEME.md] [SEEME.html]');
  console.error('  render-seeme.mjs render-md INPUT.md --output OUTPUT.html [--title TITLE]');
  process.exit(code);
}

function renderMarkdownHtml(markdown) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  for (let i = 0; i < lines.length;) {
    const rendered = renderMarkdownBlock(lines, i);
    if (!rendered) {
      i++;
      continue;
    }
    out.push(rendered.html);
    i = rendered.next;
  }
  return out.join('\n');
}

function renderMarkdownBlock(lines, i) {
  const line = lines[i];
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (/^<!--/.test(trimmed)) return { html: trimmed, next: i + 1 };
  if (/^```/.test(line)) return renderFenceBlock(lines, i);
  if (/^#{1,6}\s+/.test(line)) return renderHeadingBlock(line, i);
  if (isTableStart(lines, i)) return renderTableBlock(lines, i);
  if (/^\s*[-*+]\s+/.test(line)) return renderListBlock(lines, i, 'ul', /^\s*[-*+]\s+/, /^\s*[-*+]\s+/);
  if (/^\s*\d+\.\s+/.test(line)) return renderListBlock(lines, i, 'ol', /^\s*\d+\.\s+/, /^\s*\d+\.\s+/);
  if (/^\s*>\s?/.test(line)) return renderQuoteBlock(lines, i);
  return renderParagraphBlock(lines, i);
}

function renderFenceBlock(lines, i) {
  const fence = lines[i].match(/^```([^\n`]*)\s*$/);
  if (!fence) return renderParagraphBlock(lines, i);
  const code = [];
  let next = i + 1;
  while (next < lines.length && !/^```\s*$/.test(lines[next])) code.push(lines[next++]);
  if (next < lines.length) next++;
  return { html: renderFence(fence[1].trim(), code.join('\n')), next };
}

function renderHeadingBlock(line, i) {
  const heading = line.match(/^(#{1,6})\s+(.+)$/);
  const level = heading[1].length;
  const text = heading[2].replace(/\s+#+\s*$/, '').trim();
  return { html: `<h${level}>${inlineMarkdown(text)}</h${level}>`, next: i + 1 };
}

function renderTableBlock(lines, i) {
  const table = [lines[i], lines[i + 1]];
  let next = i + 2;
  while (next < lines.length && /^\s*\|.*\|\s*$/.test(lines[next]) && lines[next].trim()) {
    table.push(lines[next++]);
  }
  return { html: renderTable(table), next };
}

function renderListBlock(lines, i, tag, itemRE, startRE) {
  const items = [];
  let next = i;
  while (next < lines.length && startRE.test(lines[next])) items.push(lines[next++].replace(itemRE, ''));
  const body = items.map(item => `<li>${inlineMarkdown(item.trim())}</li>`).join('');
  return { html: `<${tag}>${body}</${tag}>`, next };
}

function renderQuoteBlock(lines, i) {
  const quote = [];
  let next = i;
  while (next < lines.length && /^\s*>\s?/.test(lines[next])) quote.push(lines[next++].replace(/^\s*>\s?/, ''));
  return { html: `<blockquote>${quote.map(inlineMarkdown).join('<br>')}</blockquote>`, next };
}

function renderParagraphBlock(lines, i) {
  const para = [lines[i].trim()];
  let next = i + 1;
  while (next < lines.length && lines[next].trim() && !startsBlock(lines, next)) para.push(lines[next++].trim());
  return { html: `<p>${inlineMarkdown(para.join(' '))}</p>`, next };
}

function startsBlock(lines, i) {
  const line = lines[i] || '';
  return /^```/.test(line) ||
    /^#{1,6}\s+/.test(line) ||
    isTableStart(lines, i) ||
    /^\s*([-*+]|\d+\.)\s+/.test(line) ||
    /^\s*>\s?/.test(line) ||
    /^<!--/.test(line.trim());
}

function renderFence(info, code) {
  const lang = (info || '').split(/\s+/)[0].toLowerCase();
  if (lang === 'mermaid') return `<pre><code class="language-mermaid">${escapeHtml(code)}</code></pre>`;
  const cls = lang ? ` class="language-${escapeHtmlAttr(lang)}"` : '';
  return `<pre><code${cls}>${escapeHtml(code)}</code></pre>`;
}

function isTableStart(lines, i) {
  return /^\s*\|.*\|\s*$/.test(lines[i] || '') && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[i + 1] || '');
}

function renderTable(lines) {
  const headers = splitTableRow(lines[0]);
  const rows = lines.slice(2).map(splitTableRow);
  return `<div class="table-scroll"><table><thead><tr>${headers.map(h => `<th>${inlineMarkdown(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${headers.map((_, i) => `<td>${inlineMarkdown(row[i] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
}

function inlineMarkdown(text) {
  const placeholders = [];
  let escaped = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => {
    placeholders.push(`<code>${code}</code>`);
    return `\u0000${placeholders.length - 1}\u0000`;
  });
  escaped = escaped
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return escaped.replace(/\u0000(\d+)\u0000/g, (_, n) => placeholders[Number(n)]);
}

function dropLeadingHeading(markdown, heading) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const first = lines.findIndex(line => line.trim());
  if (first < 0) return markdown;
  const match = lines[first].match(/^#\s+(.+)$/);
  if (!match || !sameText(match[1].replace(/\s+#+\s*$/, ''), heading)) return markdown;
  lines.splice(first, 1);
  return lines.join('\n');
}

function sameText(a, b) {
  return String(a || '').trim().replace(/\s+/g, ' ') === String(b || '').trim().replace(/\s+/g, ' ');
}

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

function escapeHtmlAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

function escapeScriptText(s) {
  return s.replace(/<\/script/gi, '<\\/script');
}
