import { describe, it, expect } from 'vitest';
import { sanitizePath, isValidFilename, parseFolderPrefix } from '../../../src/lib/vault/paths';

describe('sanitizePath', () => {
  it('passes through a clean path', () => {
    expect(sanitizePath('legal/contract.pdf')).toBe('legal/contract.pdf');
  });

  it('strips leading slashes', () => {
    expect(sanitizePath('/legal/contract.pdf')).toBe('legal/contract.pdf');
  });

  it('blocks directory traversal', () => {
    expect(sanitizePath('../etc/passwd')).toBeNull();
    expect(sanitizePath('legal/../../etc/passwd')).toBeNull();
    expect(sanitizePath('legal/../../../etc/passwd')).toBeNull();
  });

  it('collapses double slashes', () => {
    expect(sanitizePath('legal//contract.pdf')).toBe('legal/contract.pdf');
  });

  it('returns null for empty string', () => {
    expect(sanitizePath('')).toBeNull();
  });

  it('strips trailing slashes on file paths', () => {
    expect(sanitizePath('legal/contract.pdf/')).toBe('legal/contract.pdf');
  });

  it('handles root-level files', () => {
    expect(sanitizePath('readme.txt')).toBe('readme.txt');
  });
});

describe('isValidFilename', () => {
  it('accepts normal filenames', () => {
    expect(isValidFilename('contract.pdf')).toBe(true);
    expect(isValidFilename('my-file_v2.docx')).toBe(true);
  });

  it('rejects filenames with slashes', () => {
    expect(isValidFilename('path/file.pdf')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidFilename('')).toBe(false);
  });

  it('rejects dot-only names', () => {
    expect(isValidFilename('.')).toBe(false);
    expect(isValidFilename('..')).toBe(false);
  });
});

describe('parseFolderPrefix', () => {
  it('returns empty string for root', () => {
    expect(parseFolderPrefix('')).toBe('');
    expect(parseFolderPrefix(undefined)).toBe('');
  });

  it('ensures trailing slash', () => {
    expect(parseFolderPrefix('legal')).toBe('legal/');
    expect(parseFolderPrefix('legal/')).toBe('legal/');
  });

  it('handles nested folders', () => {
    expect(parseFolderPrefix('legal/contracts')).toBe('legal/contracts/');
  });
});
