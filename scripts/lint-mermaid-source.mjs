import fs from 'node:fs';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node scripts/lint-mermaid-source.mjs <markdown...>');
  process.exit(2);
}

let failed = false;
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const blocks = [...text.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)];
  blocks.forEach((match, index) => lintBlock(file, index + 1, match[1]));
}

if (failed) process.exit(1);
console.log('Mermaid source lint OK');

function lintBlock(file, index, source) {
  const lines = source.split('\n');
  const kind = lines.find(line => line.trim())?.trim() || '';
  if (/^flowchart\b/.test(kind)) lintFlowchart(file, index, lines);
  if (/^sequenceDiagram\b/.test(kind)) lintSequence(file, index, lines);
}

function lintFlowchart(file, index, lines) {
  lines.forEach((line, offset) => {
    const loc = `${file}:mermaid${index}:${offset + 1}`;
    if (/<br\s*\/?>/i.test(line)) fail(loc, 'flowchart label uses HTML break; use a plain short label');
    if (/<[^>]+>/.test(line)) fail(loc, 'flowchart label contains angle brackets');
    const labels = [...line.matchAll(/[\[{]([^\]}]*)[\]}]/g)].map(m => m[1]);
    labels.forEach(label => {
      if (/[()[\]]/.test(label)) fail(loc, `flowchart label contains risky bracket or paren: ${label}`);
    });
  });
}

function lintSequence(file, index, lines) {
  const reserved = /^(loop|alt|opt|par|and|end|note|rect|activate|deactivate|break|critical|box|actor|participant)$/i;
  lines.forEach((line, offset) => {
    const loc = `${file}:mermaid${index}:${offset + 1}`;
    if (/<[^>]+>/.test(line)) fail(loc, 'sequence diagram contains angle brackets');
    const participant = line.trim().match(/^participant\s+([A-Za-z][\w-]*)\b/);
    if (participant && reserved.test(participant[1])) {
      fail(loc, `sequence participant id "${participant[1]}" is a reserved keyword; use a neutral id with an "as" label`);
    }
  });
}

function fail(loc, message) {
  failed = true;
  console.error(`${loc}: ${message}`);
}
