// Importações do Firebase (sintaxe modular v9+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

// Sua Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAoI436Z3hx8rp63S6Ea095YpGxAeJdazA",
    authDomain: "david-s-farm.firebaseapp.com",
    projectId: "david-s-farm",
    storageBucket: "david-s-farm.firebasestorage.app", // Verifique este valor
    messagingSenderId: "1036766340330",
    appId: "1:1036766340330:web:5fb56b8eb0d7241c7a2393",
    measurementId: "G-XP73P7XJ09"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const loginEmailButton = document.getElementById('login-email-button');
    const registerEmailButton = document.getElementById('register-email-button');
    const loginGoogleButton = document.getElementById('login-google-button');
    const authMessageDiv = document.getElementById('auth-message');

    function showMessage(message, isError = false) {
        if (authMessageDiv) {
            authMessageDiv.textContent = message;
            authMessageDiv.style.color = isError ? 'red' : 'green';
        }
    }

    // Login com Google
    if (loginGoogleButton) {
        loginGoogleButton.addEventListener('click', () => {
            const provider = new GoogleAuthProvider();
            signInWithPopup(auth, provider)
                .then((result) => {
                    const user = result.user;
                    showMessage(`Login com Google bem-sucedido! Bem-vindo, ${user.displayName || user.email}!`);
                    console.log("Usuário logado com Google:", user);
                    // Redirecionar para a página principal ou dashboard após um pequeno atraso
                    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
                })
                .catch((error) => {
                    console.error("Erro no login com Google:", error);
                    showMessage(`Erro Google: ${error.message}`, true);
                });
        });
    }

    // Registrar com Email e Senha
    if (registerEmailButton) {
        registerEmailButton.addEventListener('click', () => {
            const email = emailInput.value;
            const password = passwordInput.value;
            if (!email || !password) {
                showMessage("Por favor, preencha email e senha para registrar.", true);
                return;
            }
            createUserWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    showMessage(`Usuário registrado com sucesso: ${user.email}! Você já está logado.`);
                    console.log("Usuário registrado:", user);
                    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
                })
                .catch((error) => {
                    console.error("Erro ao registrar:", error);
                    let friendlyMessage = "Erro ao registrar.";
                    if (error.code === 'auth/email-already-in-use') {
                        friendlyMessage = "Este email já está em uso. Tente fazer login.";
                    } else if (error.code === 'auth/weak-password') {
                        friendlyMessage = "Senha muito fraca. Use pelo menos 6 caracteres.";
                    } else {
                        friendlyMessage = error.message;
                    }
                    showMessage(friendlyMessage, true);
                });
        });
    }

    // Entrar com Email e Senha
    if (loginEmailButton) {
        loginEmailButton.addEventListener('click', () => {
            const email = emailInput.value;
            const password = passwordInput.value;
            if (!email || !password) {
                showMessage("Por favor, preencha email e senha para entrar.", true);
                return;
            }
            signInWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    showMessage(`Login bem-sucedido! Bem-vindo de volta, ${user.email}!`);
                    console.log("Usuário logado com email:", user);
                    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
                })
                .catch((error) => {
                    console.error("Erro ao entrar com email:", error);
                    let friendlyMessage = "Erro ao entrar.";
                     if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                        friendlyMessage = "Email ou senha incorretos.";
                    } else {
                        friendlyMessage = error.message;
                    }
                    showMessage(friendlyMessage, true);
                });
        });
    }

    // Observador do estado de autenticação (útil para redirecionar se já logado)
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Se o usuário já está logado e está na página de login,
            // talvez redirecioná-lo para o index.html.
            // Isso pode ser útil para evitar que o usuário veja a tela de login novamente
            // se ele já estiver autenticado.
            console.log("Usuário já logado na página de login, redirecionando...", user.email);
             // Evitar redirecionamento imediato se a mensagem de sucesso do login ainda não foi vista
            if (!authMessageDiv.textContent.includes("sucesso") && !authMessageDiv.textContent.includes("registrado")) {
                 // window.location.href = 'index.html'; // Descomente se quiser redirecionamento automático
            }
        } else {
            console.log("Nenhum usuário logado na página de login.");
        }
    });
});