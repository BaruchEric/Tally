# Tally

A real-time, offline-capable shared expense ledger: track group expenses and transfers, see live "who owes whom" balances with simplified debts and settle-up, and export CSV or PDF statements — built on Next.js 16 with a Firebase backend.

## TL;DR

- **What:** A shared financial ledger for groups. Create ledgers, invite members, log expense/transfer entries with custom splits, and get live net balances, simplified debts, and settle-up prefill. CSV + PDF statement export, activity feed, and per-entry audit history.
- **How:** Next.js 16 App Router (React 19) PWA. Realtime data + auth + file storage on Firebase; Cloud Functions handle balance recompute, audit logging, member sync, invite emails, and daily FX snapshots server-side.
- **Stack:** Bun, Next.js 16, React 19, TypeScript (strict), Tailwind CSS v4, Firebase (Auth + Firestore + Storage + Functions), react-hook-form + zod, Luxon (dates), dinero.js (money).
- **Deploy:** Firebase backend (`tally-eb`) via `bun run deploy:firebase`; the Next.js web app is built for **Vercel** (`vercel.json`). No public live URL is configured in the repo (`APP_URL` defaults to `http://localhost:3000`).
- **Run:** `bun install`, `cp .env.local.example .env.local`, `bun run dev`.

## Overview

Tally tracks shared spending across a group and resolves balances:

- **Ledgers & membership** — create a ledger, invite members by email, accept invites, manage roles (`owner` / `editor` / `viewer`), and rename / archive / soft-delete ledgers.
- **Entries** — expense and transfer entries with receipt upload, custom split allocation, and filters by date / member / type.
- **Balances** — integer-minor-unit money math, local-midnight date handling, net balances, a balance matrix, simplified debts, and settle-up prefill.
- **History & exports** — an activity feed, per-entry audit history, CSV export, and PDF statement download (`@react-pdf/renderer`).
- **Offline / PWA** — Firestore offline persistence, a PWA manifest with icons, a hand-rolled service worker, an offline banner, a queued-write indicator, and an update prompt.

Without Firebase configuration the app still renders its product shell with demo data, so UI and domain logic remain testable locally.

## Tech stack

