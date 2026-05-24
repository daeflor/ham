import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import firebaseConfig from '../config/firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/appstate');

export async function signInToFirebase() {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    return {
        user: result.user,
        accessToken: credential?.accessToken ?? null
    };
}

export function signOutFromFirebase() {
    return signOut(auth);
}