import { count, renderTemplate, windows } from './render-template-testlib.mjs';

const fixture = `# Render regression fixture

\`\`\`terminal title="Navigation map"
root
  chat
\`\`\`

\`\`\`wireframe title="Chat"
┌────┬──────────────────────────────────────────────────────────────┐
│ K  │ Conversation title                                           │
│    │ user: hello                                                  │
│CHAT│ Thinking...                                                  │
│    │ Evidence boundary - answered from 3 of 4 relevant sources    │
│    │ Answer text with inline citations [1] [2]                    │
│    │ Evidence gaps: none                                          │
│    │ Confidence 0.82                                              │
│    │ Sources grouped by document                                  │
│    │ Provenance lanes                                             │
│    │ [clip] Ask anything... [Send]                                │
│    │ filters docType dateFrom dateTo                              │
└────┴──────────────────────────────────────────────────────────────┘
\`\`\`

\`\`\`terminal title="CLI transcript"
┌────────────────────────────────────────────────────┐
│ Command output                                     │
│ Active sources: 12                                 │
│ Confidence policy: evidence required               │
│ [Sync] [Review]                                    │
└────────────────────────────────────────────────────┘
\`\`\`

\`\`\`screen title="Admin"
┌────────────────────────────────────────────────────┐
│ Admin overview                                     │
│ Active sources: 12                                 │
│ Confidence policy: evidence required               │
│ [Sync] [Review]                                    │
└────────────────────────────────────────────────────┘
\`\`\`

\`\`\`wireframe title="mistagged transcript"
┌─────────────────────────────────────────────────────────────┐
│  $ nini search "authentication logic"                       │
├─────────────────────────────────────────────────────────────┤
│  src/auth.rs:42       function  auth::verify_token  [name]  │
│  src/auth.rs:18       function  auth::check_session [fts]   │
│  src/middleware.rs:91 function  validate_bearer     [vector] │
├─────────────────────────────────────────────────────────────┤
│  Flags: --json  --limit N  --related  --repo <path>         │
└─────────────────────────────────────────────────────────────┘
\`\`\`

\`\`\`wireframe title="SQLite Schema"
┌──────────────────────────────────────────────────┐
│  files                nodes                      │
│  ┌──────────────┐     ┌────────────────────────┐ │
│  │ id  INTEGER  │──┐  │ id       INTEGER        │ │
│  │ path TEXT    │  └─>│ file_id  INTEGER FK     │ │
│  └──────────────┘     │ name     TEXT           │ │
│                       └─────────────────────────┘ │
└──────────────────────────────────────────────────┘
\`\`\`

\`\`\`mermaid
flowchart TD
  A[Start] --> B[Done]
\`\`\`
`;

const { document, content, threw } = renderTemplate(fixture);
if (threw) throw threw;

const wins = windows(document);
const win = title => wins.find(w => new RegExp(title, 'i').test(w.title));
const isScreen = title => !!win(title)?.screen;
const isTerminal = title => !!win(title)?.terminal;

const leftovers = count(document, '.seeme-block-src');
const mermaids = count(document, '.mermaid');
const screenGrids = count(document, '.screen-grid');
const terminalPres = count(document, 'pre.terminal-body');
const chatLayouts = count(document, '.chrome-layout');

if (leftovers !== 0) throw new Error(`expected 0 leftover placeholders, got ${leftovers}`);
if (mermaids !== 1) throw new Error(`expected 1 mermaid block, got ${mermaids}`);
if (chatLayouts !== 0) throw new Error(`expected no hardcoded chat layout, got ${chatLayouts}`);

// Genuine interactive screens redraw as sketch UI (even 'Chat' which is a wireframe tag).
if (!isScreen('Chat')) throw new Error('interactive chat wireframe should draw as a screen');
if (!isScreen('Admin')) throw new Error('admin screen should draw as a screen');

// Explicit terminal/console/tree tags stay faithful.
if (!isTerminal('Navigation map')) throw new Error('nav map should stay terminal');
if (!isTerminal('CLI transcript')) throw new Error('framed terminal should stay terminal');

// Regression: a command transcript or ER/schema diagram tagged 'wireframe' must render VERBATIM
// (faithful terminal card), not get mangled into synthetic nav/chat/composer UI.
if (isScreen('mistagged transcript')) throw new Error('mistagged transcript must not draw as a screen');
if (!isTerminal('mistagged transcript')) throw new Error('mistagged transcript should render faithfully');
if (isScreen('SQLite Schema')) throw new Error('ER schema must not draw as a screen');
if (!isTerminal('SQLite Schema')) throw new Error('ER schema should render faithfully');

if (screenGrids !== 2) throw new Error(`expected exactly 2 synthetic screen grids, got ${screenGrids}`);
if (terminalPres < 4) throw new Error(`expected >=4 faithful terminal pres, got ${terminalPres}`);

if (!content.textContent.includes('Command output')) throw new Error('framed terminal content was not preserved');
if (!content.textContent.includes('Admin overview')) throw new Error('screen UI content was not preserved');
if (!content.textContent.includes('$ nini search')) throw new Error('transcript content was not preserved verbatim');
if (!content.textContent.includes('file_id')) throw new Error('schema content was not preserved verbatim');

console.log(`render template regression OK: mermaid=${mermaids} screens=${screenGrids} terminalPres=${terminalPres} (verbatim transcript+schema preserved)`);
