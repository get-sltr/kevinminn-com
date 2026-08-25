// Confirmation email via Resend's REST API.
// Deliberately plain fetch rather than the resend npm package, so this adds no
// dependency. The builders below are pure so they can be tested without network.

import { CONSENT_TEXT } from './consent';

export const FROM = 'Kevin Minn <hello@kevinminn.com>';
export const REPLY_TO = 'info@kevinminn.com';
export const SUBJECT = "You're on the list";

const THANKS = 'Thank you for your support. The next time you hear from me, the book will have a date.';

// Kevin's line, used as written.
const CLOSING = 'Always be the best authentic version of yourself. Be bold. Be relentless. Be you.';

export function confirmationText(): string {
  return [
    'REMEMBER MY NAME',
    '',
    "You're on the list.",
    '',
    THANKS,
    '',
    CLOSING,
    '',
    'Kevin',
    '',
    '---',
    'To unsubscribe, just reply to this email and say so.',
    '',
    CONSENT_TEXT,
  ].join('\n');
}

export function confirmationHtml(): string {
  // Inline styles only, and no external assets. Mail clients strip stylesheets
  // and most block remote images by default.
  return `<div style="margin:0;padding:32px 16px;background:#f4efe6;">
  <div style="max-width:480px;margin:0 auto;background:#fbf8f3;border:1px solid #e8e1d2;border-radius:4px;padding:40px 32px;">
    <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:#b4543e;">
      Remember My Name
    </div>
    <p style="margin:24px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:#1c1a17;">
      You&rsquo;re on the list.
    </p>
    <p style="margin:16px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.55;color:#4a453d;">
      ${THANKS}
    </p>
    <p style="margin:26px 0 0;padding-left:16px;border-left:2px solid #b4543e;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:18px;line-height:1.6;color:#1c1a17;">
      ${CLOSING}
    </p>
    <p style="margin:28px 0 0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:17px;color:#1c1a17;">
      Kevin
    </p>
    <div style="margin-top:32px;padding-top:18px;border-top:1px solid #e8e1d2;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.7;color:#8a8479;">
      To unsubscribe, just reply to this email and say so.
      <br /><br />
      ${CONSENT_TEXT}
    </div>
  </div>
</div>`;
}

export type SendResult = { sent: boolean; error?: string };

export async function sendConfirmation(to: string, apiKey?: string): Promise<SendResult> {
  if (!apiKey) return { sent: false, error: 'not_configured' };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to,
      reply_to: REPLY_TO,
      subject: SUBJECT,
      html: confirmationHtml(),
      text: confirmationText(),
    }),
    // Bound the call so a hanging mail API cannot stall the request.
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) return { sent: false, error: `resend_${res.status}` };
  return { sent: true };
}
