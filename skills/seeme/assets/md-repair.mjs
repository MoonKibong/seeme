#!/usr/bin/env node
// Deterministic, single-pass self-correction for LLM-generated Mermaid blocks,
// Markdown tables, and ASCII wireframes — no LLM feedback loop, no network.
// Repair, then validate with a heuristic lint, then leave the best-effort
// result for the render template's own error boundary to fall back on if it
// still fails.

import fs from 'node:fs';

const SHAPE_PAIRS = [
  ['[', ']'],
  ['(', ')'],
  ['{', '}'],
  ['([', '])'],
  ['[[', ']]'],
  ['[(', ')]'],
  ['((', '))'],
  ['{{', '}}'],
  ['[/', '/]'],
  ['[\\', '\\]'],
  ['[/', '\\]'],
  ['[\\', '/]'],
  ['>', ']'],
];

const RESERVED_SEQUENCE_IDS = new Set([
  'loop', 'alt', 'opt', 'par', 'and', 'end', 'note', 'rect', 'activate',
  'deactivate', 'break', 'critical', 'box', 'actor', 'participant',
]);

const KNOWN_HEADERS = /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline)\b/;

// ---- Mermaid: node shape / edge label re-quoting ----

function quoteLabel(label) {
  const trimmed = label.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return label;
  const escaped = trimmed.replace(/"/g, '#quot;');
  return `"${escaped}"`;
}

function hasRiskyChars(label) {
  return /[()[\]{}<>]/.test(label.trim().replace(/^"|"$/g, ''));
}

// Compound (2-char) open tokens have a distinctive multi-char close sequence
// (e.g. "])", "))") that's unlikely to appear inside plain label text, so a
// non-greedy regex finds the true close even when the label has nested
// single-char parens/brackets inside it.
function repairCompoundShapes(source) {
  let out = source;
  for (const [open, close] of SHAPE_PAIRS.filter(([o]) => o.length > 1)) {
    const openEsc = open.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const closeEsc = close.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`([A-Za-z0-9_]+)${openEsc}([^\\n]*?)${closeEsc}`, 'g');
    out = out.replace(re, (full, id, label) => {
      if (!hasRiskyChars(label)) return full;
      return `${id}${open}${quoteLabel(label)}${close}`;
    });
  }
  return out;
}

