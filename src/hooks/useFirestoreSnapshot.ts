"use client";

import {
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
  type SnapshotListenOptions
} from "firebase/firestore";
import { useEffect, useState } from "react";

import { getFirestoreDb } from "@/src/lib/firebase/client";

type CollectionResult<T> = {
  data: T[];
  loading: boolean;
  error: Error | null;
  hasPendingWrites: boolean;
  fromCache: boolean;
};

type DocResult<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

type CollectionOptions<T> = {
  buildQuery: (db: Firestore) => Query | null;
  mapDoc: (snapshot: QueryDocumentSnapshot<DocumentData>) => T;
  deps: ReadonlyArray<unknown>;
  demo?: { match: boolean; data: T[] };
  listenOptions?: SnapshotListenOptions;
};

type DocOptions<T> = {
  buildRef: (db: Firestore) => DocumentReference | null;
  mapDoc: (id: string, data: DocumentData) => T;
  deps: ReadonlyArray<unknown>;
  demo?: { match: boolean; data: T };
};

function depsEqual(prev: ReadonlyArray<unknown>, next: ReadonlyArray<unknown>) {
  return prev.length === next.length && prev.every((value, index) => value === next[index]);
}

export function useFirestoreCollection<T>({
  buildQuery,
  mapDoc,
  deps,
  demo,
  listenOptions
}: CollectionOptions<T>): CollectionResult<T> {
  const isDemo = demo?.match ?? false;
  const [data, setData] = useState<T[]>(isDemo && demo ? demo.data : []);
  const [loading, setLoading] = useState<boolean>(!isDemo);
  const [error, setError] = useState<Error | null>(null);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  // React-recommended "reset state on key change" — store prev deps in state and
  // setState during render. https://react.dev/learn/you-might-not-need-an-effect
  const [prevDeps, setPrevDeps] = useState<ReadonlyArray<unknown>>(deps);
  if (!depsEqual(prevDeps, deps)) {
    setPrevDeps(deps);
    setData(isDemo && demo ? demo.data : []);
    setLoading(!isDemo);
    setError(null);
    setHasPendingWrites(false);
    setFromCache(false);
  }

  useEffect(() => {
    if (isDemo) {
      return undefined;
    }

    const db = getFirestoreDb();
    if (!db) {
      return undefined;
    }

    const query = buildQuery(db);
    if (!query) {
      return undefined;
    }

    return onSnapshot(
      query,
      listenOptions ?? {},
      (snapshot) => {
        setData(snapshot.docs.map((entry) => mapDoc(entry)));
        setHasPendingWrites(snapshot.metadata.hasPendingWrites);
        setFromCache(snapshot.metadata.fromCache);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      }
    );
    // The hook re-subscribes only when caller-provided `deps` change;
    // buildQuery/mapDoc/listenOptions/demo are derived from those.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, hasPendingWrites, fromCache };
}

export function useFirestoreDoc<T>({ buildRef, mapDoc, deps, demo }: DocOptions<T>): DocResult<T> {
  const isDemo = demo?.match ?? false;
  const [data, setData] = useState<T | null>(isDemo && demo ? demo.data : null);
  const [loading, setLoading] = useState<boolean>(!isDemo);
  const [error, setError] = useState<Error | null>(null);

  const [prevDeps, setPrevDeps] = useState<ReadonlyArray<unknown>>(deps);
  if (!depsEqual(prevDeps, deps)) {
    setPrevDeps(deps);
    setData(isDemo && demo ? demo.data : null);
    setLoading(!isDemo);
    setError(null);
  }

  useEffect(() => {
    if (isDemo) {
      return undefined;
    }

    const db = getFirestoreDb();
    if (!db) {
      return undefined;
    }

    const ref = buildRef(db);
    if (!ref) {
      return undefined;
    }

    return onSnapshot(
      ref,
      (snapshot) => {
        setData(snapshot.exists() ? mapDoc(snapshot.id, snapshot.data()) : null);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
