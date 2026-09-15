import { db } from "../firebase.js";
import {
  collection, doc, addDoc, onSnapshot, orderBy, query,
  updateDoc, getDocs, writeBatch, Timestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const sessionsRef = collection(db, "sessions");

/** Live-subscribes to all sessions, newest first. Returns an unsubscribe fn. */
export function subscribeSessions(onData, onError) {
  const q = query(sessionsRef, orderBy("startTime", "desc"));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError?.(err)
  );
}

/** Live-subscribes to check-ins for one session, oldest first. */
export function subscribeCheckins(sessionId, onData, onError) {
  const ref = collection(db, "sessions", sessionId, "checkins");
  const q = query(ref, orderBy("timestamp", "asc"));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError?.(err)
  );
}

export async function createSession({ label, durationMinutes, startDate }) {
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  return addDoc(sessionsRef, {
    label,
    durationMinutes,
    startTime: Timestamp.fromDate(startDate),
    endTime: Timestamp.fromDate(endDate),
    status: "open",
    createdAt: Timestamp.now(),
  });
}

export function closeSession(id) {
  return updateDoc(doc(db, "sessions", id), { status: "closed" });
}

export async function deleteSession(id) {
  const checkinsSnap = await getDocs(collection(db, "sessions", id, "checkins"));
  const batch = writeBatch(db);
  checkinsSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "sessions", id));
  return batch.commit();
}

export function isSessionOpen(session, now = Date.now()) {
  return session.status === "open" && now < session.endTime.toMillis();
}
