import { describe, it, expect } from 'vitest';
import { deflateRawSync } from 'node:zlib';
import { openZip } from '../../../src/lib/vault/zip';

// Builds a zip by hand so the test needs no archiver. Each file is stored or deflated.
function buildZip(files: Array<{ name: string; data: string; deflate?: boolean }>): ArrayBuffer {
  const enc = new TextEncoder();
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const f of files) {
    const name = enc.encode(f.name);
    const raw = Buffer.from(enc.encode(f.data));
    const body = f.deflate ? deflateRawSync(raw) : raw;
    const method = f.deflate ? 8 : 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, Buffer.from(name), body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, Buffer.from(name));

    offset += 30 + name.length + body.length;
  }

  const dir = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(dir.length, 12);
  eocd.writeUInt32LE(offset, 16);

  const all = Buffer.concat([...locals, dir, eocd]);
  return all.buffer.slice(all.byteOffset, all.byteOffset + all.length) as ArrayBuffer;
}

const text = (bytes: Uint8Array | null) => (bytes ? new TextDecoder().decode(bytes) : null);

describe('openZip', () => {
  it('lists entries and reads stored and deflated files', async () => {
    const zip = openZip(
      buildZip([
        { name: 'word/document.xml', data: '<w:document>hello</w:document>'.repeat(20), deflate: true },
        { name: 'plain.txt', data: 'stored as is' },
      ]),
    );
    expect(zip.names).toEqual(['word/document.xml', 'plain.txt']);
    expect(text(await zip.read('word/document.xml'))).toBe('<w:document>hello</w:document>'.repeat(20));
    expect(text(await zip.read('plain.txt'))).toBe('stored as is');
  });

  it('decodes UTF-8 names and content', async () => {
    const zip = openZip(buildZip([{ name: 'média/naïve.txt', data: 'café', deflate: true }]));
    expect(text(await zip.read('média/naïve.txt'))).toBe('café');
  });

  it('returns null for a missing entry', async () => {
    const zip = openZip(buildZip([{ name: 'a.txt', data: 'a' }]));
    expect(await zip.read('b.txt')).toBeNull();
  });

  it('rejects data that is not a zip', () => {
    expect(() => openZip(new TextEncoder().encode('not a zip at all, just text').buffer)).toThrow();
    expect(() => openZip(new ArrayBuffer(4))).toThrow();
  });

  it('rejects a directory that points outside the data', () => {
    const buf = buildZip([{ name: 'a.txt', data: 'a' }]);
    const view = new DataView(buf);
    view.setUint32(buf.byteLength - 22 + 16, buf.byteLength + 100, true);
    expect(() => openZip(buf)).toThrow();
  });
});
