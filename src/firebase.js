// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCLEglj0c0RelBDqmryy9z9o2qqHn3N8gk",
    authDomain: "lms-nut.firebaseapp.com",
    projectId: "lms-nut",
    storageBucket: "lms-nut.firebasestorage.app",
    messagingSenderId: "819027513719",
    appId: "1:819027513719:web:379085c58a74819c15d172",
    measurementId: "G-VLT54H1CSD"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
export { db, analytics };
