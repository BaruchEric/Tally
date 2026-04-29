import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let testEnv: RulesTestEnvironment;

function authedDb(uid: string, email = `${uid}@example.com`) {
  return testEnv.authenticatedContext(uid, { email }).firestore();
}

async function seedLedger() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "ledgers/ledger-a"), {
      name: "Rules Ledger",
      currency: "USD",
      createdBy: "owner",
      memberUids: ["owner", "editor", "viewer"],
      deletedAt: null,
      archivedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await setDoc(doc(db, "ledgers/ledger-a/members/owner"), {
      uid: "owner",
      role: "owner",
      email: "owner@example.com",
      joinedAt: serverTimestamp()
    });
    await setDoc(doc(db, "ledgers/ledger-a/members/editor"), {
      uid: "editor",
      role: "editor",
      email: "editor@example.com",
      joinedAt: serverTimestamp()
    });
    await setDoc(doc(db, "ledgers/ledger-a/members/viewer"), {
      uid: "viewer",
      role: "viewer",
      email: "viewer@example.com",
      joinedAt: serverTimestamp()
    });
    await setDoc(doc(db, "invites/invite-a"), {
      ledgerId: "ledger-a",
      email: "invitee@example.com",
      role: "editor",
      invitedBy: "owner",
      status: "pending",
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: serverTimestamp()
    });
  });
}

describe("firestore rules", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "tally-rules-test",
      firestore: {
        rules: readFileSync(resolve("firestore.rules"), "utf8"),
        host: "127.0.0.1",
        port: 8080
      }
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seedLedger();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it("allows members and denies non-members reading a ledger", async () => {
    await assertSucceeds(getDoc(doc(authedDb("viewer"), "ledgers/ledger-a")));
    await assertFails(getDoc(doc(authedDb("outsider"), "ledgers/ledger-a")));
  });

  it("allows editors to create entries and denies viewers", async () => {
    const entry = {
      ledgerId: "ledger-a",
      type: "expense",
      createdBy: "editor",
      payerUid: "editor",
      amount: { amountMinor: 1200, currency: "USD" },
      split: { mode: "equal", participants: ["owner", "editor"] },
      date: "2026-04-28",
      description: "Lunch",
      deletedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await assertSucceeds(setDoc(doc(authedDb("editor"), "ledgers/ledger-a/entries/editor-entry"), entry));
    await assertFails(
      setDoc(doc(authedDb("viewer"), "ledgers/ledger-a/entries/viewer-entry"), {
        ...entry,
        createdBy: "viewer",
        payerUid: "viewer"
      })
    );
  });

  it("keeps audit and balance collections server-owned", async () => {
    await assertFails(
      setDoc(doc(authedDb("owner"), "ledgers/ledger-a/audit/manual"), {
        actorUid: "owner",
        action: "update",
        createdAt: serverTimestamp()
      })
    );
    await assertFails(
      setDoc(doc(authedDb("owner"), "ledgers/ledger-a/balances/owner"), {
        net: 100,
        updatedAt: serverTimestamp()
      })
    );
  });

  it("lets invited users accept only their own pending invites", async () => {
    await assertSucceeds(
      updateDoc(doc(authedDb("invitee", "invitee@example.com"), "invites/invite-a"), {
        status: "accepted",
        acceptedBy: "invitee",
        acceptedAt: serverTimestamp()
      })
    );
    await assertFails(
      updateDoc(doc(authedDb("other", "other@example.com"), "invites/invite-a"), {
        status: "accepted",
        acceptedBy: "other",
        acceptedAt: serverTimestamp()
      })
    );
  });
});
