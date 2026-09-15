import { db } from "../firebase.js";
import {
  collection, addDoc, getDocs, query, where, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Submits a check-in for a session. Returns { duplicate: true } instead of
 * writing again if this name already checked in to this session.
 */
export async function submitCheckin(sessionId, rawName) {
  const name = normalizeName(rawName);
  if (!name) throw new Error("EMPTY_NAME");

  const ref = collection(db, "sessions", sessionId, "checkins");
  const dupQuery = query(ref, where("nameLower", "==", name.toLowerCase()));
  const dupSnap = await getDocs(dupQuery);

  if (!dupSnap.empty) {
    return { duplicate: true, name };
  }

  await addDoc(ref, {
    name,
    nameLower: name.toLowerCase(),
    timestamp: serverTimestamp(),
  });

  return { duplicate: false, name };
}
