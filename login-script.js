// login-script.js
import { auth } from './firebase-config.js'; // Importa a instância do auth
import { 
    GoogleAuthProvider, 
    signInWithPopup, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const emailLoginButton = document.getElementById('email-login-button');
    const emailSignupButton = document.getElementById('email-signup-button');
    const googleLoginButton = document.getElementById('google-login-button');
    const authStatusDiv = document.getElementById('auth-status');

    // Função Login com Google
    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', () => {
            const provider = new GoogleAuthProvider();
            signInWithPopup(auth, provider)
                .then((result) => {
                    const user = result.user;
                    console.log("Usuário logado com Google:", user);
                    authStatusDiv.textContent = `Login com Google bem-sucedido! Bem-vindo, ${user.displayName || user.email}!`;
                    authStatusDiv.className = 'success'; // Adiciona classe para estilização de sucesso
                    // Redireciona para a página principal após o login
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    console.error("Erro no login com Google:", error);
                    authStatusDiv.textContent = `Erro Google: ${error.message}`;
                    authStatusDiv.className = '';
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
                authStatusDiv.className = '';
                return;
            }
            signInWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    console.log("Usuário logado com email:", user);
                    authStatusDiv.textContent = `Login bem-sucedido! Bem-vindo de volta!`;
                    authStatusDiv.className = 'success';
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    console.error("Erro no login com email:", error);
                    authStatusDiv.textContent = `Erro Email/Senha: ${mapFirebaseAuthError(error.code)}`;
                    authStatusDiv.className = '';
                });
        });
    }

    // Função Criar Conta com Email e Senha
    if (emailSignupButton) {
        emailSignupButton.addEventListener('click', () => {
            const email = emailInput.value;
            const password = passwordInput.value;
            if (!email || !password) {
                authStatusDiv.textContent = 'Por favor, preencha email e senha para criar a conta.';
                authStatusDiv.className = '';
                return;
            }
            if (password.length < 6) {
                authStatusDiv.textContent = 'A senha deve ter pelo menos 6 caracteres.';
                 authStatusDiv.className = '';
                return;
            }
            createUserWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    console.log("Conta criada com email:", user);
                    authStatusDiv.textContent = `Conta criada com sucesso! Bem-vindo!`;
                    authStatusDiv.className = 'success';
                    // Você pode querer atualizar o perfil do usuário aqui (displayName, photoURL) se coletar mais dados
                    // Por exemplo: updateProfile(auth.currentUser, { displayName: "Novo Usuário" }).then(...);
                    window.location.href = 'index.html'; // Loga e redireciona
                })
                .catch((error) => {
                    console.error("Erro ao criar conta com email:", error);
                    authStatusDiv.textContent = `Erro ao criar conta: ${mapFirebaseAuthError(error.code)}`;
                    authStatusDiv.className = '';
                });
        });
    }

    // Observador do estado de autenticação (para redirecionar se já estiver logado)
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Se o usuário já está logado e está na página de login, redireciona para o index.
            // Isso evita que o usuário veja a página de login se já tiver uma sessão ativa.
            console.log('Usuário já logado, redirecionando do login.html para index.html');
            if (window.location.pathname.endsWith('login.html')) { // Verifica se está realmente na página de login
                 window.location.href = 'index.html';
            }
        }
    });

    // Mapeia códigos de erro do Firebase para mensagens mais amigáveis
    function mapFirebaseAuthError(errorCode) {
        switch (errorCode) {
            case 'auth/invalid-email':
                return 'Formato de email inválido.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                return 'Email ou senha incorretos.';
            case 'auth/email-already-in-use':
                return 'Este email já está em uso por outra conta.';
            case 'auth/weak-password':
                return 'A senha é muito fraca. Use pelo menos 6 caracteres.';
            case 'auth/operation-not-allowed':
                return 'Login com email e senha não está habilitado.'; // Verifique no console Firebase
            default:
                return errorCode; // Retorna o código original se não mapeado
        }
    }
});