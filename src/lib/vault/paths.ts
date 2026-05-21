export function sanitizePath(path: string): string | null {
  if (!path) return null;

  let clean = path.replace(/\/+/g, '/').replace(/^\//, '').replace(/\/$/, '');

  if (!clean) return null;

  const segments = clean.split('/');
  if (segments.some((s) => s === '..' || s === '.')) return null;

  return clean;
}

export function isValidFilename(name: string): boolean {
  if (!name || name === '.' || name === '..') return false;
  return !name.includes('/');
}

export function parseFolderPrefix(prefix: string | undefined): string {
  if (!prefix) return '';
  const clean = prefix.replace(/\/+$/, '');
  return clean ? clean + '/' : '';
}
