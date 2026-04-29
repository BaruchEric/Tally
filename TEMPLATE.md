# Reusable Template: Real-Time Multi-User Firebase App (PWA)

Use this template for any greenfield app that needs: Firebase auth + Firestore real-time + per-resource sharing with roles + offline support + PWA install.

## Variables

- `{{APP_NAME}}` — human name (e.g., "Shared Ledger", "Family Recipes", "Team Standup Log")
- `{{APP_SLUG}}` — kebab-case folder name (e.g., `ledger`, `recipes`, `standup`)
- `{{DOMAIN_NOUN}}` — the primary shareable resource (singular, e.g., `ledger`, `recipe`, `standup`)
- `{{DOMAIN_NOUN_PLURAL}}` — plural form (e.g., `ledgers`, `recipes`, `standups`)
- `{{ENTRY_NOUN}}` — the unit of activity inside a `{{DOMAIN_NOUN}}` (e.g., `entry`, `step`, `update`)
- `{{ENTRY_NOUN_PLURAL}}` — plural form
- `{{ENTRY_TYPES}}` — discriminated union variants (e.g., `"expense" | "transfer"`, `"prep" | "cook" | "serve"`)
- `{{ROLES}}` — sharing roles, ordered most→least privileged (default: `"owner" | "editor" | "viewer"`)
- `{{REALTIME_REQUIREMENT}}` — describe the freshness expectation (e.g., "changes appear within 1s")
- `{{DERIVED_STATE}}` — anything computed from `{{ENTRY_NOUN_PLURAL}}` that needs server-side recomputation (e.g., balances, totals, scores). Leave blank if none.
- `{{EXTRA_FEATURES}}` — additional MVP features beyond CRUD + sharing + real-time + offline + PWA (e.g., "CSV export", "multi-currency", "PDF reports")
- `{{OUT_OF_SCOPE}}` — explicit non-goals for v1

## Template Body

````markdown
# Build Prompt: {{APP_NAME}}

## Task
Build a real-time, multi-user web app where authenticated users create `{{DOMAIN_NOUN_PLURAL}}`, invite specific people by email with roles, and collaborate live. Offline-capable, mobile-installable PWA.

## Stack (do not deviate without asking)
- **Runtime:** `bun` (never `npm`/`npx`/`pnpm`/`yarn`)
- **Framework:** Next.js 16 App Router + React 19 + TypeScript (strict)
- **Backend:** Firebase
  - Auth (Email/Password + Google)
  - Cloud Firestore with offline persistence
  - Cloud Functions (Node 20, TypeScript)
  - Firebase Storage (file uploads)
- **UI:** Tailwind v4 + shadcn/ui + lucide-react
- **Forms:** react-hook-form + zod
- **Dates:** luxon, **local midnight (not UTC) for day boundaries**
- **PWA:** installable, service worker, offline banner
- **Deploy:** Vercel (Next.js) + Firebase project (rules, functions, storage)
- **Tooling:** ESLint + Prettier + `tsc --noEmit` + Vitest + Playwright