// Single-char shapes ([ ], ( ), { }) can nest the same delimiter inside the
// label itself (e.g. "B(Process (data))"), so a non-greedy regex would match
// the wrong close. Walk the line tracking bracket depth to find the true
// matching close instead.
function findMatchingClose(line, openIdx, openChar, closeChar) {
  let depth = 0;
  for (let i = openIdx; i < line.length; i++) {
    if (line[i] === openChar) depth++;
    else if (line[i] === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function repairSingleCharShape(source, openChar, closeChar) {
  return source.split('\n').map(line => {
    let result = '';
    let i = 0;
    while (i < line.length) {
      const idMatch = /^[A-Za-z0-9_]+/.exec(line.slice(i));
      const openIdx = idMatch ? i + idMatch[0].length : -1;
      if (idMatch && line[openIdx] === openChar) {
        const closeIdx = findMatchingClose(line, openIdx, openChar, closeChar);
        if (closeIdx !== -1) {
          const label = line.slice(openIdx + 1, closeIdx);
          const rendered = hasRiskyChars(label) ? quoteLabel(label) : label;
          result += idMatch[0] + openChar + rendered + closeChar;
          i = closeIdx + 1;
          continue;
        }
      }
      result += line[i];
      i++;
    }
    return result;
  }).join('\n');
}

function repairMermaidNodeShapes(source) {
  let out = repairCompoundShapes(source);
  out = repairSingleCharShape(out, '[', ']');
  out = repairSingleCharShape(out, '(', ')');
  out = repairSingleCharShape(out, '{', '}');
  return out;
}

function repairMermaidEdgeLabels(source) {
  return source.replace(/(--?[.>x]*>?)\|([^|\n]*)\|/g, (full, arrow, label) => {
    if (!hasRiskyChars(label)) return full;
    return `${arrow}|${quoteLabel(label)}|`;
  });
}

function repairSubgraphTitles(source) {
  return source.replace(/^(\s*subgraph\s+)([^\n[]+)$/gm, (full, prefix, title) => {
    if (!hasRiskyChars(title)) return full;
    return `${prefix}${quoteLabel(title)}`;
  });
}

const OPENERS = { '(': ')', '[': ']', '{': '}' };
const CLOSERS = { ')': '(', ']': '[', '}': '{' };

function repairUnclosedDelimitersLine(line, maxAutoClose = 10) {
  const stack = [];
  let inQuote = false;
  const positions = [];
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (inQuote) continue;
    if (OPENERS[ch]) { stack.push(ch); positions.push(i); }
    else if (CLOSERS[ch]) {
      if (stack.length && stack[stack.length - 1] === CLOSERS[ch]) { stack.pop(); positions.pop(); }
    }
  }
  if (!stack.length) return line;
  if (stack.length <= maxAutoClose) {
    return line + stack.map(o => OPENERS[o]).reverse().join('');
  }
  return line.slice(0, positions[0]);
}

function repairUnclosedDelimiters(source) {
  return source.split('\n').map(l => repairUnclosedDelimitersLine(l)).join('\n');
}

function normalizeLiteralNewlines(source) {
  return source.replace(/\\r\\n|\\n|\\r/g, '<br/>');
}

export function repairMermaid(source) {
  let out = normalizeLiteralNewlines(source);
  out = repairUnclosedDelimiters(out);
  out = repairSubgraphTitles(out);
  out = repairMermaidNodeShapes(out);
  out = repairMermaidEdgeLabels(out);
  return out;
}

export function lintMermaid(source) {
  const errors = [];
  const firstLine = source.split('\n').find(l => l.trim())?.trim() || '';
  if (!KNOWN_HEADERS.test(firstLine)) {
    errors.push(`unknown or missing diagram header: "${firstLine}"`);
  }

  const stack = [];
  let inQuote = false;
  for (const line of source.split('\n')) {
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (inQuote) continue;
      if (OPENERS[ch]) stack.push(ch);
      else if (CLOSERS[ch]) {
        if (stack.length && stack[stack.length - 1] === CLOSERS[ch]) stack.pop();
        else errors.push(`unbalanced delimiter near "${ch}"`);
      }
    }
  }
  if (stack.length) errors.push(`unclosed delimiter(s): ${stack.join('')}`);

  if (/\\n|\\r/.test(source)) errors.push('contains literal \\n/\\r escape sequence');
  if (/;/.test(source)) errors.push('contains ";" (Mermaid statement separator — breaks parsing)');
  if (/\bclick\s+\S+\s+(javascript:|vbscript:)/i.test(source)) {
    errors.push('contains an unsafe click directive (javascript:/vbscript:)');
  }

  if (/^sequenceDiagram/.test(firstLine)) {
    for (const line of source.split('\n')) {
      if (/<[^>]+>/.test(line)) errors.push('sequence diagram line contains angle brackets');
      const participant = line.trim().match(/^participant\s+([A-Za-z][\w-]*)\b/);
      if (participant && RESERVED_SEQUENCE_IDS.has(participant[1].toLowerCase())) {
        errors.push(`participant id "${participant[1]}" is a reserved keyword`);
      }
    }
  }

  return errors;
}

// ---- Markdown tables ----

function splitTableRow(line) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map(c => c.trim());
}

export function isValidMarkdownTable(lines) {
  if (lines.length < 2) return false;
  const header = splitTableRow(lines[0]);
  const sep = lines[1].trim();
  const sepOk = /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/.test(sep);
  if (!sepOk) return false;
  const sepCols = splitTableRow(lines[1]).length;
  if (sepCols !== header.length) return false;
  return lines.slice(2).every(l => splitTableRow(l).length === header.length);
}

export function repairMarkdownTable(block) {
  const lines = block.split('\n').filter(l => l.trim().length);
  if (lines.length < 1) return block;

  const normalized = lines.map(l => {
    let t = l.trim();
    if (!t.startsWith('|')) t = `| ${t}`;
    if (!t.endsWith('|')) t = `${t} |`;
    return t;
  });

  const header = splitTableRow(normalized[0]);
  const colCount = header.length;

  const hasSep = normalized[1] && /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/.test(normalized[1].trim());
  const sepRow = `| ${Array(colCount).fill('---').join(' | ')} |`;
  const body = hasSep ? normalized.slice(2) : normalized.slice(1);

  const fixedBody = body.map(rowLine => {
    const cells = splitTableRow(rowLine);
    while (cells.length < colCount) cells.push('');
    if (cells.length > colCount) cells.length = colCount;
    return `| ${cells.join(' | ')} |`;
  });

  return [normalized[0], sepRow, ...fixedBody].join('\n');
}

// ---- ASCII wireframes ----

export function looksLikeWireframe(block) {
  const lines = block.split('\n').filter(l => l.trim().length);
  if (lines.length < 2) return false;
  const structuralChars = (block.match(/[┌┐└┘│─├┤┬┴┼+\-|]/g) || []).length;
  return structuralChars >= 4;
}

// ---- CLI ----

function extractFences(markdown, lang) {
  const re = new RegExp('```' + lang + '\\s*\\n([\\s\\S]*?)```', 'g');
  return [...markdown.matchAll(re)];
}

function extractTables(markdown) {
  const lines = markdown.split('\n');
  const tables = [];
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const isRow = lines[i].includes('|') && lines[i].trim().length > 0;
    if (isRow && start === -1) start = i;
    if (!isRow && start !== -1) {
      if (i - start >= 2) tables.push({ start, end: i, text: lines.slice(start, i).join('\n') });
      start = -1;
    }
  }
  if (start !== -1 && lines.length - start >= 2) {
    tables.push({ start, end: lines.length, text: lines.slice(start).join('\n') });
  }
  return tables;
}

