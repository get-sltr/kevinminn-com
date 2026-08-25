// @astrojs/cloudflare 14 still emits `legacy_env` into the generated
// dist/server/wrangler.json. Wrangler 4 removed that field and hard-errors on
// it, so every `wrangler deploy` fails until it is stripped. Removing it does
// not change deployment behaviour: `legacy_env = true` was the old default.
// Delete this step once the adapter stops emitting the field.

import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('../dist/server/wrangler.json', import.meta.url);

try {
  const config = JSON.parse(await readFile(path, 'utf8'));
  if (config.legacy_env === undefined) {
    console.log('[postbuild] wrangler.json already clean');
  } else {
    delete config.legacy_env;
    await writeFile(path, JSON.stringify(config, null, 2));
    console.log('[postbuild] removed legacy_env from wrangler.json');
  }
} catch (err) {
  if (err.code === 'ENOENT') {
    console.log('[postbuild] no dist/server/wrangler.json, nothing to do');
  } else {
    throw err;
  }
}
