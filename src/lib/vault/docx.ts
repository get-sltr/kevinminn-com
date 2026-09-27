// Renders a .docx into plain DOM for the vault viewer. Browser only: it relies on
// DOMParser, and every node it produces is built with createElement and text nodes,
// never innerHTML, so nothing inside a document can run script on this page.
// It is a reading preview (text, headings, emphasis, lists, tables, links, images),
// not a layout engine. Download the file for exact formatting.

import { openZip, type ZipArchive } from './zip';

export interface DocxPreview {
  node: HTMLElement;
  // Object URLs for embedded images. The caller revokes them when the preview goes.
  urls: string[];
}

interface Rel {
  target: string;
  external: boolean;
}

interface Ctx {
  zip: ZipArchive;
  rels: Map<string, Rel>;
  numbering: Map<string, string[]>;
  counters: Map<string, number[]>;
  urls: string[];
  pending: Promise<void>[];
}

const IMAGE_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
};

export async function renderDocx(data: ArrayBuffer): Promise<DocxPreview> {
  const zip = openZip(data);
  const docBytes = await zip.read('word/document.xml');
  if (!docBytes) throw new Error('Not a Word document');

  const ctx: Ctx = {
    zip,
    rels: await readRels(zip),
    numbering: await readNumbering(zip),
    counters: new Map(),
    urls: [],
    pending: [],
  };

  const root = document.createElement('div');
  root.className = 'vault__docx';
  const body = kid(parseXml(docBytes).documentElement, 'body');
  if (body) renderBlocks(body, root, ctx);
  await Promise.all(ctx.pending);
  return { node: root, urls: ctx.urls };
}

function parseXml(bytes: Uint8Array): Document {
  const doc = new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Unreadable document');
  return doc;
}

function kids(el: Element, name?: string): Element[] {
  return Array.from(el.children).filter((c) => !name || c.localName === name);
}

function kid(el: Element | null | undefined, name: string): Element | null {
  if (!el) return null;
  for (const c of Array.from(el.children)) if (c.localName === name) return c;
  return null;
}

// Attributes are namespaced (w:val, r:id, r:embed); matching on the local name is enough.
function attr(el: Element | null, name: string): string | null {
  if (!el) return null;
  for (const a of Array.from(el.attributes)) if (a.localName === name) return a.value;
  return null;
}

// <w:b/> means on; <w:b w:val="false"/> or <w:u w:val="none"/> means off.
function isOn(el: Element | null): boolean {
  if (!el) return false;
  const v = attr(el, 'val');
  return v === null || !['false', '0', 'none'].includes(v);
}

async function readRels(zip: ZipArchive): Promise<Map<string, Rel>> {
  const rels = new Map<string, Rel>();
  const bytes = await zip.read('word/_rels/document.xml.rels');
  if (!bytes) return rels;
  for (const r of kids(parseXml(bytes).documentElement)) {
    const id = r.getAttribute('Id');
    const target = r.getAttribute('Target');
    if (id && target) rels.set(id, { target, external: r.getAttribute('TargetMode') === 'External' });
  }
  return rels;
}

// numId -> list format per indent level ('bullet', 'decimal', 'lowerLetter', ...).
async function readNumbering(zip: ZipArchive): Promise<Map<string, string[]>> {
  const formats = new Map<string, string[]>();
  const bytes = await zip.read('word/numbering.xml');
  if (!bytes) return formats;
  const root = parseXml(bytes).documentElement;

  const abstract = new Map<string, string[]>();
  for (const a of kids(root, 'abstractNum')) {
    const levels: string[] = [];
    for (const lvl of kids(a, 'lvl')) {
      levels[Number(attr(lvl, 'ilvl') ?? 0)] = attr(kid(lvl, 'numFmt'), 'val') ?? 'decimal';
    }
    abstract.set(attr(a, 'abstractNumId') ?? '', levels);
  }
  for (const n of kids(root, 'num')) {
    const levels = abstract.get(attr(kid(n, 'abstractNumId'), 'val') ?? '');
    if (levels) formats.set(attr(n, 'numId') ?? '', levels);
  }
  return formats;
}

