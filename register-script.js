// register-script.js
import { auth } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword,
    updateProfile,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('username-input');
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const confirmPasswordInput = document.getElementById('confirm-password-input');
    const registerButton = document.getElementById('register-button');
    const authStatusDiv = document.getElementById('auth-status');

    const showMessage = (message, type = 'error') => {
        authStatusDiv.textContent = message;
        authStatusDiv.className = 'auth-status ' + (type === 'success' ? 'success' : '');
    };

    if (registerButton) {
        registerButton.addEventListener('click', () => {
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            showMessage(''); // Limpa mensagens anteriores

            if (!username || !email || !password || !confirmPassword) {
                showMessage('Por favor, preencha todos os campos.'); return;
            }
            if (password !== confirmPassword) {
                showMessage('As senhas não coincidem.'); return;
            }
            if (password.length < 6) {
                showMessage('A senha deve ter pelo menos 6 caracteres.'); return;
            }

            createUserWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    return updateProfile(user, { displayName: username });
                })
                .then(() => {
                    showMessage(`Conta criada com sucesso para ${username}! Redirecionando...`, 'success');
                    setTimeout(() => { window.location.href = 'login.html'; }, 2000);
                })
                .catch((error) => showMessage(`Erro ao criar conta: ${mapFirebaseAuthError(error.code)}`));
        });
    }
    
    onAuthStateChanged(auth, (user) => {
        if (user && window.location.pathname.includes('register.html')) {
             console.log('Usuário já logado, na página de registro.');
            // window.location.href = 'index.html'; // Descomente se quiser redirecionamento agressivo
        }
    });

    function mapFirebaseAuthError(errorCode) {
        switch (errorCode) {
            case 'auth/invalid-email': return 'Formato de email inválido.';
            case 'auth/email-already-in-use': return 'Este email já está em uso.';
            case 'auth/weak-password': return 'A senha é muito fraca (mínimo 6 caracteres).';
            case 'auth/operation-not-allowed': return 'Criação de conta não habilitada.';
            default: return `Erro desconhecido (${errorCode})`;
        }
    }
});