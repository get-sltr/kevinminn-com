import { describe, expect, it } from 'vitest';
import {
  confirmationHtml,
  confirmationText,
  firstName,
  sendConfirmation,
  FROM,
  REPLY_TO,
} from '../../src/lib/email';

describe('confirmation email', () => {
  it('says thank you and closes with the line', () => {
    const text = confirmationText();
    expect(text).toContain("You're on the list.");
    expect(text).toContain('Thank you for your support.');
    expect(text).toContain(
      'Always be the best authentic version of yourself. Be bold. Be relentless. Be you.'
    );
    expect(text).toContain('To unsubscribe, just reply to this email and say so.');
    expect(confirmationHtml()).toContain('Be relentless. Be you.');
  });

  it('carries the consent notice so the record matches what was agreed to', () => {
    expect(confirmationText()).toContain('never sold, rented, or shared');
    expect(confirmationHtml()).toContain('never sold, rented, or shared');
  });

  it('holds no em dashes, per the standing copy rule', () => {
    expect(confirmationText()).not.toMatch(/—|&mdash;/);
    expect(confirmationHtml()).not.toMatch(/—|&mdash;/);
  });

  it('sends from a real person with replies routed to a live mailbox', () => {
    expect(FROM).toBe('Kevin Minn <hello@kevinminn.com>');
    expect(REPLY_TO).toBe('info@kevinminn.com');
  });

  it('embeds no remote assets, which mail clients block by default', () => {
    expect(confirmationHtml()).not.toMatch(/<img/i);
    expect(confirmationHtml()).not.toMatch(/https?:\/\//);
  });

  it('reports not_configured instead of throwing when the key is absent', async () => {
    await expect(sendConfirmation('reader@example.com', 'Ada', undefined)).resolves.toEqual({
      sent: false,
      error: 'not_configured',
    });
  });

  it('greets by first name only', () => {
    expect(firstName('Ada Lovelace')).toBe('Ada');
    expect(confirmationText('Ada Lovelace')).toContain("You're on the list, Ada.");
    expect(confirmationHtml('Ada Lovelace')).toContain('on the list, Ada.');
  });

  it('falls back cleanly when no name is given', () => {
    expect(confirmationText()).toContain("You're on the list.");
    expect(confirmationText('')).not.toContain(', .');
    expect(confirmationHtml()).toContain('on the list.');
  });

  it('escapes the name, since it is visitor input landing in HTML', () => {
    const html = confirmationHtml('<script>alert(1)</script>');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('caps an absurdly long name so it cannot wreck the layout', () => {
    expect(firstName('A'.repeat(300)).length).toBe(40);
  });
});
