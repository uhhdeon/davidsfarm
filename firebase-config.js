// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; // Importa o Firestore

const firebaseConfig = {
    apiKey: "AIzaSyAoI436Z3hx8rp63S6Ea095YpGxAeJdazA",
    authDomain: "david-s-farm.firebaseapp.com",
    projectId: "david-s-farm",
    storageBucket: "david-s-farm.firebasestorage.app",
    messagingSenderId: "1036766340330",
    appId: "1:1036766340330:web:5fb56b8eb0d7241c7a2393",
    measurementId: "G-XP73P7XJ09"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Obtém a instância do Firestore

// Exporta as instâncias
export { app, auth, db }; // Exporta db