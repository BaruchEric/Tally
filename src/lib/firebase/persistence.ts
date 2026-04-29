"use client";

import {
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  type Firestore
} from "firebase/firestore";

let persistencePromise: Promise<"enabled" | "multi-tab" | "unsupported"> | undefined;

export function enableOfflinePersistence(db: Firestore) {
  persistencePromise ??= enableIndexedDbPersistence(db)
    .then(() => "enabled" as const)
    .catch(async (error: { code?: string }) => {
      if (error.code === "failed-precondition") {
        await enableMultiTabIndexedDbPersistence(db);
        return "multi-tab" as const;
      }

      if (error.code === "unimplemented") {
        return "unsupported" as const;
      }

      throw error;
    });

  return persistencePromise;
}
