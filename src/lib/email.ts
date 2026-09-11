// Chapter One email via Resend's REST API.
// Deliberately plain fetch rather than the resend npm package, so this adds no
// dependency. The builders below are pure so they can be tested without network.

import type { Chapter } from './chapter';

export const FROM = 'Kevin Minn <hello@kevinminn.com>';
export const REPLY_TO = 'info@kevinminn.com';
export const SUBJECT = 'Chapter One of Remember My Name';

// Shown in the footer. CAN-SPAM expects a full postal address here; see docs/DEPLOY.md.
export const MAILING_ADDRESS = 'Los Angeles, CA';

const INTRO = 'Thank you for being here. As promised, here is Chapter One.';
const RELEASE = 'Remember My Name releases November 9, 2026.';
const REPLY_ASK = 'Reply to this email and tell me what stayed with you.';
const BUTTON = 'Read Chapter One';
const PDF_ASK = 'Prefer a PDF?';

// Kevin's line, used as written.
const CLOSING = 'Always be the best authentic version of yourself. Be bold. Be relentless. Be you.';

export type EmailLinks = { confirmUrl: string; unsubscribeUrl: string };

/** Links come from the request and the chapter from R2, so escape both for HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function confirmationText(links: EmailLinks, chapter: Chapter | null): string {
  const body = chapter
    ? [
        chapter.label.toUpperCase(),
        chapter.title,
        '',
        chapter.paragraphs.join('\n\n'),
        '',
        '* * *',
        '',
        RELEASE,
        '',
        REPLY_ASK,
      ]
    : [`${BUTTON}: ${links.confirmUrl}`, '', RELEASE];
  return [
    'REMEMBER MY NAME',
    '',
    INTRO,
    '',
    ...body,
    '',
    CLOSING,
    '',
    'Kevin',
    '',
    ...(chapter ? [`${PDF_ASK} ${links.confirmUrl}`, ''] : []),
    '---',
    `Unsubscribe: ${links.unsubscribeUrl}`,
    MAILING_ADDRESS,
  ].join('\n');
}

const SERIF = "Georgia,'Times New Roman',serif";
const SANS = 'Helvetica,Arial,sans-serif';

function chapterHtml(chapter: Chapter): string {
  const paragraphs = chapter.paragraphs
    .map((p) => `<p style="margin:0 0 18px;font-family:${SERIF};font-size:17px;line-height:1.7;color:#1c1a17;">${escapeHtml(p)}</p>`)
    .join('\n    ');
  return `<div style="margin:36px 0 30px;border-top:1px solid #e8e1d2;"></div>
    <div style="text-align:center;font-family:${SANS};font-size:10px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:#b4543e;">${escapeHtml(chapter.label)}</div>
    <p style="margin:12px 0 34px;text-align:center;font-family:${SERIF};font-style:italic;font-size:28px;line-height:1.25;color:#1c1a17;">${escapeHtml(chapter.title)}</p>
    ${paragraphs}
    <p style="margin:30px 0 0;text-align:center;font-family:${SERIF};font-size:18px;letter-spacing:0.5em;color:#b4543e;">* * *</p>`;
}

function releaseHtml(): string {
  return `<div style="margin:32px 0 0;padding:24px 20px;background:#f4efe6;border:1px solid #e8e1d2;border-radius:4px;text-align:center;">
      <div style="font-family:${SANS};font-size:10px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:#b4543e;">Release date</div>
      <p style="margin:10px 0 0;font-family:${SERIF};font-size:24px;line-height:1.3;color:#1c1a17;">November 9, 2026</p>
    </div>`;
}

export function confirmationHtml(links: EmailLinks, chapter: Chapter | null): string {
  const confirm = escapeHtml(links.confirmUrl);
  const unsubscribe = escapeHtml(links.unsubscribeUrl);
  const button = `<p style="margin:28px 0 0;">
      <a href="${confirm}" style="display:inline-block;padding:13px 24px;background:#b4543e;border-radius:2px;font-family:${SANS};font-size:14px;font-weight:600;letter-spacing:0.04em;color:#fbf8f3;text-decoration:none;">${BUTTON}</a>
    </p>`;
  const body = chapter
    ? `${chapterHtml(chapter)}
    ${releaseHtml()}
    <p style="margin:28px 0 0;font-family:${SERIF};font-style:italic;font-size:17px;line-height:1.6;color:#4a453d;">${REPLY_ASK}</p>`
    : `${button}
    ${releaseHtml()}`;
  const pdfLink = chapter
    ? `<p style="margin:24px 0 0;font-family:${SANS};font-size:13px;color:#8a8479;">${PDF_ASK} <a href="${confirm}" style="color:#b4543e;">${BUTTON} as a PDF</a></p>`
    : '';
  // Inline styles only, and no external assets. Mail clients strip stylesheets
  // and most block remote images by default.
  return `<div style="margin:0;padding:32px 16px;background:#f4efe6;">
  <div style="max-width:560px;margin:0 auto;background:#fbf8f3;border:1px solid #e8e1d2;border-radius:4px;padding:40px 32px;">
    <div style="font-family:${SANS};font-size:10px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:#b4543e;">
      Remember My Name
    </div>
    <p style="margin:24px 0 0;font-family:${SERIF};font-size:20px;line-height:1.5;color:#1c1a17;">
      ${INTRO}
    </p>
    ${body}
    <p style="margin:30px 0 0;padding-left:16px;border-left:2px solid #b4543e;font-family:${SERIF};font-style:italic;font-size:18px;line-height:1.6;color:#1c1a17;">
      ${CLOSING}
    </p>
    <p style="margin:28px 0 0;font-family:${SERIF};font-style:italic;font-size:17px;color:#1c1a17;">
      Kevin
    </p>
    ${pdfLink}
    <div style="margin-top:32px;padding-top:18px;border-top:1px solid #e8e1d2;font-family:${SANS};font-size:11px;line-height:1.7;color:#8a8479;">
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
  chapter: Chapter | null,
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
      html: confirmationHtml(links, chapter),
      text: confirmationText(links, chapter),
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
