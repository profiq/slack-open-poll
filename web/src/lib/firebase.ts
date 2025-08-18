import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
    apiKey: "fake-api-key",
    authDomain: "localhost",
    projectId: "demo-project",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Only use emulators in dev/test or when explicitly enabled
if (import.meta.env.DEV || import.meta.env.VITE_USE_EMULATORS === "true") {
    const host = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST ?? "localhost";
    const port = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT ?? "9099";
    connectAuthEmulator(auth, `http://${host}:${port}`);
}


export { auth };
