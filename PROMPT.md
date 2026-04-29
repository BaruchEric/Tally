# Build Prompt: Shared Financial Ledger ("Who-Owes-Who" App)

## Task

Build a **shared financial ledger web app** (Splitwise-style) where authenticated users create ledgers, invite specific people by email, log expenses and peer-to-peer transfers, and see a live "who owes whom" balance. Real-time, mobile-installable PWA, with offline support.

---

## Stack (chosen — do not deviate without asking)

- **Runtime / package manager:** `bun` (never `npm`/`npx`/`pnpm`/`yarn`)
- **Framework:** Next.js 16 App Router + React 19 + TypeScript (strict)
- **Backend:** Firebase
  - **Auth:** Firebase Auth (Email/Password + Google sign-in)
  - **Database:** Cloud Firestore (real-time listeners; offline persistence enabled)
  - **Server logic:** Cloud Functions for Firebase (TypeScript, 2nd gen, Node.js 20)
  - **Storage:** Firebase Storage (receipt images)
- **UI:** Tailwind CSS v4 + shadcn/ui + lucide-react icons
- **State / data:** Firestore SDK with `onSnapshot` listeners; React Server Components for static shells, Client Components for live data
- **Forms / validation:** `react-hook-form` + `zod`
- **Money:** `dinero.js` v2 (never store money as `number` — store integer minor units + currency code)
- **Dates:** `luxon`; store `Timestamp`, render in user's locale; "day" boundaries are **local midnight**, not UTC
- **PWA:** `@ducanh2912/next-pwa` (or hand-rolled service worker + manifest); installable on iOS/Android/Desktop
- **Deploy:** Vercel (Next.js app); Firebase project for backend
- **Tooling:** ESLint + Prettier + `tsc --noEmit` + Vitest (unit) + Playwright (e2e for golden path)

---

## Domain model

### Core concepts

- **User** — Firebase Auth user. Profile doc mirrored at `users/{uid}` with `displayName`, `email`, `photoURL`, `createdAt`.
- **Ledger** — a shared "group" (e.g., "Roommates", "Trip to Tokyo"). Has members with roles.
- **Member** — `{ uid, role: "owner" | "editor" | "viewer", joinedAt, displayName, email }` denormalized into ledger doc + a subcollection.
- **Invite** — pending invitation by email. Resolves to membership when invitee signs up / accepts.
- **Entry** — the unit of activity in a ledger. Discriminated union by `type`:
  - `"expense"` — one payer, split among N participants (equal / shares / exact / percent).
  - `"transfer"` — direct payment from user A → user B (settles balance).
  - `"adjustment"` — manual balance correction (audit-logged, owner-only).
