// Shared Firebase init — imported by checkin.js and admin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDCez4j6zJa-mcolMpSOQ0v0zzsZPDJs-s",
  authDomain: "attendance-6422d.firebaseapp.com",
  projectId: "attendance-6422d",
  storageBucket: "attendance-6422d.firebasestorage.app",
  messagingSenderId: "103976881487",
  appId: "1:103976881487:web:c0461ebccd5e927d99093a",
  measurementId: "G-808VFTW3JD"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Fixed program info — change here if you reuse this for a future class
export const CLASS_LABEL = "UNIMEDSU Graphics Design 14-Day Class";
