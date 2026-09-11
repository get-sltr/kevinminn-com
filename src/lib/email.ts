// Chapter One email via Resend's REST API.
// Deliberately plain fetch rather than the resend npm package, so this adds no
// dependency. The builders below are pure so they can be tested without network.

export const FROM = 'Kevin Minn <hello@kevinminn.com>';
export const REPLY_TO = 'info@kevinminn.com';
export const SUBJECT = 'Chapter One of Remember My Name';

// CAN-SPAM requires a physical postal address in every commercial email.
export const MAILING_ADDRESS = '696 S New Hampshire Ave, Apt 2811, Los Angeles, CA 90005';

const INTRO = 'Thank you for signing up. Click below and Chapter One is yours.';
const BUTTON = 'Read Chapter One';

// Kevin's line, used as written.
const CLOSING = 'Always be the best authentic version of yourself. Be bold. Be relentless. Be you.';

export type EmailLinks = { confirmUrl: string; unsubscribeUrl: string };

/** Links are built from the request origin, so escape them before they land in HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function confirmationText(links: EmailLinks): string {
  return [
    'REMEMBER MY NAME',
    '',
    INTRO,
    '',
    `${BUTTON}: ${links.confirmUrl}`,
    '',
    CLOSING,
    '',
    'Kevin',
    '',
    '---',
    `Unsubscribe: ${links.unsubscribeUrl}`,
    MAILING_ADDRESS,
  ].join('\n');
}

export function confirmationHtml(links: EmailLinks): string {
  const confirm = escapeHtml(links.confirmUrl);
  const unsubscribe = escapeHtml(links.unsubscribeUrl);
  // Inline styles only, and no external assets. Mail clients strip stylesheets
  // and most block remote images by default.
  return `<div style="margin:0;padding:32px 16px;background:#f4efe6;">
  <div style="max-width:480px;margin:0 auto;background:#fbf8f3;border:1px solid #e8e1d2;border-radius:4px;padding:40px 32px;">
    <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:#b4543e;">
      Remember My Name
    </div>
    <p style="margin:24px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.55;color:#1c1a17;">
      ${INTRO}
    </p>
    <p style="margin:28px 0 0;">
      <a href="${confirm}" style="display:inline-block;padding:13px 24px;background:#b4543e;border-radius:2px;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;letter-spacing:0.04em;color:#fbf8f3;text-decoration:none;">${BUTTON}</a>
    </p>
    <p style="margin:30px 0 0;padding-left:16px;border-left:2px solid #b4543e;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:18px;line-height:1.6;color:#1c1a17;">
      ${CLOSING}
    </p>
    <p style="margin:28px 0 0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:17px;color:#1c1a17;">
      Kevin
    </p>
    <div style="margin-top:32px;padding-top:18px;border-top:1px solid #e8e1d2;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.7;color:#8a8479;">
      <a href="${unsubscribe}" style="color:#8a8479;text-decoration:underline;">Unsubscribe</a>
      <br />
      ${MAILING_ADDRESS}
    </div>
  </div>
</div>`;
}

export type SendResult = { sent: boolean; error?: string };

export async function sendConfirmation(
  to: string,
  links: EmailLinks,
  apiKey?: string
): Promise<SendResult> {
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
      html: confirmationHtml(links),
      text: confirmationText(links),
      // Lets mail clients show their own unsubscribe control.
      headers: { 'List-Unsubscribe': `<${links.unsubscribeUrl}>` },
    }),
    // Bound the call so a hanging mail API cannot stall the request.
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    // Log the body. A silent failure here is invisible from the outside, which
    // is exactly how a broken signup pipeline goes unnoticed for weeks.
    const body = await res.text().catch(() => '');
    console.error('[subscribe] resend rejected', res.status, body.slice(0, 400));
    return { sent: false, error: `resend_${res.status}` };
  }
  return { sent: true };
}
