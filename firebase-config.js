import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAPqQ9a7p2rYRp89EUsaBIBfZhnAMSPdJ4",
  authDomain: "ibrat-mebelv9.firebaseapp.com",
  projectId: "ibrat-mebelv9",
  storageBucket: "ibrat-mebelv9.firebasestorage.app",
  messagingSenderId: "973246786789",
  appId: "1:973246786789:web:c1362d2f7886092fc1380c",
  measurementId: "G-Z4EH42EVR7"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
