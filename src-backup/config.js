import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCh6hQiLxU7xKMtMEJIUb80W9VOxlxC_L0",
    authDomain: "centerfloorfitness.firebaseapp.com",
    projectId: "centerfloorfitness",
    storageBucket: "centerfloorfitness.firebasestorage.app",
    messagingSenderId: "540063022736",
    appId: "1:540063022736:web:1fc9ed73a0c06836d86215"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);