import firebaseConfig from '../config/firebase-config.js';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

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

export function signOutFromFirebase() {
    return signOut(auth);
}

export function observeFirebaseAuthState(onChange, onError) {
    return onAuthStateChanged(auth, onChange, onError);
}

/**
 * Get a reference to the tracklist collection for the currently signed-in user
 * @returns {Object} A reference to the tracklist collection for the currently signed-in user
 */
function getReferenceToUserTracklistCollection() {
    const userId = auth.currentUser?.uid;

    if (typeof userId !== 'string') {
        throw new Error('Tried to access Firestore tracklists before a Firebase user was signed in.');
    }

    try {
        return collection(db, 'users', userId, 'tracklists');
    } catch (error) {
        console.error(error);
    }
}

/**
 * Retrieves the tracklist data object or objects stored in Firestore matching the provided tracklist title(s), if they exist
 * @param {string} tracklistTitle The title of the tracklist to retrieve
 * @returns {Promise<Object|null>} A promise with the tracklist data object matching the provided tracklist title, or null if none exists
 */
export async function retrieveTracklistDataFromFirestoreByTitle(tracklistTitle) {
    if (typeof tracklistTitle === 'string' && tracklistTitle.trim().length > 0) { // A valid tracklist title needs to be provided
        const tracklistsQuery = query(
            getReferenceToUserTracklistCollection(),
            where("title", "==", tracklistTitle)
        );
        const querySnapshot = await getDocs(tracklistsQuery);
        if (Array.isArray(querySnapshot?.docs) === true) {
            // Get an array of tracklist data objects from the array of documents in the query snapshot
            const tracklists = querySnapshot.docs.map(doc => doc.data());

            // If there is only a single tracklist in the results, return the tracklist object.
            if (tracklists.length === 1) {
                return tracklists[0];
            } else if (tracklists.length === 0) {
                return null;
            } else throw Error("Multiple tracklists found with the same title.");
        } else throw Error("An error was encountered when trying to retrieve tracklists from Firestore. No documents matched the given parameters.");
    } else throw Error("Tried to retrieve tracklist data from Firestore, but a valid string was not provided for the tracklist title.");
}