- **Balance** — derived: net amount each member owes/is-owed within a ledger. Computed client-side from entries; cached in `ledgers/{id}/balances/{uid}` doc updated by a Cloud Function on entry write (so the home screen doesn't have to load all entries).
- **AuditLog** — append-only `ledgers/{id}/audit/{autoId}` for every create/update/delete. Includes actor uid, action, before/after snapshot, timestamp.

### Firestore layout

```
users/{uid}                              # public profile
users/{uid}/private/settings             # private prefs (default currency, etc.)

ledgers/{ledgerId}                       # ledger doc (name, currency, createdBy, memberUids[], updatedAt)
ledgers/{ledgerId}/members/{uid}         # role, displayName, email, joinedAt
ledgers/{ledgerId}/entries/{entryId}     # expense | transfer | adjustment
ledgers/{ledgerId}/balances/{uid}        # { net: int minor units, updatedAt } — computed
ledgers/{ledgerId}/audit/{autoId}        # immutable log

invites/{inviteId}                       # { ledgerId, email (lowercased), role, invitedBy, status, expiresAt }
```

`memberUids[]` (array on the ledger doc) is the **only** way to query "ledgers I'm in" efficiently — keep it in sync with the `members` subcollection via a Cloud Function trigger.

---

## Required features (MVP scope = "all")

1. **Auth**
   - Email/password + Google sign-in
   - Email verification flow
   - Profile page (display name, avatar upload to Storage)
2. **Ledgers**
   - Create / rename / archive / delete (soft delete, owner only)
   - List all ledgers the user belongs to (sorted by `updatedAt` desc)
   - Per-ledger default currency (USD default)
3. **Sharing**
   - Invite by email → creates `invites/{id}` doc + sends email via Cloud Function (use Firebase Extensions `firestore-send-email` or Resend)
   - Invitee accepts → Cloud Function adds them to `members` and `memberUids[]`
   - Role management: owner can promote/demote; viewer can read but not write
   - Remove member (owner only); their historical entries remain but show "(removed)"
4. **Entries**
   - Add expense: payer, amount, currency, date, description, optional receipt photo, split mode (equal / shares / exact / percent), participants
   - Add transfer: from → to, amount, date, note
   - Edit / delete (creator or owner; full audit trail)
   - Filter by date range, member, type
5. **Balances**
   - Live "who owes whom" simplified graph (use greedy debt-simplification algorithm)
   - Per-member net balance across the ledger
   - "Settle up" button → pre-fills a transfer entry
6. **Real-time**
   - All ledger views use `onSnapshot` — changes from one device appear on others within ~1s
7. **Offline**
   - `enableIndexedDbPersistence` on the Firestore client
   - Optimistic writes (Firestore SDK queues them)
   - Banner when offline; queued-write count visible
8. **PWA**
   - Installable (manifest + icons + service worker)
   - Works mobile-first; bottom nav on small screens
   - Add-to-home-screen prompts on supported platforms
9. **Export**
   - CSV export of entries for a ledger (date, type, payer, amount, currency, participants, note)
   - PDF export of a date-range statement (use `react-pdf`)
10. **Audit & history**
    - Per-entry "history" drawer showing all edits with diffs
    - Per-ledger activity feed (last 50)
11. **Multi-currency (basic)**
    - Each entry has its own currency; ledger has a "display currency"
    - Balances shown in ledger display currency using a daily FX snapshot stored at `fx/{YYYY-MM-DD}` (Cloud Function fetches once/day from exchangerate.host)
    - Historical entries always rendered with their original currency + converted amount

---

## File / module layout

```
ledger/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/page.tsx
│   │   ├── sign-up/page.tsx
│   │   └── verify/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                  # auth gate + bottom nav
│   │   ├── page.tsx                    # ledgers list (home)
│   │   ├── ledgers/
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # entries + balances
│   │   │       ├── settings/page.tsx
│   │   │       ├── members/page.tsx
│   │   │       ├── balances/page.tsx
│   │   │       └── entries/
│   │   │           ├── new/page.tsx
│   │   │           └── [entryId]/page.tsx
│   │   └── invites/[id]/page.tsx       # accept/decline invite
│   ├── api/
│   │   └── invite/route.ts             # (optional) email-sending proxy
│   └── layout.tsx
├── src/
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── client.ts               # browser SDK init (singleton)
│   │   │   ├── admin.ts                # admin SDK (server-only)
│   │   │   └── persistence.ts          # offline persistence setup
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx
│   │   │   └── useUser.ts
│   │   ├── ledgers/
│   │   │   ├── schema.ts               # zod schemas + TS types
│   │   │   ├── queries.ts              # typed Firestore query builders
│   │   │   ├── balances.ts             # net + simplified-debt algorithm
│   │   │   └── splits.ts               # split-calculation helpers
│   │   ├── money/index.ts              # dinero wrappers (always integer minor units)
│   │   ├── dates/index.ts              # luxon helpers, local-midnight day buckets
│   │   └── pwa/registerSW.ts
│   ├── components/
│   │   ├── ui/...                      # shadcn primitives
│   │   ├── ledger/
│   │   │   ├── LedgerCard.tsx
│   │   │   ├── EntryList.tsx
│   │   │   ├── EntryRow.tsx
│   │   │   ├── BalanceMatrix.tsx
│   │   │   ├── SimplifiedDebts.tsx
│   │   │   └── SplitEditor.tsx
│   │   ├── nav/BottomNav.tsx
│   │   └── system/OfflineBanner.tsx
│   └── hooks/
│       ├── useLedger.ts                # onSnapshot hook
│       ├── useEntries.ts
│       └── useBalances.ts
├── functions/                          # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.ts
│   │   ├── onEntryWrite.ts             # recompute balances + audit log
│   │   ├── onMemberWrite.ts            # sync memberUids[]
│   │   ├── onInviteAccept.ts           # add membership
│   │   ├── sendInviteEmail.ts          # outbound email
│   │   └── fxDaily.ts                  # scheduled FX fetch
│   └── package.json
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── firebase.json
├── public/
│   ├── manifest.webmanifest
│   ├── icons/...
│   └── sw.js                           # if hand-rolled
├── tests/
│   ├── unit/balances.test.ts
│   ├── unit/splits.test.ts
│   └── e2e/golden-path.spec.ts
├── .env.local.example
├── biome.json or .eslintrc + .prettierrc
├── next.config.ts
├── tsconfig.json                       # paths: { "@/*": ["./*"] }
├── package.json
└── README.md
```

---

## Critical patterns & gotchas

### Money

- **Never** store amounts as `number`. Store `{ amountMinor: number (int), currency: "USD" }`. All math goes through `dinero.js`. Format for display only at render time. Floating-point on cents has bitten users repeatedly — do not skip this.

### Dates & "day" boundaries

- Per user's global rules: **local midnight, not UTC midnight.** When grouping entries by day for the activity feed or filtering "this month", compute boundaries in the user's locale via Luxon (`DateTime.now().startOf("day")`), then convert to `Timestamp`.

### Multi-tenant isolation (security rules)

- Every ledger document and subcollection must be gated on `request.auth.uid in resource.data.memberUids` (for the ledger doc) or via a `get()` lookup on the parent ledger (for subcollections). Write rules must additionally check role.
- Write `firestore.rules` defensively — deny by default, allow per-collection. Include unit tests via `@firebase/rules-unit-testing`.

### Real-time + offline

- Call `enableIndexedDbPersistence(db)` once at app boot, **before** any reads. Wrap in try/catch — it throws on multi-tab without `enableMultiTabIndexedDbPersistence`.
- Use `onSnapshot` with `{ includeMetadataChanges: true }` only where you need to render "syncing…" state; otherwise default options.
- Show an offline banner when `navigator.onLine === false` OR when snapshot metadata reports `fromCache && hasPendingWrites`.

### Balance simplification

- Naive net balances are easy. The "minimum number of transactions to settle" is a classic greedy problem — implement and unit-test in `src/lib/ledgers/balances.ts`. Algorithm: repeatedly match the largest creditor with the largest debtor until all balances are zero. Tolerance: 1 minor unit (rounding).

### Server-side recomputation

- Don't trust the client to write balance docs. The `onEntryWrite` Cloud Function reads all non-deleted entries for the ledger, recomputes net balances per member, and writes the `balances/{uid}` docs. Debounce or batch if a single user adds many entries quickly.

### Invites

- Store `email` lowercased. On user sign-up, query `invites` where `email == newUser.email && status == "pending"` and surface them on first login. Never auto-accept — require an explicit click (so a typo'd invite can't silently grant access to a stranger).

### Path alias

- `tsconfig.json` `paths`: `"@/*": ["./*"]`. **Always use `@/`**, never relative imports across module boundaries.

### Imports

- Client-only Firebase SDK in browser code (`firebase/auth`, `firebase/firestore`). Admin SDK (`firebase-admin`) **only** in Cloud Functions or Next.js Route Handlers — never in client components, never in middleware bundled to the edge.

### Currency conversion

- Always render the original amount + currency. Conversions are presentational only and must show the FX date used ("$12.30 ≈ €11.40 @ 2026-04-28 rate"). Never overwrite the stored entry amount.

### PWA

- iOS Safari has quirks: `apple-touch-icon` PNGs at multiple sizes, `apple-mobile-web-app-capable`, splash screens. Test the install flow on a real iPhone before claiming "PWA done."
- Service worker must `skipWaiting` and `clientsClaim` on update, with a user-visible "New version available — reload" prompt.

---

## Acceptance criteria

1. ✅ A new user can sign up, verify email, create a ledger, and see it on their home screen.
2. ✅ User A invites User B by email; User B receives email, signs up (or signs in), accepts invite, and appears in the ledger member list.
3. ✅ Both users add expenses and transfers; entries appear on the other's screen within 1s without refresh.
4. ✅ The "Balances" view correctly shows simplified debts (verified by unit tests covering: equal split, exact split, share split, percent split, transfers, multi-currency).
5. ✅ Killing the network tab → adding an entry → entry appears optimistically + queued-write banner shows; reconnecting flushes it.
6. ✅ App is installable on iOS Safari, Android Chrome, and Desktop Chrome (Lighthouse PWA audit ≥ 90).
7. ✅ Mobile layout works at 360px wide; desktop layout at 1440px. Tested via window resize, not just initial render.
8. ✅ A non-member cannot read or write the ledger (verified by `firestore.rules` unit tests).
9. ✅ Editing an entry creates an audit log row with before/after diff.
10. ✅ CSV export downloads valid file; PDF statement renders for a date range.
11. ✅ `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build` all pass with zero errors and zero warnings.
12. ✅ Deployed to Vercel preview URL; Firebase project provisioned with `firestore.rules` and `storage.rules` deployed.

---

## Testing approach

- **Unit (Vitest):** balance/split math, debt-simplification algorithm, money helpers, date helpers.
- **Rules tests (`@firebase/rules-unit-testing`):** non-member denial, role enforcement, audit-log immutability.
- **E2E (Playwright):** golden path — sign up → create ledger → invite → second user accepts (use a second browser context with a different test account) → add expense → both see balance update.
- **Manual smoke:** offline mode, PWA install on iOS, Lighthouse PWA score.

---

## Build order (suggested)

1. Project scaffold: Next.js + Tailwind + shadcn + Firebase init + bun + biome/eslint + tsconfig paths
2. Auth flow (sign-up, sign-in, profile, AuthProvider)
3. Firestore client + offline persistence + security rules skeleton
4. Ledgers CRUD + member subcollection + memberUids sync function
5. Entries CRUD (expense + transfer) + split editor
6. Balance computation client-side + Cloud Function recomputation
7. Invites flow + email send
8. Real-time wiring (onSnapshot hooks)
9. PWA: manifest, service worker, install prompt
10. Offline UX (banner, queued writes)
11. Multi-currency + FX function
12. Export (CSV + PDF)
13. Audit log UI
14. Polish: empty states, loading skeletons, error boundaries
15. Tests (unit + rules + e2e), Lighthouse, deploy

---

## Out of scope (for v1, do not build)

- Recurring/scheduled expenses
- Receipt OCR
- Push notifications
- In-app payments (Stripe / Plaid)
- Group chat
- Categories / budgets / charts
- Public/shareable read-only links
- Native mobile apps (PWA covers this)

If you find yourself reaching for one of these, stop and ask.