## Domain model
- **User** — Firebase Auth user mirrored at `users/{uid}`
- **{{DOMAIN_NOUN}}** — shareable resource at `{{DOMAIN_NOUN_PLURAL}}/{id}`, with `memberUids[]` array + `members` subcollection
- **Member** — `{ uid, role: {{ROLES}}, joinedAt }`
- **Invite** — `invites/{id}` with lowercased email, ledger ref, role, status, expiresAt
- **{{ENTRY_NOUN}}** — discriminated union of `{{ENTRY_TYPES}}` at `{{DOMAIN_NOUN_PLURAL}}/{id}/{{ENTRY_NOUN_PLURAL}}/{entryId}`
- **AuditLog** — append-only at `{{DOMAIN_NOUN_PLURAL}}/{id}/audit/{autoId}`
- {{#if DERIVED_STATE}}**Derived:** {{DERIVED_STATE}} — recomputed by Cloud Function on entry write{{/if}}

### Firestore layout
```
users/{uid}
users/{uid}/private/settings
{{DOMAIN_NOUN_PLURAL}}/{id}
{{DOMAIN_NOUN_PLURAL}}/{id}/members/{uid}
{{DOMAIN_NOUN_PLURAL}}/{id}/{{ENTRY_NOUN_PLURAL}}/{entryId}
{{DOMAIN_NOUN_PLURAL}}/{id}/audit/{autoId}
invites/{inviteId}
```

`memberUids[]` on the parent doc is the only efficient way to query "things I belong to" — keep in sync via Cloud Function.

## Required features
1. **Auth** — sign-up, sign-in (email + Google), email verification, profile page
2. **{{DOMAIN_NOUN}} CRUD** — create, rename, archive, soft-delete (owner only); list mine sorted by `updatedAt`
3. **Sharing** — invite by email → email sent via Cloud Function → invitee accepts → membership added; role management
4. **{{ENTRY_NOUN}} CRUD** — add/edit/delete (creator or owner); discriminated union of `{{ENTRY_TYPES}}`
5. **Real-time** — `onSnapshot` everywhere; {{REALTIME_REQUIREMENT}}
6. **Offline** — `enableIndexedDbPersistence`, optimistic writes, offline banner, queued-write count
7. **PWA** — installable on iOS/Android/Desktop; Lighthouse PWA ≥ 90
8. **Audit log** — every write logged with actor + before/after diff
9. **{{EXTRA_FEATURES}}**

## File layout (standard)
```
{{APP_SLUG}}/
├── app/(auth)/, app/(app)/
├── src/lib/firebase/{client,admin,persistence}.ts
├── src/lib/{{DOMAIN_NOUN_PLURAL}}/{schema,queries}.ts
├── src/components/ui/ (shadcn) + src/components/{{DOMAIN_NOUN}}/
├── src/hooks/use{{DOMAIN_NOUN}}.ts, useEntries.ts
├── functions/src/{index,onEntryWrite,onMemberWrite,onInviteAccept,sendInviteEmail}.ts
├── firestore.rules, firestore.indexes.json, storage.rules, firebase.json
├── public/manifest.webmanifest + icons
├── tests/{unit,rules,e2e}/
└── tsconfig.json (paths: "@/*" → "./*")
```

## Critical patterns & gotchas
- **Path alias:** always `@/`, never relative across modules
- **Admin SDK only in Cloud Functions / server routes**, never bundled to client or edge
- **Multi-tenant rules:** deny by default; allow on `request.auth.uid in resource.data.memberUids`; subcollections gate via parent `get()`; role enforcement on writes
- **Offline persistence:** call `enableIndexedDbPersistence` once at boot, before any reads, in try/catch
- **Real-time:** `onSnapshot` defaults; opt into `includeMetadataChanges` only where you render sync state
- **Server-side derivation:** never trust client to write derived/aggregate docs — do it in `onEntryWrite` Cloud Function
- **Invites:** lowercased email; never auto-accept — require explicit click
- **Dates:** local midnight per user locale via Luxon (NOT UTC midnight)
- **PWA on iOS:** test install on real iPhone; multiple `apple-touch-icon` sizes required
- **Responsive:** test with window resize listener, not just initial render
- {{#if MONEY}}**Money:** integer minor units + currency code, all math via `dinero.js`, never `number`{{/if}}

## Acceptance criteria
1. New user signs up, verifies email, creates a `{{DOMAIN_NOUN}}`
2. Invite-by-email round-trip works between two test accounts
3. Both users see each other's writes within {{REALTIME_REQUIREMENT}}
4. {{#if DERIVED_STATE}}{{DERIVED_STATE}} recomputed correctly (covered by unit tests){{/if}}
5. Offline: write while disconnected → optimistic → flushes on reconnect
6. PWA installable on iOS, Android, Desktop; Lighthouse PWA ≥ 90
7. Mobile layout at 360px; desktop at 1440px
8. Non-member cannot read/write (covered by rules-unit-tests)
9. Edit creates audit log row with diff
10. `bun run lint && bun run typecheck && bun run test && bun run build` all pass clean
11. Deployed to Vercel preview; Firebase rules + functions deployed

## Testing approach
- Vitest unit: domain math, helpers
- `@firebase/rules-unit-testing` for security rules
- Playwright e2e golden path (two browser contexts for two accounts)
- Manual: offline mode, iOS PWA install, Lighthouse audit

## Build order
1. Scaffold (Next + Tailwind + shadcn + Firebase + bun + tsconfig paths)
2. Auth + AuthProvider
3. Firestore client + offline persistence + rules skeleton
4. `{{DOMAIN_NOUN}}` CRUD + member sync function
5. `{{ENTRY_NOUN}}` CRUD
6. {{#if DERIVED_STATE}}Derived-state computation (client + Cloud Function){{/if}}
7. Invites flow + email
8. Real-time hooks
9. PWA (manifest, SW, install prompt)
10. Offline UX
11. {{EXTRA_FEATURES}}
12. Audit log UI
13. Polish (empty states, loading, errors)
14. Tests + Lighthouse + deploy

## Out of scope for v1
{{OUT_OF_SCOPE}}

If you reach for any of the above, stop and ask first.
````

## How to use this template

1. Copy the **Template Body** to a new `PROMPT.md` in the target project
2. Fill in every `{{VARIABLE}}` — search-and-replace
3. Resolve `{{#if ...}}` blocks: keep contents if relevant, delete the whole block (including markers) if not
4. Add domain-specific gotchas under "Critical patterns" (e.g., for finance apps add the money rule; for media apps add Storage upload limits)
5. Hand the resulting `PROMPT.md` to the implementing agent

## When to NOT use this template

- Single-user apps (no sharing) — overkill
- Apps that don't need real-time (use Server Components + RSC revalidation instead)
- Apps where Firebase isn't a fit (heavy relational queries, complex transactions across many docs, full-text search at scale)
- Static-content apps (use plain Next.js + MDX)
