import firebaseConfig from '../config/firebase-config.js';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export async function signInToFirebase() {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/appstate');
    const result = await signInWithPopup(auth, provider);

    return {
        user: result.user,
    };
}

export async function getCurrentFirebaseUser() {
    await auth.authStateReady();
    return auth.currentUser;
}

export function signOutFromFirebase() {
    return signOut(auth);
}

export function observeFirebaseAuthState(onChange, onError) {
    return onAuthStateChanged(auth, onChange, onError);
}

function getCurrentFirebaseUserId() {
    const userId = auth.currentUser?.uid;

    if (typeof userId !== 'string') {
        throw new Error('Tried to access Firestore tracklists before a Firebase user was signed in.');
    }

    return userId;
}

function assertValidTracklistTitle(tracklistTitle) {
    if (typeof tracklistTitle !== 'string' || tracklistTitle.trim().length === 0) {
        throw Error('Tried to access Firestore tracklist data, but a valid string was not provided for the tracklist title.');
    }

    return tracklistTitle;
}

function getReferenceToUserTracklistDocument(tracklistTitle) {
    const userId = getCurrentFirebaseUserId();
    const documentTitle = assertValidTracklistTitle(tracklistTitle);

    return doc(db, 'users', userId, 'tracklists', documentTitle);
}

/**
 * Retrieves the tracklist data object stored in Firestore matching the provided tracklist title, if it exists
 * @param {string} tracklistTitle The title of the tracklist to retrieve
 * @returns {Promise<Object|null>} A promise with the tracklist data object matching the provided tracklist title, or null if none exists
 */
export async function retrieveTracklistDataFromFirestore(tracklistTitle) {
    const tracklistSnapshot = await getDoc(getReferenceToUserTracklistDocument(tracklistTitle));

    return tracklistSnapshot.exists() ? tracklistSnapshot.data() : null;
}

export async function updateTracklistDataInFirestore(tracklistTitle, data) {
    await updateDoc(getReferenceToUserTracklistDocument(tracklistTitle), data);
}
