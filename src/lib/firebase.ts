import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCLEglj0c0RelBDqmryy9z9o2qqHn3N8gk",
  authDomain: "lms-nut.firebaseapp.com",
  projectId: "lms-nut",
  storageBucket: "lms-nut.firebasestorage.app",
  messagingSenderId: "819027513719",
  appId: "1:819027513719:web:379085c58a74819c15d172",
  measurementId: "G-VLT54H1CSD"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
