// Single source of truth for the signup consent notice.
// The page renders this exact string and the endpoint stores it alongside the
// address, so the record always matches what the person actually agreed to.
// Bump CONSENT_VERSION whenever CONSENT_TEXT changes.

export const CONSENT_VERSION = '2026-09-10.1';

export const CONSENT_TEXT =
  'By signing up you agree to receive emails about Remember My Name from Kevin Minn. ' +
  'Every email has an unsubscribe link.';