function renderBlocks(parent: Element, out: HTMLElement, ctx: Ctx) {
  for (const el of kids(parent)) {
    if (el.localName === 'p') out.appendChild(renderParagraph(el, ctx));
    else if (el.localName === 'tbl') out.appendChild(renderTable(el, ctx));
    else if (el.localName === 'sdt') {
      const content = kid(el, 'sdtContent');
      if (content) renderBlocks(content, out, ctx);
    }
  }
}

function renderParagraph(p: Element, ctx: Ctx): HTMLElement {
  const pPr = kid(p, 'pPr');
  const style = attr(kid(pPr, 'pStyle'), 'val') ?? '';
  const heading = /^heading\s?([1-6])$/i.exec(style);
  const tag = style.toLowerCase() === 'title' ? 'h1' : heading ? `h${heading[1]}` : 'p';
  const el = document.createElement(tag);

  const jc = attr(kid(pPr, 'jc'), 'val');
  if (jc === 'center') el.style.textAlign = 'center';
  else if (jc === 'right' || jc === 'end') el.style.textAlign = 'right';
  else if (jc === 'both') el.style.textAlign = 'justify';

  const numPr = kid(pPr, 'numPr');
  const numId = attr(kid(numPr, 'numId'), 'val');
  if (numId && numId !== '0') {
    const ilvl = Number(attr(kid(numPr, 'ilvl'), 'val') ?? 0);
    el.classList.add('vault__docx-li');
    el.style.paddingLeft = `${1.5 + ilvl * 1.5}em`;
    const marker = document.createElement('span');
    marker.className = 'vault__docx-marker';
    marker.textContent = listMarker(numId, ilvl, ctx);
    el.appendChild(marker);
  }

  renderInline(p, el, ctx);
  if (!el.textContent && !el.querySelector('img')) el.appendChild(document.createElement('br'));
  return el;
}

function listMarker(numId: string, ilvl: number, ctx: Ctx): string {
  const fmt = ctx.numbering.get(numId)?.[ilvl] ?? 'bullet';
  if (fmt === 'none') return '';
  if (fmt === 'bullet') return '•';
  const counts = ctx.counters.get(numId) ?? [];
  counts[ilvl] = (counts[ilvl] ?? 0) + 1;
  counts.length = ilvl + 1; // a new item at this level restarts every deeper level
  ctx.counters.set(numId, counts);
  return `${formatNumber(counts[ilvl], fmt)}.`;
}

function formatNumber(n: number, fmt: string): string {
  switch (fmt) {
    case 'lowerLetter':
      return String.fromCharCode(97 + ((n - 1) % 26)).repeat(Math.ceil(n / 26));
    case 'upperLetter':
      return String.fromCharCode(65 + ((n - 1) % 26)).repeat(Math.ceil(n / 26));
    case 'lowerRoman':
      return roman(n).toLowerCase();
    case 'upperRoman':
      return roman(n);
    default:
      return String(n);
  }
}

function roman(n: number): string {
  const table: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  for (const [value, numeral] of table) {
    while (n >= value) {
      out += numeral;
      n -= value;
    }
  }
  return out;
}

function renderInline(parent: Element, out: HTMLElement, ctx: Ctx) {
  for (const el of kids(parent)) {
    switch (el.localName) {
      case 'r':
        renderRun(el, out, ctx);
        break;
      case 'hyperlink': {
        const rel = ctx.rels.get(attr(el, 'id') ?? '');
        const href = rel?.external && /^(https?:|mailto:)/i.test(rel.target) ? rel.target : null;
        const link = document.createElement(href ? 'a' : 'span');
        link.className = 'vault__docx-link';
        if (href) {
          link.setAttribute('href', href);
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
        }
        renderInline(el, link, ctx);
        out.appendChild(link);
        break;
      }
      case 'ins':
      case 'smartTag':
      case 'fldSimple':
      case 'customXml':
        renderInline(el, out, ctx);
        break;
      case 'sdt': {
        const content = kid(el, 'sdtContent');
        if (content) renderInline(content, out, ctx);
        break;
      }
      // Deleted tracked changes (w:del) and everything else are skipped.
    }
  }
}

