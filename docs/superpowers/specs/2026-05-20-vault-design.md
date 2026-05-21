# Vault: Password-Protected Document Storage

**Date:** 2026-05-20
**Status:** Approved

## Overview

A private, password-protected document vault at `/vault` on kevinminn.com. Files are stored in Cloudflare R2 (`km-v` bucket), organized in folders. Only Kevin can access it via a single password. The vault is invisible to site visitors.

## Technical Approach

Switch Astro from static to **hybrid mode** using `@astrojs/cloudflare` adapter. Existing pages remain static (prerendered). Vault pages and API endpoints run as Cloudflare Workers with R2 binding.

### New Dependencies

- `@astrojs/cloudflare` (Astro's official Cloudflare adapter)

No other new dependencies.

## Authentication

- Password stored as a Cloudflare environment variable (`VAULT_PASSWORD`), never in code
- `/vault` middleware checks for a signed HTTP-only session cookie
- Missing or invalid cookie redirects to `/vault/login`
- `/vault/login` presents a password form. On submit, POST to `/api/vault/auth`
- Server endpoint compares submitted password against `VAULT_PASSWORD`, sets a signed cookie on match
- Cookie: HTTP-only, Secure, SameSite=Strict, 7-day expiry
- Cookie signature uses a `VAULT_SECRET` env var (random string) to prevent tampering
- All `/api/vault/*` endpoints validate the cookie before processing
- Logout clears the cookie

### Security Notes

- No rate limiting in v1 (Cloudflare's built-in DDoS protection provides baseline protection)
- Password transmitted over HTTPS (Cloudflare auto-TLS)
- R2 bucket is private; files are never served via public URL, only proxied through authenticated endpoints

## File Storage

- **Bucket:** `km-v` (Cloudflare R2, private)
- **Organization:** Folder structure via R2 key prefixes (e.g., `legal/contract.pdf`)
- **File metadata:** Name, size, upload date, content type from R2 object headers
- **Max upload:** 100 MB per file (Cloudflare Workers request body limit)
- **No file type restrictions**

### Folder Operations

- Create folder: writes a zero-byte marker object (`foldername/.folder`)
- List folder: R2 `list()` with prefix and delimiter
- Delete folder: only if empty (no objects with that prefix besides the marker)
- Rename folder: copy all objects to new prefix, delete originals

### File Operations

- Upload: PUT to `/api/vault/upload` with file body and path metadata
- Download: GET from `/api/vault/download?key=<path>`, proxied through Worker
- Delete: DELETE to `/api/vault/delete?key=<path>`

## UI Design

Located at `/vault`. Matches site visual language (paper/ink palette, Fraunces + Inter).

### Layout

- **Top bar:** "Vault" heading (Fraunces), breadcrumb path, logout button
- **Action bar:** "New folder" button, "Upload" button
- **File list:** Rows showing: icon (folder/file type), name, size, date, actions (download/delete)
- **Upload zone:** Drag-and-drop area, or click to select files
- **Delete confirmation:** Modal before destructive actions
- **Search:** Text filter for files in current folder by name

### Mobile

- Single-column layout
- Action bar stacks vertically
- File list becomes card-based
- Upload via file picker (drag-and-drop hidden on touch)

### Login Page

- Centered card on paper-2 background
- Password input + "Enter vault" button
- Error state: "Wrong password" message, input shakes
- No "forgot password" (env var, Kevin resets it directly)

## Page & Endpoint Map

### Pages (server-rendered)

- `src/pages/vault/index.astro` - Main vault UI (file browser)
- `src/pages/vault/login.astro` - Login form

### API Endpoints

- `src/pages/api/vault/auth.ts` - POST: verify password, set cookie
- `src/pages/api/vault/logout.ts` - POST: clear cookie
- `src/pages/api/vault/list.ts` - GET: list folder contents
- `src/pages/api/vault/upload.ts` - POST: upload file to R2
- `src/pages/api/vault/download.ts` - GET: download file from R2
- `src/pages/api/vault/delete.ts` - DELETE: remove file/folder from R2
- `src/pages/api/vault/folder.ts` - POST: create folder, DELETE: remove folder

### Middleware

- `src/middleware.ts` - Check auth cookie on all `/vault` and `/api/vault` routes (except `/vault/login` and `/api/vault/auth`)

## Configuration Changes

### astro.config.mjs

- Add `@astrojs/cloudflare` adapter
- Set `output: 'hybrid'`
- Existing pages keep `export const prerender = true` (or rely on hybrid default of static)

### wrangler.toml (new)

- R2 bucket binding: `km-v`
- Environment variables: `VAULT_PASSWORD`, `VAULT_SECRET`

### Cloudflare Dashboard

- Create R2 bucket `km-v`
- Set environment variables in Pages project settings

## What This Does NOT Include

- Rate limiting or brute-force protection beyond Cloudflare defaults
- File versioning or revision history
- File sharing or public links
- Preview/thumbnail generation
- Multi-user access or roles
- Encryption at the application layer (R2 encrypts at rest by default)
