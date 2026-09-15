import { db } from "../firebase.js";
import {
  collection, collectionGroup, getDocs, onSnapshot, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/**
 * Live-subscribes to the attendance report. Recomputes whenever sessions
 * or any check-in changes anywhere. Calls onData({ totalSessions, rows }).
 * rows = [{ key, name, count }], sorted by count desc.
 */
export function subscribeReport(onData, onError) {
  let totalSessions = 0;
  let checkinDocs = [];

  function emit() {
    const tally = new Map(); // nameLower -> { displayName, sessionIds:Set }
    checkinDocs.forEach((d) => {
      const data = d.data();
      const key = data.nameLower || data.name?.toLowerCase();
      if (!key) return;
      const sessionId = d.ref.parent.parent.id;
      if (!tally.has(key)) tally.set(key, { displayName: data.name, sessionIds: new Set() });
      tally.get(key).sessionIds.add(sessionId);
    });

    const rows = [...tally.entries()]
      .map(([key, info]) => ({ key, name: info.displayName, count: info.sessionIds.size }))
      .sort((a, b) => b.count - a.count);

    onData({ totalSessions, rows });
  }

  const unsubSessions = onSnapshot(
    collection(db, "sessions"),
    (snap) => { totalSessions = snap.size; emit(); },
    (err) => onError?.(err)
  );

  const unsubCheckins = onSnapshot(
    collectionGroup(db, "checkins"),
    (snap) => { checkinDocs = snap.docs; emit(); },
    (err) => onError?.(err)
  );

  return () => { unsubSessions(); unsubCheckins(); };
}

/** Merges every check-in belonging to keyA or keyB into one canonical name. */
export async function mergeNames(keyA, keyB, canonicalName) {
  const snap = await getDocs(collectionGroup(db, "checkins"));
  const batch = writeBatch(db);
  let touched = 0;

  snap.forEach((d) => {
    const data = d.data();
    const key = data.nameLower || data.name?.toLowerCase();
    if (key === keyA || key === keyB) {
      batch.update(d.ref, { name: canonicalName, nameLower: canonicalName.toLowerCase() });
      touched++;
    }
  });

  if (touched > 0) await batch.commit();
  return touched;
}
