import { describe, expect, it } from 'vitest';
import { CHAPTER_TEXT_KEY, loadChapter, parseChapter } from '../../src/lib/chapter';
import { fakeBucket } from './fake-bucket';

const valid = { label: 'Chapter One', title: 'The Boy in the Corner', paragraphs: ['One.', 'Two.'] };

describe('chapter text', () => {
  it('lives in R2 under private/, never in the public repo', () => {
    expect(CHAPTER_TEXT_KEY).toBe('private/chapter-one.json');
  });

  it('parses a well formed chapter', () => {
    expect(parseChapter(JSON.stringify(valid))).toEqual(valid);
  });

  it('rejects malformed or empty chapters so the email falls back to a link', () => {
    expect(parseChapter('not json')).toBeNull();
    expect(parseChapter(JSON.stringify({ ...valid, paragraphs: [] }))).toBeNull();
    expect(parseChapter(JSON.stringify({ ...valid, paragraphs: [1, 2] }))).toBeNull();
    expect(parseChapter(JSON.stringify({ title: 'x', paragraphs: ['a'] }))).toBeNull();
  });

  it('loads from the bucket, or returns null when the object is missing', async () => {
    const { bucket, store } = fakeBucket();
    expect(await loadChapter(bucket)).toBeNull();
    store.set(CHAPTER_TEXT_KEY, JSON.stringify(valid));
    expect(await loadChapter(bucket)).toEqual(valid);
  });
});
