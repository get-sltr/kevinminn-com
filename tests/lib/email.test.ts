import { describe, expect, it } from 'vitest';
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

describe('Chapter One email', () => {
  it('uses the agreed subject', () => {
    expect(SUBJECT).toBe('Chapter One of Remember My Name');
  });

  it('says thank you, offers the chapter, and closes with the line', () => {
    const text = confirmationText(links);
    expect(text).toContain('Thank you for signing up. Click below and Chapter One is yours.');
    expect(text).toContain(`Read Chapter One: ${links.confirmUrl}`);
    expect(text).toContain(
      'Always be the best authentic version of yourself. Be bold. Be relentless. Be you.'
    );
    const html = confirmationHtml(links);
    expect(html).toContain(`href="${links.confirmUrl}"`);
    expect(html).toContain('>Read Chapter One</a>');
    expect(html).toContain('Be relentless. Be you.');
  });

  it('keeps the order: intro, button, closing, footer', () => {
    for (const body of [confirmationText(links), confirmationHtml(links)]) {
      const intro = body.indexOf('Thank you for signing up.');
      const button = body.indexOf('Read Chapter One');
      const closing = body.indexOf('Always be the best');
      const unsubscribe = body.indexOf(links.unsubscribeUrl);
      const address = body.indexOf(MAILING_ADDRESS);
      expect(intro).toBeGreaterThan(-1);
      expect(button).toBeGreaterThan(intro);
      expect(closing).toBeGreaterThan(button);
      expect(unsubscribe).toBeGreaterThan(closing);
      expect(address).toBeGreaterThan(closing);
    }
  });

  it('carries an unsubscribe link and the postal address, as CAN-SPAM requires', () => {
    expect(MAILING_ADDRESS).toBe('696 S New Hampshire Ave, Apt 2811, Los Angeles, CA 90005');
    expect(confirmationText(links)).toContain(`Unsubscribe: ${links.unsubscribeUrl}`);
    expect(confirmationText(links)).toContain(MAILING_ADDRESS);
    expect(confirmationHtml(links)).toContain(`href="${links.unsubscribeUrl}"`);
    expect(confirmationHtml(links)).toContain(MAILING_ADDRESS);
  });

  it('holds no em dashes, per the standing copy rule', () => {
    expect(confirmationText(links)).not.toMatch(/\u2014|&mdash;/);
    expect(confirmationHtml(links)).not.toMatch(/\u2014|&mdash;/);
  });

  it('sends from a real person with replies routed to a live mailbox', () => {
    expect(FROM).toBe('Kevin Minn <hello@kevinminn.com>');
    expect(REPLY_TO).toBe('info@kevinminn.com');
  });

  it('embeds no remote assets, which mail clients block by default', () => {
    const html = confirmationHtml(links);
    expect(html).not.toMatch(/<img/i);
    expect(html).not.toMatch(/src=/i);
    expect(html).not.toMatch(/url\(/i);
  });

  it('escapes the links, since they are built from the request', () => {
    const html = confirmationHtml({
      confirmUrl: 'https://x.test/"><script>alert(1)</script>',
      unsubscribeUrl: 'https://x.test/u',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
  });

  it('reports not_configured instead of throwing when the key is absent', async () => {
    await expect(sendConfirmation('reader@example.com', links, undefined)).resolves.toEqual({
      sent: false,
      error: 'not_configured',
    });
  });
});
