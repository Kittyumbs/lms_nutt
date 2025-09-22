import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDWbOjYB5Mn_eb2yuF2m06on3RcB8WWM4c",
  authDomain: "manageorder-tmdt.firebaseapp.com",
  projectId: "manageorder-tmdt",
  storageBucket: "manageorder-tmdt.firebasestorage.app",
  messagingSenderId: "315660524022",
  appId: "1:315660524022:web:84c2bdb961119585bb4fd7",
  measurementId: "G-FNV02VXC1B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // Initialize analytics - commented out as it's not currently used
export const db = getFirestore(app);
