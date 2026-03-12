// File: firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, query, where, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBAsZ-4RsrD7mO78MlYk0hMQMmm124R_yM",
    authDomain: "ppty-77cb7.firebaseapp.com",
    projectId: "ppty-77cb7",
    storageBucket: "ppty-77cb7.firebasestorage.app",
    messagingSenderId: "286646841994",
    appId: "1:286646841994:web:d5432d9edf53e55fbf3373",
    measurementId: "G-M9MV23TEWQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, addDoc, getDocs, doc, query, where, updateDoc, deleteDoc, serverTimestamp };
