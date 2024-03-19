import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

import { getStorage } from "firebase/storage";

import {
	getAuth,
	signInWithEmailAndPassword,
	signOut,
	onAuthStateChanged,
	sendPasswordResetEmail
} from "firebase/auth";

const firebaseConfig = {
	apiKey: process.env.NODE_APP_FIREBASE_API_KEY,
	authDomain: process.env.NODE_APP_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NODE_APP_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NODE_APP_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NODE_APP_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NODE_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
console.log('iniciando o APP: ', app)

export const storage = getStorage(app);

const db = getFirestore(app);

export { db };
