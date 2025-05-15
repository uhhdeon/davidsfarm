// login-script.js
import { auth } from './firebase-config.js';
import { 
    GoogleAuthProvider, 
    signInWithPopup, 
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const emailLoginButton = document.getElementById('login-button-email');
    const googleLoginButton = document.getElementById('google-login-button');
    const authStatusDiv = document.getElementById('auth-status');

    const showMessage = (message, type = 'error') => {
        authStatusDiv.textContent = message;
        authStatusDiv.className = 'auth-status ' + (type === 'success' ? 'success' : '');
    };

    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', () => {
            const provider = new GoogleAuthProvider();
            signInWithPopup(auth, provider)
                .then(() => {
                    showMessage(`Login com Google bem-sucedido! Redirecionando...`, 'success');
                    window.location.href = 'index.html';
                })
                .catch((error) => showMessage(`Erro Google: ${error.message}`));
        });
    }

    if (emailLoginButton) {
        emailLoginButton.addEventListener('click', () => {
            const email = emailInput.value;
            const password = passwordInput.value;
            if (!email || !password) {
                showMessage('Por favor, preencha email e senha.');
                return;
            }
            signInWithEmailAndPassword(auth, email, password)
                .then(() => {
                    showMessage(`Login bem-sucedido! Redirecionando...`, 'success');
                    window.location.href = 'index.html';
                })
                .catch((error) => showMessage(`Erro Email/Senha: ${mapFirebaseAuthError(error.code)}`));
        });
    }

    onAuthStateChanged(auth, (user) => {
        if (user && window.location.pathname.includes('login.html')) {
            console.log('Usuário já logado, redirecionando de login.html');
            // window.location.href = 'index.html'; // Descomente se quiser redirecionamento automático agressivo
        }
    });

    function mapFirebaseAuthError(errorCode) {
        switch (errorCode) {
            case 'auth/invalid-email': return 'Formato de email inválido.';
            case 'auth/user-disabled': return 'Este usuário foi desabilitado.';
            case 'auth/user-not-found': return 'Nenhum usuário encontrado com este email.';
            case 'auth/wrong-password': return 'Senha incorreta.';
            case 'auth/invalid-credential': return 'Credenciais inválidas (email ou senha).';
            default: return `Erro desconhecido (${errorCode})`;
        }
    }
});