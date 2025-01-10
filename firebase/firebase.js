import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

import { getStorage } from "firebase/storage";

import { initializeApp as initAppAuth } from "firebase-admin/app";
// import { credential} from "firebase-admin/app";


import admin from 'firebase-admin';


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

export const storage = getStorage(app);

const db = getFirestore(app);

export { db };

const serviceAccount = {
	type: 'service_account',
	project_id: process.env.NODE_APP_FIREBASE_PROJECT_ID,
	private_key_id: process.env.NODE_APP_FIREBASE_PRIVATE_KEY_ID,
	private_key: process.env.NODE_APP_FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
	client_email: process.env.NODE_APP_FIREBASE_CLIENT_EMAIL,
	client_id: process.env.NODE_APP_FIREBASE_CLIENT_ID,
	auth_uri: process.env.NODE_APP_FIREBASE_AUTH_URI,
	token_uri: process.env.NODE_APP_FIREBASE_TOKEN_URI,
	auth_provider_x509_cert_url: process.env.NODE_APP_FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
	client_x509_cert_url: process.env.NODE_APP_FIREBASE_CLIENT_X509_CERT_URL,
	universe_domains: process.env.NODE_APP_UNIVERSE_DOMAIN
};

export const authApp = admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
});