async function main() {
  const args = process.argv.slice(2);
  const fix = args.includes('--fix');
  const files = args.filter(a => a !== '--fix');
  if (!files.length) {
    console.error('usage: node scripts/md-repair.mjs <markdown...> [--fix]');
    process.exit(2);
  }

  let failed = false;

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let text = fs.readFileSync(file, 'utf8');
    let changed = false;

    for (const match of extractFences(text, 'mermaid')) {
      const original = match[1];
      const repaired = repairMermaid(original);
      const errors = lintMermaid(repaired);
      if (errors.length) {
        failed = true;
        console.error(`${file}: mermaid block still invalid after repair:`);
        errors.forEach(e => console.error(`  - ${e}`));
      } else if (repaired !== original) {
        console.log(`${file}: mermaid block repaired`);
      }
      if (fix && repaired !== original) {
        text = text.replace(original, repaired);
        changed = true;
      }
    }

    for (const table of extractTables(text)) {
      const lines = table.text.split('\n');
      if (isValidMarkdownTable(lines)) continue;
      const repaired = repairMarkdownTable(table.text);
      const stillBad = !isValidMarkdownTable(repaired.split('\n'));
      if (stillBad) {
        failed = true;
        console.error(`${file}: table at line ${table.start + 1} still invalid after repair`);
      } else {
        console.log(`${file}: table at line ${table.start + 1} repaired`);
        if (fix) { text = text.replace(table.text, repaired); changed = true; }
      }
    }

    if (fix && changed) {
      fs.writeFileSync(file, text);
      console.log(`${file}: wrote repairs`);
    }
  }

  if (failed) process.exit(1);
  console.log('md-repair OK');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
