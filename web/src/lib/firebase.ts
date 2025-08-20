import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

const useEmulator = Boolean(import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST);

if (useEmulator) {
    const host = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST ?? "localhost";
    const port = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT ?? "9099";
    connectAuthEmulator(auth, `http://${host}:${port}`);
}

const useDbEmulator = Boolean(import.meta.env.VITE_FIRESTORE_EMULATOR_HOST);

if (useDbEmulator) {
    const host = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST ?? "localhost";
    const port = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT ?? 8080);
    connectFirestoreEmulator(db, host, port);
}



export { auth, db };