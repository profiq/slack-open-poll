import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);

const useEmulator = import.meta.env.VITE_USE_EMULATORS === "true";
if (import.meta.env.DEV && useEmulator) {
    const host = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST ?? "localhost";
    const port = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT ?? "9099";
    connectAuthEmulator(auth, `http://${host}:${port}`);
    console.log(`Firebase Auth Emulator running at http://${host}:${port}`);
}

export { auth };
