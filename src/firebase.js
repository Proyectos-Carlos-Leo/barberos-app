import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyARWcwVPjFi1T1XrBPkuVSj3JNDaCbs6GM",
  authDomain: "barberos-app-174cb.firebaseapp.com",
  databaseURL: "https://barberos-app-174cb-default-rtdb.firebaseio.com",
  projectId: "barberos-app-174cb",
  storageBucket: "barberos-app-174cb.firebasestorage.app",
  messagingSenderId: "258434171702",
  appId: "1:258434171702:web:e7a2afb448bf4891d16997"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
