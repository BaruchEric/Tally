# Tally

Tally is a real-time shared financial ledger app for tracking expenses, transfers, and "who owes whom" balances across a group.

## Stack

- Bun, Next.js 16 App Router, React 19, strict TypeScript
- Firebase Auth, Firestore, Storage, and Cloud Functions
- Tailwind CSS v4, shadcn-style primitives, lucide-react
- react-hook-form, zod, Luxon, dinero.js
- PWA manifest and hand-rolled service worker

## Getting Started

```bash
bun install
cp .env.local.example .env.local
bun run dev
```

Fill in Firebase client values in `.env.local` before using live auth, storage, or Firestore writes. Without Firebase configuration, the app renders the same product shell with demo data so UI and domain logic remain testable.

## Verification

```bash
bun run lint
bun run typecheck
bun run test
bun run test:rules
bun run build
cd functions && bun run build
bun run e2e
```

Firebase rules and Cloud Functions live in `firestore.rules`, `storage.rules`, and `functions/`.

## Implemented

- Email/password and Google auth wiring, email verification, profile mirroring, avatar upload.
- Real-time ledger/member/entry/audit hooks with Firestore offline persistence.
- Ledger create, rename, archive, soft delete, member invites, invite acceptance, member removal.
- Expense and transfer entries, receipt upload, filters by date/member/type, CSV export, PDF statement export.
- Integer-minor-unit money helpers, local-midnight date helpers, split allocation, net balances, simplified debts, settle-up prefill.
- Activity feed and per-entry audit history UI.
- PWA manifest, PNG icons, service worker, offline banner, queued-write indicator, update prompt.
- Firestore rules, storage rules, emulator-backed rules tests, Cloud Functions for balance recompute, audit logging, member sync, invite emails, invite acceptance, and daily FX snapshots.

## Deploy

1. Create a Firebase project and enable Auth providers, Firestore, Storage, and Cloud Functions.
2. Fill `.env.local` from `.env.local.example`; set `APP_URL` to the deployed app URL.
3. Copy `.firebaserc.example` to `.firebaserc` and set the Firebase project ID.
4. Deploy Firebase backend:

```bash
bun run deploy:firebase
```

5. Deploy the Next.js app to Vercel using Bun install/build commands from `vercel.json`.
6. Configure the same Firebase public env vars and server env vars in Vercel.

Real invite email delivery requires `RESEND_API_KEY` and a verified `INVITE_FROM_EMAIL`.
