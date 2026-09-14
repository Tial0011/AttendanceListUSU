# UNIMEDSU Attendance — Setup

## What's in here
- `index.html` + `js/checkin.js` — the student check-in page (no login). Share this link with the class.
- `admin.html` + `js/admin.js` — the admin panel (email/password login required).
- `js/firebase.js` — your Firebase config (already filled in).
- `firestore.rules` — security rules to paste into Firebase.

## 1. Create your admin account
This app has no sign-up page on purpose — you create the one admin account yourself:
1. Firebase Console → your project (`attendance-6422d`) → **Build → Authentication**.
2. Click **Get started**, enable the **Email/Password** provider.
3. Go to the **Users** tab → **Add user** → enter your email + a password.
4. That's the login you'll use on `admin.html`.

## 2. Turn on Firestore
1. Firebase Console → **Build → Firestore Database** → **Create database** (production mode is fine).
2. Go to the **Rules** tab, delete the default contents, and paste in everything from `firestore.rules` in this folder. Click **Publish**.

These rules mean:
- Anyone can load the check-in page and see if a session is open.
- Anyone can submit a check-in, but **only** while a session's status is `open` and the current time is within its window — checking in after time's up, or when there's no session, is rejected by Firestore itself, not just the UI.
- Only your logged-in admin account can create/close/delete sessions or edit check-ins (used by the "merge names" feature).

## 3. Host it
Simplest option — Firebase Hosting (free, and it's already your Firebase project):
```
npm install -g firebase-tools
firebase login
firebase init hosting    # choose this folder as the public directory, say NO to single-page app rewrite
firebase deploy
```
You'll get two live URLs to use:
- `https://attendance-6422d.web.app/` → check-in page for students
- `https://attendance-6422d.web.app/admin.html` → your admin panel

(Netlify works too — just drag-and-drop this folder — the Firebase config is already embedded in the code, no environment variables needed.)

## 4. Running a session
1. Open `admin.html`, sign in.
2. **Sessions** tab → fill in a label (e.g. "Day 1"), how many minutes it should stay open, and the start time → **Create session**.
3. Share the check-in link with the class. The page shows a live countdown and stops accepting names the moment time's up.
4. **Attendance report** tab shows, for every name that's checked in at least once, how many of the total sessions they attended.

## Note on the name-matching
Since check-in is free text, two spellings of the same person ("Chidinma" vs "chidinma a.") will show as two separate rows. Use the checkboxes in the report table to select two rows and hit **Merge selected** — it'll ask you for the correct name and combine their attendance counts.

## Note on trustworthiness
The time cutoff is enforced by Firestore's rules using server time, not the visitor's device clock — so someone can't get around it by changing their phone's clock. It's still just a text field though, so it can't stop someone typing a friend's name in for them; that's a physical-classroom problem, not really solvable in software without adding a login step, which you said you wanted to avoid.
