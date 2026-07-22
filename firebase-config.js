import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBNQ_14GHXIa1s_8_480-e2NAEr7boZlKw",
  authDomain: "buvayda-ibrat-mebel.firebaseapp.com",
  projectId: "buvayda-ibrat-mebel",
  storageBucket: "buvayda-ibrat-mebel.firebasestorage.app",
  messagingSenderId: "630152385372",
  appId: "1:630152385372:web:9ba8311493052009532799"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
