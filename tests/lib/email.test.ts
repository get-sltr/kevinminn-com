import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/lib/chapter';
import {
  confirmationHtml,
  confirmationText,
  sendConfirmation,
  FROM,
  MAILING_ADDRESS,
  REPLY_TO,
  SUBJECT,
} from '../../src/lib/email';

const links = {
  confirmUrl: 'https://kevinminn.com/api/confirm?token=abc',
  unsubscribeUrl: 'https://kevinminn.com/api/unsubscribe?token=abc',
};

const chapter: Chapter = {
  label: 'Chapter One',
  title: 'The Boy in the Corner',
  paragraphs: ['First paragraph of the chapter.', "Second paragraph, with an aunt's longyi."],
};

const CLOSING = 'Always be the best authentic version of yourself. Be bold. Be relentless. Be you.';

describe('Chapter One email', () => {
  it('uses the agreed subject', () => {
    expect(SUBJECT).toBe('Chapter One of Remember My Name');
  });

  it('carries the whole chapter in the body, in order', () => {
    for (const body of [confirmationText(links, chapter), confirmationHtml(links, chapter)]) {
      const steps = [
        'Thank you for being here. As promised, here is Chapter One.',
        'The Boy in the Corner',
        'First paragraph of the chapter.',
        'Second paragraph',
        'November 9, 2026',
        'Reply to this email and tell me what stayed with you.',
        CLOSING,
        'Kevin',
        links.confirmUrl,
        links.unsubscribeUrl,
        MAILING_ADDRESS,
      ];
      let last = -1;
      for (const step of steps) {
        const at = body.indexOf(step, last + 1);
        expect(at, step).toBeGreaterThan(last);
        last = at;
      }
    }
    expect(confirmationText(links, chapter)).toContain('Remember My Name releases November 9, 2026.');
  });

  it('offers the PDF as a small link, not a button, when the chapter is inline', () => {
    const html = confirmationHtml(links, chapter);
    expect(html).toContain('Prefer a PDF?');
    expect(html).toContain('Read Chapter One as a PDF</a>');
    expect(html).not.toContain('>Read Chapter One</a>');
  });

  it('falls back to the Read Chapter One button when the chapter text is unavailable', () => {
    const html = confirmationHtml(links, null);
    expect(html).toContain(`href="${links.confirmUrl}"`);
    expect(html).toContain('>Read Chapter One</a>');
    expect(html).toContain('November 9, 2026');
    expect(confirmationText(links, null)).toContain(`Read Chapter One: ${links.confirmUrl}`);
  });

  it('carries an unsubscribe link and the mailing address', () => {
    expect(MAILING_ADDRESS).toBe('Los Angeles, CA');
    for (const c of [chapter, null]) {
      expect(confirmationText(links, c)).toContain(`Unsubscribe: ${links.unsubscribeUrl}`);
      expect(confirmationHtml(links, c)).toContain(`href="${links.unsubscribeUrl}"`);
      expect(confirmationHtml(links, c)).toContain(MAILING_ADDRESS);
    }
  });

  it('holds no em dashes, per the standing copy rule', () => {
    for (const c of [chapter, null]) {
      expect(confirmationText(links, c)).not.toMatch(/\u2014|&mdash;/);
      expect(confirmationHtml(links, c)).not.toMatch(/\u2014|&mdash;/);
    }
  });

  it('sends from a real person with replies routed to a live mailbox', () => {
    expect(FROM).toBe('Kevin Minn <hello@kevinminn.com>');
    expect(REPLY_TO).toBe('info@kevinminn.com');
  });

  it('embeds no remote assets, which mail clients block by default', () => {
    const html = confirmationHtml(links, chapter);
    expect(html).not.toMatch(/<img/i);
    expect(html).not.toMatch(/src=/i);
    expect(html).not.toMatch(/url\(/i);
  });

  it('escapes links and chapter text before they land in HTML', () => {
    const html = confirmationHtml(
      { confirmUrl: 'https://x.test/"><script>alert(1)</script>', unsubscribeUrl: 'https://x.test/u' },
      { label: 'L', title: '<b>T</b>', paragraphs: ['<script>alert(2)</script>'] }
    );
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>T</b>');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
  });

  it('reports not_configured instead of throwing when the key is absent', async () => {
    await expect(sendConfirmation('reader@example.com', links, chapter, undefined)).resolves.toEqual({
      sent: false,
      error: 'not_configured',
    });
  });
});
