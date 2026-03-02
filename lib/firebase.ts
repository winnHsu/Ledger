import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBrvFJsLQWuTex_9TzNwjslpVDezDdPXC4",
  authDomain: "ledger-2f5f9.firebaseapp.com",
  projectId: "ledger-2f5f9",
  storageBucket: "ledger-2f5f9.firebasestorage.app",
  messagingSenderId: "164043831070",
  appId: "1:164043831070:web:9cb39223566dcf25c7bb0f",
  measurementId: "G-MMNZ6R9QVP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Analytics can fail to initialize in some environments (e.g. strict privacy blockers, non-browser envs)
// or if version mismatches occur. We wrap it to prevent the app from crashing.
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Firebase Analytics initialization failed:", e);
}

export { app, auth, db, analytics };