function renderRun(r: Element, out: HTMLElement, ctx: Ctx) {
  const rPr = kid(r, 'rPr');
  let target = out;
  const wrap = (tag: string) => {
    const el = document.createElement(tag);
    target.appendChild(el);
    target = el;
  };
  if (isOn(kid(rPr, 'b'))) wrap('strong');
  if (isOn(kid(rPr, 'i'))) wrap('em');
  if (isOn(kid(rPr, 'u'))) wrap('u');
  if (isOn(kid(rPr, 'strike')) || isOn(kid(rPr, 'dstrike'))) wrap('s');
  const va = attr(kid(rPr, 'vertAlign'), 'val');
  if (va === 'superscript') wrap('sup');
  else if (va === 'subscript') wrap('sub');

  // w:sz is in half-points. Many documents make titles big this way rather than with a
  // Heading style, so honour it, scaled so 12pt matches the preview's 15px body text.
  const halfPoints = Number(attr(kid(rPr, 'sz'), 'val'));
  if (halfPoints && Math.abs(halfPoints - 24) > 2) {
    wrap('span');
    target.style.fontSize = `${Math.min(40, Math.max(10, (halfPoints / 2) * 1.25))}px`;
    target.style.lineHeight = '1.3';
  }

  for (const c of kids(r)) {
    switch (c.localName) {
      case 't':
        target.appendChild(document.createTextNode(c.textContent ?? ''));
        break;
      case 'tab':
        target.appendChild(document.createTextNode('\t'));
        break;
      case 'br':
      case 'cr':
        target.appendChild(document.createElement('br'));
        break;
      case 'noBreakHyphen':
        target.appendChild(document.createTextNode('‑'));
        break;
      case 'drawing':
      case 'pict':
        renderImages(c, target, ctx);
        break;
    }
  }
}

function renderImages(el: Element, out: HTMLElement, ctx: Ctx) {
  for (const node of Array.from(el.getElementsByTagName('*'))) {
    const id =
      node.localName === 'blip' ? attr(node, 'embed') : node.localName === 'imagedata' ? attr(node, 'id') : null;
    const rel = id ? ctx.rels.get(id) : undefined;
    if (!rel || rel.external) continue;
    const part = resolvePart(rel.target);
    const type = IMAGE_TYPES[part.split('.').pop()?.toLowerCase() ?? ''];
    if (!type) continue; // EMF/WMF and friends: browsers cannot draw them

    const img = document.createElement('img');
    img.className = 'vault__docx-img';
    img.alt = '';
    out.appendChild(img);
    ctx.pending.push(
      ctx.zip.read(part).then((bytes) => {
        if (!bytes) {
          img.remove();
          return;
        }
        const url = URL.createObjectURL(new Blob([bytes], { type }));
        ctx.urls.push(url);
        img.src = url;
      }),
    );
  }
}

// Relationship targets are relative to word/, or absolute from the package root.
function resolvePart(target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  const parts = ['word'];
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg && seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

function renderTable(tbl: Element, ctx: Ctx): HTMLElement {
  const table = document.createElement('table');
  table.className = 'vault__docx-table';
  const tbody = table.createTBody();
  for (const tr of kids(tbl, 'tr')) {
    const row = tbody.insertRow();
    for (const tc of kids(tr, 'tc')) {
      const cell = row.insertCell();
      const span = Number(attr(kid(kid(tc, 'tcPr'), 'gridSpan'), 'val') ?? 1);
      if (span > 1) cell.colSpan = span;
      renderBlocks(tc, cell, ctx);
    }
  }
  return table;
}