- **Runtime / package manager:** [bun](https://bun.sh) (`bun@1.2.17`), with `functions` as a workspace.
- **Framework:** Next.js 16 (App Router), React 19, strict TypeScript ~5.9.
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`), shadcn-style primitives (`class-variance-authority`, `tailwind-merge`, `@radix-ui/react-slot`), lucide-react icons.
- **Forms / validation:** react-hook-form + `@hookform/resolvers` + zod.
- **Money / dates:** dinero.js (integer minor units), Luxon.
- **PDF:** `@react-pdf/renderer` + `react-pdf`.
- **Backend:** Firebase — Auth, Firestore, Storage, Cloud Functions (`firebase` client SDK + `firebase-admin`).
- **Tooling:** ESLint 9 (`eslint-config-next`), Prettier, Vitest (unit + emulator-backed rules), Playwright (e2e), firebase-tools.

## Getting started

### Prerequisites

- [bun](https://bun.sh)
- A Firebase project (Auth, Firestore, Storage, Cloud Functions) for live data
- The Firebase CLI (provided via `firebase-tools`) for emulator-backed rules tests and backend deploys

### Install & run

```bash
bun install
cp .env.local.example .env.local   # fill in Firebase + server values
bun run dev                         # next dev on http://localhost:3000
```

Fill in Firebase client values in `.env.local` before using live auth, storage, or Firestore writes. Without them, the app renders the same shell with demo data.

### Environment variables

From `.env.local.example`:

| Variable | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | client | Firebase web config. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | client | Firebase web config. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | client | Firebase web config. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | client | Firebase web config. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | client | Firebase web config. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | client | Firebase web config. |
| `FIREBASE_PROJECT_ID` | server | Admin SDK credentials. |
| `FIREBASE_CLIENT_EMAIL` | server | Admin SDK credentials. |
| `FIREBASE_PRIVATE_KEY` | server | Admin SDK credentials. |
| `RESEND_API_KEY` | server / functions | Required for real invite-email delivery. |
| `INVITE_FROM_EMAIL` | server / functions | Verified sender, e.g. `"Tally <invites@example.com>"`. |
| `APP_URL` | server | Deployed app URL; defaults to `http://localhost:3000`. |
| `FX_BASE_URL` | functions | FX rate source (default `https://api.exchangerate.host`). |

## Scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `next dev` | Local dev server. |
| `build` | `next build` | Production build. |
| `start` | `next start` | Serve the production build. |
| `lint` | `eslint . --max-warnings=0` | Lint (zero warnings). |
| `typecheck` | `tsc --noEmit` | Type-check. |
| `format` | `prettier --check .` | Formatting check. |
| `test` | `vitest run` | Unit tests. |
| `test:watch` | `vitest` | Unit tests in watch mode. |
| `test:rules` | `firebase emulators:exec --only firestore "…"` | Firestore security-rule tests against the emulator. |
| `e2e` | `playwright test` | End-to-end tests. |
| `functions:build` | `cd functions && bun run build` | Build Cloud Functions. |
| `verify` | lint → typecheck → test → test:rules → build → functions:build → e2e | Full local gate. |
| `deploy:firebase` | `firebase deploy --only firestore:rules,firestore:indexes,storage,functions` | Deploy the Firebase backend. |

## Routes (App Router)

The App Router lives at top-level `app/` with `(auth)` and `(app)` route groups:

```
app/
  layout.tsx
  (auth)/        sign-in, sign-up, verify
  (app)/         page (home), profile, invites/[id],
                 ledgers/new, ledgers/[id] (+ settings, members,
                 balances, entries/new, entries/[entryId])
src/
  components/    auth, invites, ledger, nav, profile, system, ui
  hooks/         useLedger(s), useEntries, useBalances, useAuditLogs, useFirestoreSnapshot
  lib/           auth/, dates/, exports/ (csv, statement, download),
                 firebase/ (client, admin, persistence), ledgers/
                 (queries, schema, splits, balances, members), money/, pwa/
```

## Data model (Firestore)

Security rules in `firestore.rules` (signed-in gating + per-ledger role checks). Collections:

- **`users/{uid}`** — profile mirror; readable by any signed-in user, writable only by the owner; `users/{uid}/private/**` is owner-only.
- **`ledgers/{ledgerId}`** — a ledger with `createdBy` and a `memberUids` array. Created by a signed-in user who includes themselves in `memberUids`; readable by members; updatable by the owner (or editors, limited to `name` / `updatedAt` / `archivedAt`); never hard-deleted.
  - **`members/{uid}`** — membership with a `role` (`owner` / `editor` / `viewer`); members can read, owners manage, and a user may add themselves on invite acceptance.
  - **`entries/{entryId}`** — expense/transfer entries; created/updated by editors (creators or owner), members can read, no client deletes.
  - **`balances/{uid}`** — computed balances; member-readable, **never client-writable** (written by Cloud Functions).
  - **`audit/{auditId}`** — append-only audit log; member-readable, never client-writable.
- **`invites/{inviteId}`** — created by a ledger owner; readable by the inviter, the invited email, or ledger members.

## Cloud Functions

In `functions/` (TypeScript → compiled JS, `nodejs20`, Firebase Functions v2):

- **`onEntryWrite`** — `onDocumentWritten("ledgers/{ledgerId}/entries/{entryId}")`; recomputes balances on entry changes.
- **`onMemberWrite`** — `onDocumentWritten("ledgers/{ledgerId}/members/{uid}")`; member sync.
- **`onInviteAccept`** — `onDocumentUpdated("invites/{inviteId}")`; handles invite acceptance.
- **`sendInviteEmail`** — `onDocumentCreated("invites/{inviteId}")`; sends invite emails (via Resend).
- **`fxDaily`** — `onSchedule("every day 05:00")`; daily FX-rate snapshots.

Shared domain logic (`domain.ts`: minor-unit allocation, entry deltas, net computation, audit diff) is unit-tested.

## Deployment

The app is split into two deploy targets:

1. **Firebase backend** — Firestore rules/indexes, Storage rules, and Cloud Functions. The configured project is `tally-eb` (`.firebaserc`).

   ```bash
   bun run deploy:firebase   # firebase deploy --only firestore:rules,firestore:indexes,storage,functions
   ```

2. **Web app (Vercel)** — `vercel.json` sets `framework: nextjs`, `installCommand: bun install`, `buildCommand: bun run build`. Configure the same `NEXT_PUBLIC_FIREBASE_*` and server env vars in Vercel.

Real invite-email delivery requires `RESEND_API_KEY` and a verified `INVITE_FROM_EMAIL`.

> **Live URL:** none is configured in the repo. `firebase.json` has no `hosting` block (Firebase is backend-only here), and `APP_URL` defaults to `http://localhost:3000`. Set `APP_URL` to the deployed Vercel URL once the app is hosted.

## Status

Early but substantially built (`v0.1.0`). The repo includes auth, ledgers/members/entries, balances, exports, PWA support, security rules with emulator-backed rules tests, and the full Cloud Functions set. Notes:

- This README reflects the `simplify/all` branch (recent commits consolidate Firestore hooks and harden domain/money/date correctness).
- No production host is wired up yet — the backend project (`tally-eb`) exists, but there's no committed live URL and no Firebase Hosting config; the web app is intended for Vercel.
- Run the full `bun run verify` gate before deploying.
