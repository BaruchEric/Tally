import { z } from "zod";

export const ledgerRoleSchema = z.enum(["owner", "editor", "viewer"]);
export type LedgerRole = z.infer<typeof ledgerRoleSchema>;

export const currencyCodeSchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());

export const moneySchema = z.object({
  amountMinor: z.number().int(),
  currency: currencyCodeSchema
});
export type MoneyValue = z.infer<typeof moneySchema>;

export const userProfileSchema = z.object({
  uid: z.string(),
  displayName: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  photoURL: z.string().url().nullable().optional(),
  createdAt: z.unknown().optional()
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export const memberSchema = z.object({
  uid: z.string(),
  role: ledgerRoleSchema,
  displayName: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  joinedAt: z.unknown().optional(),
  removedAt: z.unknown().optional()
});
export type LedgerMember = z.infer<typeof memberSchema>;

export const ledgerSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  currency: currencyCodeSchema.default("USD"),
  createdBy: z.string(),
  memberUids: z.array(z.string()).default([]),
  archivedAt: z.unknown().optional(),
  deletedAt: z.unknown().optional(),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional()
});
export type Ledger = z.infer<typeof ledgerSchema>;

export const equalSplitSchema = z.object({
  mode: z.literal("equal"),
  participants: z.array(z.string()).min(1)
});

export const exactSplitSchema = z.object({
  mode: z.literal("exact"),
  participants: z
    .array(
      z.object({
        uid: z.string(),
        amountMinor: z.number().int().nonnegative()
      })
    )
    .min(1)
});

export const shareSplitSchema = z.object({
  mode: z.literal("shares"),
  participants: z
    .array(
      z.object({
        uid: z.string(),
        shares: z.number().int().positive()
      })
    )
    .min(1)
});

export const percentSplitSchema = z.object({
  mode: z.literal("percent"),
  participants: z
    .array(
      z.object({
        uid: z.string(),
        basisPoints: z.number().int().min(0).max(10_000)
      })
    )
    .min(1)
});

export const splitSchema = z.discriminatedUnion("mode", [
  equalSplitSchema,
  exactSplitSchema,
  shareSplitSchema,
  percentSplitSchema
]);
export type ExpenseSplit = z.infer<typeof splitSchema>;

const entryBaseSchema = z.object({
  id: z.string(),
  ledgerId: z.string(),
  createdBy: z.string(),
  date: z.string(),
  description: z.string().trim().min(1),
  note: z.string().optional(),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
  deletedAt: z.unknown().optional()
});

export const expenseEntrySchema = entryBaseSchema.extend({
  type: z.literal("expense"),
  payerUid: z.string(),
  amount: moneySchema.refine((value) => value.amountMinor > 0, "Amount must be positive"),
  split: splitSchema,
  receiptPath: z.string().nullable().optional(),
  receiptURL: z.string().url().nullable().optional()
});
export type ExpenseEntry = z.infer<typeof expenseEntrySchema>;

export const transferEntrySchema = entryBaseSchema.extend({
  type: z.literal("transfer"),
  fromUid: z.string(),
  toUid: z.string(),
  amount: moneySchema.refine((value) => value.amountMinor > 0, "Amount must be positive")
});
export type TransferEntry = z.infer<typeof transferEntrySchema>;

export const adjustmentEntrySchema = entryBaseSchema.extend({
  type: z.literal("adjustment"),
  targetUid: z.string(),
  amount: moneySchema,
  reason: z.string().min(1)
});
export type AdjustmentEntry = z.infer<typeof adjustmentEntrySchema>;

export const entrySchema = z.discriminatedUnion("type", [
  expenseEntrySchema,
  transferEntrySchema,
  adjustmentEntrySchema
]);
export type LedgerEntry = z.infer<typeof entrySchema>;

export const inviteSchema = z.object({
  id: z.string(),
  ledgerId: z.string(),
  email: z.string().email().transform((value) => value.toLowerCase()),
  role: ledgerRoleSchema,
  invitedBy: z.string(),
  status: z.enum(["pending", "accepted", "declined", "expired"]).default("pending"),
  expiresAt: z.unknown(),
  createdAt: z.unknown().optional(),
  acceptedAt: z.unknown().optional()
});
export type Invite = z.infer<typeof inviteSchema>;

export const auditLogSchema = z.object({
  id: z.string(),
  actorUid: z.string(),
  action: z.enum(["create", "update", "delete", "accept-invite", "member-change"]),
  targetPath: z.string(),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  diff: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.unknown()
});
export type AuditLog = z.infer<typeof auditLogSchema>;

export const demoMembers: LedgerMember[] = [
  { uid: "alex", role: "owner", displayName: "Alex", email: "alex@example.com" },
  { uid: "sam", role: "editor", displayName: "Sam", email: "sam@example.com" },
  { uid: "riley", role: "editor", displayName: "Riley", email: "riley@example.com" }
];

export const demoLedger: Ledger = {
  id: "demo-ledger",
  name: "Tokyo Apartment",
  currency: "USD",
  createdBy: "alex",
  memberUids: demoMembers.map((member) => member.uid)
};

export const demoEntries: LedgerEntry[] = [
  {
    id: "entry-groceries",
    ledgerId: demoLedger.id,
    type: "expense",
    createdBy: "alex",
    payerUid: "alex",
    amount: { amountMinor: 9300, currency: "USD" },
    split: { mode: "equal", participants: ["alex", "sam", "riley"] },
    date: "2026-04-28",
    description: "Groceries"
  },
  {
    id: "entry-train",
    ledgerId: demoLedger.id,
    type: "expense",
    createdBy: "sam",
    payerUid: "sam",
    amount: { amountMinor: 4200, currency: "USD" },
    split: {
      mode: "shares",
      participants: [
        { uid: "alex", shares: 1 },
        { uid: "sam", shares: 1 }
      ]
    },
    date: "2026-04-28",
    description: "Train passes"
  },
  {
    id: "entry-settle",
    ledgerId: demoLedger.id,
    type: "transfer",
    createdBy: "riley",
    fromUid: "riley",
    toUid: "alex",
    amount: { amountMinor: 1000, currency: "USD" },
    date: "2026-04-28",
    description: "Partial settle-up"
  }
];

export const demoAuditLogs: AuditLog[] = [
  {
    id: "audit-groceries",
    actorUid: "alex",
    action: "create",
    targetPath: "ledgers/demo-ledger/entries/entry-groceries",
    after: { description: "Groceries" },
    createdAt: "2026-04-28T09:30:00.000-07:00"
  },
  {
    id: "audit-train",
    actorUid: "sam",
    action: "create",
    targetPath: "ledgers/demo-ledger/entries/entry-train",
    after: { description: "Train passes" },
    createdAt: "2026-04-28T12:10:00.000-07:00"
  },
  {
    id: "audit-settle",
    actorUid: "riley",
    action: "create",
    targetPath: "ledgers/demo-ledger/entries/entry-settle",
    after: { description: "Partial settle-up" },
    createdAt: "2026-04-28T18:45:00.000-07:00"
  }
];
