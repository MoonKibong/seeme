import fs from 'node:fs';
import vm from 'node:vm';

export function renderTemplate(markdown) {
  const templatePath = new URL('../skills/seeme/assets/render-template.html', import.meta.url);
  const template = fs.readFileSync(templatePath, 'utf8');
  const scriptMatch = template.match(/<script>\n([\s\S]*?)\n<\/script>\s*<\/body>/);
  if (!scriptMatch) throw new Error('render template inline script not found');

  const source = new Element('script');
  source.id = 'seeme-src';
  source.textContent = markdown;
  const content = new Element('div');
  content.id = 'content';
  const root = new Element('root');
  root.append(source, content);

  const document = {
    createElement: tag => new Element(tag),
    createTextNode: text => new TextNode(text),
    getElementById: id => findById(root, id),
    querySelectorAll: selector => queryAll(root, selector)
  };

  const script = scriptMatch[1].replace(
    /import\('https:\/\/cdn\.jsdelivr\.net\/npm\/mermaid[^']+'\)/,
    'new Promise(() => {})'
  );

  let threw = null;
  try {
    vm.runInNewContext(script, {
      document,
      console,
      marked: undefined,
      Promise,
      Error,
      setTimeout,
      clearTimeout
    });
  } catch (err) {
    threw = err;
  }

  return { document, content, threw };
}

export function count(document, selector) {
  return document.querySelectorAll(selector).length;
}

export function windows(document) {
  return document.querySelectorAll('.window').map(w => ({
    title: w.querySelector('.t')?.textContent || '',
    screen: !!w.querySelector('.screen-grid'),
    terminal: !!w.querySelector('pre.terminal-body'),
    text: w.textContent.replace(/\s+/g, ' ').trim()
  }));
}

class Element {
  constructor(tagName) {
    this.tagName = tagName.toLowerCase();
    this.children = [];
    this.parentNode = null;
    this.className = '';
    this.dataset = {};
    this.style = {};
    this.id = '';
    this._text = '';
    this.classList = {
      add: (...names) => {
        const current = new Set(this.className.split(/\s+/).filter(Boolean));
        names.forEach(name => current.add(name));
        this.className = [...current].join(' ');
      }
    };
  }
  append(...nodes) {
    nodes.forEach(node => this.appendChild(typeof node === 'string' ? new TextNode(node) : node));
  }
  appendChild(node) {
    node.parentNode = this;
    this.children.push(node);
    return node;
  }
  insertBefore(node, ref) {
    node.parentNode = this;
    const i = this.children.indexOf(ref);
    if (i < 0) this.children.push(node);
    else this.children.splice(i, 0, node);
    return node;
  }
  replaceWith(node) {
    if (!this.parentNode) return;
    node.parentNode = this.parentNode;
    const i = this.parentNode.children.indexOf(this);
    if (i >= 0) this.parentNode.children.splice(i, 1, node);
    this.parentNode = null;
  }
  closest(selector) {
    let n = this;
    while (n) {
      if (matches(n, selector)) return n;
      n = n.parentNode;
    }
    return null;
  }
  querySelector(selector) {
    return queryAll(this, selector)[0] || null;
  }
  querySelectorAll(selector) {
    return queryAll(this, selector);
  }
  set textContent(value) {
    this._text = String(value);
    this.children = [];
  }
  get textContent() {
    return this._text + this.children.map(child => child.textContent).join('');
  }
  set innerHTML(html) {
    this._text = '';
    this.children = [];
    html.split('\n').forEach(line => {
      const m = line.match(/^<div class="seeme-block-src" data-idx="(\d+)"><\/div>$/);
      if (!m) return;
      const div = new Element('div');
      div.className = 'seeme-block-src';
      div.dataset.idx = m[1];
      this.appendChild(div);
    });
  }
  get innerHTML() {
    return this.children.map(child => child.textContent).join('');
  }
}

class TextNode extends Element {
  constructor(text) {
    super('#text');
    this._text = text;
  }
}

function matches(node, selector) {
  if (!(node instanceof Element)) return false;
  const tagClass = selector.match(/^([a-z0-9-]+)\.([a-z0-9_-]+)$/i);
  if (tagClass) {
    return node.tagName === tagClass[1].toLowerCase() &&
      node.className.split(/\s+/).includes(tagClass[2]);
  }
  if (selector.startsWith('.')) return node.className.split(/\s+/).includes(selector.slice(1));
  if (selector.startsWith('#')) return node.id === selector.slice(1);
  return node.tagName === selector.toLowerCase();
}

function walk(node, fn) {
  node.children.forEach(child => {
    fn(child);
    walk(child, fn);
  });
}

function queryAll(root, selector) {
  if (selector === '#content pre') {
    const content = root.id === 'content' ? root : findById(root, 'content');
    return content ? queryAll(content, 'pre') : [];
  }
  const found = [];
  walk(root, node => {
    if (matches(node, selector)) found.push(node);
  });
  return found;
}

function findById(root, id) {
  if (root.id === id) return root;
  let found = null;
  walk(root, node => {
    if (!found && node.id === id) found = node;
  });
  return found;
}
