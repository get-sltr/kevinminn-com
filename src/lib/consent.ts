// Single source of truth for the signup consent notice.
// The page renders this exact string and the endpoint stores it alongside the
// address, so the record always matches what the person actually agreed to.
// Bump CONSENT_VERSION whenever CONSENT_TEXT changes.

export const CONSENT_VERSION = '2026-08-24.2';

export const CONSENT_TEXT =
  'By signing up you agree to receive promotional emails from Kevin Minn about Remember My Name, ' +
  'including the release date, preorder details, and launch news. Expect a handful of emails, not a ' +
  'stream. Your address is never sold, rented, or shared. You can unsubscribe at any time by replying ' +
  'to any email or writing to info@kevinminn.com.';
