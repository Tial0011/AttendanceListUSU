# UNIMEDSU Attendance — Setup

## Architecture
The app is structured like a small SPA, just without a framework:

```
attendance-app/
├── index.html            check-in page shell (no login)
├── admin.html            admin shell — just <div id="app">, JS mounts everything into it
├── css/style.css         all styles, animations, skeleton loaders, toasts
├── firestore.rules       Firestore security rules — paste into Firebase Console
└── js/
    ├── firebase.js       Firebase config + exported app/db/auth handles
    ├── services/         all Firestore/Auth reads & writes live here — nothing
    │                     else in the app talks to Firebase directly
    │   ├── authService.js
    │   ├── sessionsService.js
    │   ├── checkinsService.js
    │   └── reportService.js
    ├── state/store.js     tiny pub-sub store (like a minimal Redux) holding
    │                      the logged-in user and which admin tab is active
    ├── components/        each file renders itself into a container element
    │   ├── LoginView.js
    │   ├── Sidebar.js
    │   ├── SessionsView.js
    │   ├── ReportView.js
    │   ├── Toast.js        pop-up notifications (replaces plain error text)
    │   └── Skeleton.js      shimmering loading placeholders
    ├── app.js              admin entry point — watches auth state, mounts
    │                       LoginView or the dashboard (Sidebar + current view)
    └── checkin.js           public check-in page entry point
```

Sessions, check-in counts, and the attendance report all use **real-time
Firestore listeners** (`onSnapshot`) instead of manual refresh calls — so if
you open a session on the admin panel, the check-in page picks it up
automatically within a second, no reload needed. Same for the report: merge
two names and every open tab updates instantly.

## 1. Create your admin account
There's no sign-up page on purpose — you create the one admin account
yourself:
1. Firebase Console → your project (`attendance-6422d`) → **Build → Authentication**.
2. **Get started** → enable the **Email/Password** provider.
3. **Users** tab → **Add user** → your email + a password.
4. That's the login for `admin.html`.

## 2. Firestore rules
1. Firebase Console → **Build → Firestore Database** → create it if you haven't.
2. **Rules** tab → replace everything with the contents of `firestore.rules` → **Publish**.
3. Confirm it actually published: the tab should show "Published just now" with no red error banner. If you paste rules and the editor auto-converts the quote marks around `'open'` into curly quotes, the rules can fail to compile silently — type them fresh in the console if in doubt.

These rules mean: anyone can load the check-in page and see if a session is
open; anyone can submit a check-in, but only inside the session's live time
window (enforced by Firestore itself using server time — not the visitor's
device clock); only your signed-in admin account can create/close/delete
sessions or edit check-ins (used by merge).

## 3. Firebase API key restrictions (if you self-host, e.g. Netlify)
If you ever see **"Missing or insufficient permissions"** errors that don't
match anything wrong in your rules, check this:
1. **Google Cloud Console** (console.cloud.google.com) → select the `attendance-6422d` project.
2. **APIs & Services → Credentials** → click the API key matching your `firebaseConfig`.
3. Under **Application restrictions**, if it's set to "Websites," make sure
   your actual hosting domain is in the allowed list, e.g.:
   ```
   https://attendancedg.netlify.app/*
   ```
   Add `http://localhost/*` too if you test locally.
4. Save and wait a couple of minutes for it to propagate.

## 4. Hosting
You're using **Netlify** — just drag-and-drop this whole folder (or connect
the repo) with no build step; it's static HTML/CSS/JS. No environment
variables needed, the Firebase config is already in `js/firebase.js`.

## 5. Running a session
1. Open `admin.html`, sign in.
2. **Sessions** → fill in a label, minutes open, start time → **Create session**.
3. Share the check-in link. It shows a live countdown and stops accepting names the moment time's up — and it'll flip to "closed" automatically the instant you close it from the admin panel too.
4. **Attendance report** tab shows, live, how many of the total sessions each name attended.

## Note on the name-matching
Since check-in is free text, two spellings of the same person will show as
two rows. Select two checkboxes in the report and hit **Merge selected** —
it asks for the correct name and combines their attendance history.

## Note on trustworthiness
The time cutoff is enforced by Firestore's rules using server time, so it
can't be beaten by changing a device's clock. It's still a text field though,
so nothing stops someone typing a friend's name in for them — that's a
physical-classroom constraint, not one software can close without adding a
login step, which was intentionally left out.
