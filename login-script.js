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
    const emailLoginButton = document.getElementById('login-button-email'); // ID atualizado
    const googleLoginButton = document.getElementById('google-login-button');
    const authStatusDiv = document.getElementById('auth-status');

    // Função Login com Google
    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', () => {
            const provider = new GoogleAuthProvider();
            signInWithPopup(auth, provider)
                .then((result) => {
                    authStatusDiv.textContent = `Login com Google bem-sucedido! Redirecionando...`;
                    authStatusDiv.className = 'success auth-status'; // Adiciona classe base para estilo
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    authStatusDiv.textContent = `Erro Google: ${error.message}`;
                    authStatusDiv.className = 'auth-status';
                });
        });
    }

    // Função Login com Email e Senha
    if (emailLoginButton) {
        emailLoginButton.addEventListener('click', () => {
            const email = emailInput.value;
            const password = passwordInput.value;
            if (!email || !password) {
                authStatusDiv.textContent = 'Por favor, preencha email e senha.';
                authStatusDiv.className = 'auth-status';
                return;
            }
            signInWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    authStatusDiv.textContent = `Login bem-sucedido! Redirecionando...`;
                    authStatusDiv.className = 'success auth-status';
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    authStatusDiv.textContent = `Erro Email/Senha: ${mapFirebaseAuthError(error.code)}`;
                    authStatusDiv.className = 'auth-status';
                });
        });
    }

    // Observador do estado de autenticação
    onAuthStateChanged(auth, (user) => {
        if (user) {
            if (window.location.pathname.endsWith('login.html')) {
                //  window.location.href = 'index.html'; // Comentado para evitar loop se o index tiver problema e redirecionar de volta
                console.log('Usuário já logado na página de login.');
            }
        }
    });

    function mapFirebaseAuthError(errorCode) {
        // ... (função mapFirebaseAuthError da versão anterior, sem alterações)
        switch (errorCode) {
            case 'auth/invalid-email': return 'Formato de email inválido.';
            case 'auth/user-disabled': return 'Este usuário foi desabilitado.';
            case 'auth/user-not-found': return 'Nenhum usuário encontrado com este email.';
            case 'auth/wrong-password': return 'Senha incorreta.';
            case 'auth/invalid-credential': return 'Credenciais inválidas (email ou senha).'; // Novo no v9+ para erros genéricos
            default: return `Erro desconhecido (${errorCode})`;
        }
    }
});