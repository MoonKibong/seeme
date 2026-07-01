import fs from 'node:fs';

const [mermaidModule, ...files] = process.argv.slice(2);
if (!mermaidModule || !files.length) {
  console.error('usage: node scripts/check-mermaid-runtime.mjs <mermaid-esm-path> <markdown...>');
  process.exit(2);
}

const mermaid = (await import(mermaidModule)).default;
let failed = false;

for (const file of files) {
  const blocks = extractMermaid(fs.readFileSync(file, 'utf8'));
  for (const [i, src] of blocks.entries()) {
    try {
      await mermaid.parse(src);
      console.log(`${file}:mermaid${i + 1}: runtime parse OK`);
    } catch (err) {
      failed = true;
      console.error(`${file}:mermaid${i + 1}: runtime parse FAILED`);
      console.error(err.message || err);
      if (err.hash) console.error(JSON.stringify(err.hash));
    }
  }
}

if (failed) process.exit(1);

function extractMermaid(markdown) {
  const blocks = [];
  let inBlock = false;
  let current = [];
  for (const line of markdown.split('\n')) {
    if (!inBlock && line.trim() === '```mermaid') {
      inBlock = true;
      current = [];
    } else if (inBlock && line.trim() === '```') {
      blocks.push(current.join('\n'));
      inBlock = false;
    } else if (inBlock) {
      current.push(line);
    }
  }
  return blocks;
}
