// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"; // ADICIONADO

const firebaseConfig = {
    apiKey: "AIzaSyAoI436Z3hx8rp63S6Ea095YpGxAeJdazA", // SUA CHAVE
    authDomain: "david-s-farm.firebaseapp.com",      // SEU DOMÍNIO
    projectId: "david-s-farm",                      // SEU ID DE PROJETO
    storageBucket: "david-s-farm.appspot.com",      // ATENÇÃO: Verifique este valor no seu console Firebase! Geralmente termina com .appspot.com para o Storage.
    messagingSenderId: "1036766340330",             // SEU SENDER ID
    appId: "1:1036766340330:web:5fb56b8eb0d7241c7a2393", // SEU APP ID
    measurementId: "G-XP73P7XJ09"                   // SEU MEASUREMENT ID (opcional)
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app); // ADICIONADO: Inicializa o Firebase Storage

// Exporta as instâncias para serem usadas em outros scripts
export { app, auth, storage }; // ADICIONADO 'storage'