// register-script.js
import { auth } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword,
    updateProfile, // Para definir o displayName
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('username-input');
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const confirmPasswordInput = document.getElementById('confirm-password-input');
    const registerButton = document.getElementById('register-button');
    const authStatusDiv = document.getElementById('auth-status');

    if (registerButton) {
        registerButton.addEventListener('click', () => {
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            authStatusDiv.textContent = ''; // Limpa mensagens anteriores
            authStatusDiv.className = 'auth-status';


            if (!username || !email || !password || !confirmPassword) {
                authStatusDiv.textContent = 'Por favor, preencha todos os campos.';
                return;
            }
            if (password !== confirmPassword) {
                authStatusDiv.textContent = 'As senhas não coincidem.';
                return;
            }
            if (password.length < 6) {
                authStatusDiv.textContent = 'A senha deve ter pelo menos 6 caracteres.';
                return;
            }

            createUserWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    console.log("Conta criada para:", user.email);

                    // Atualiza o perfil do usuário com o nome de usuário (displayName)
                    return updateProfile(user, {
                        displayName: username
                    });
                })
                .then(() => {
                    console.log("Perfil atualizado com displayName:", username);
                    authStatusDiv.textContent = `Conta criada com sucesso para ${username}! Redirecionando para login...`;
                    authStatusDiv.className = 'success auth-status';
                    // Redireciona para a página de login ou diretamente para o index após um pequeno delay
                    setTimeout(() => {
                        window.location.href = 'login.html'; // Ou 'index.html' se quiser logar automaticamente
                    }, 2000);
                })
                .catch((error) => {
                    console.error("Erro ao criar conta:", error);
                    authStatusDiv.textContent = `Erro ao criar conta: ${mapFirebaseAuthError(error.code)}`;
                });
        });
    }
    
    // Observador do estado de autenticação
    onAuthStateChanged(auth, (user) => {
        if (user) {
            if (window.location.pathname.endsWith('register.html')) {
                 // window.location.href = 'index.html'; // Comentado para evitar loop
                 console.log('Usuário já logado na página de registro.');
            }
        }
    });

    function mapFirebaseAuthError(errorCode) {
        // ... (função mapFirebaseAuthError da versão anterior, pode adicionar mais casos se necessário)
        switch (errorCode) {
            case 'auth/invalid-email': return 'Formato de email inválido.';
            case 'auth/email-already-in-use': return 'Este email já está em uso por outra conta.';
            case 'auth/weak-password': return 'A senha é muito fraca (mínimo 6 caracteres).';
            case 'auth/operation-not-allowed': return 'Criação de conta com email/senha não habilitada.';
            default: return `Erro desconhecido (${errorCode})`;
        }
    }
});