// A minimal zip reader for the vault's .docx preview. It reads the central directory
// and inflates single entries with the platform's DecompressionStream, so it adds no
// dependency. Stored (0) and deflate (8) are the only methods Office writes.

export interface ZipArchive {
  names: string[];
  read(name: string): Promise<Uint8Array<ArrayBuffer> | null>;
}

interface Entry {
  method: number;
  compSize: number;
  localOffset: number;
}

const EOCD_SIG = 0x06054b50;
const CENTRAL_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;

export function openZip(data: ArrayBuffer): ZipArchive {
  const view = new DataView(data);

  // The end-of-central-directory record is 22 bytes plus a comment of up to 64 KB.
  let eocd = -1;
  const floor = Math.max(0, data.byteLength - 22 - 0xffff);
  for (let i = data.byteLength - 22; i >= floor; i--) {
    if (view.getUint32(i, true) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Not a zip archive');

  const count = view.getUint16(eocd + 10, true);
  let ptr = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries = new Map<string, Entry>();

  for (let n = 0; n < count; n++) {
    if (ptr + 46 > data.byteLength || view.getUint32(ptr, true) !== CENTRAL_SIG) {
      throw new Error('Corrupt zip directory');
    }
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const name = decoder.decode(new Uint8Array(data, ptr + 46, nameLen));
    entries.set(name, {
      method: view.getUint16(ptr + 10, true),
      compSize: view.getUint32(ptr + 20, true),
      localOffset: view.getUint32(ptr + 42, true),
    });
    ptr += 46 + nameLen + extraLen + commentLen;
  }

  return {
    names: [...entries.keys()],
    async read(name) {
      const entry = entries.get(name);
      if (!entry) return null;

      const lo = entry.localOffset;
      if (lo + 30 > data.byteLength || view.getUint32(lo, true) !== LOCAL_SIG) {
        throw new Error('Corrupt zip entry');
      }
      const start = lo + 30 + view.getUint16(lo + 26, true) + view.getUint16(lo + 28, true);
      if (start + entry.compSize > data.byteLength) throw new Error('Corrupt zip entry');

      const raw = new Uint8Array(data, start, entry.compSize);
      if (entry.method === 0) return raw.slice();
      if (entry.method !== 8) throw new Error(`Unsupported zip method ${entry.method}`);

      const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    },
  };
}
