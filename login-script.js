// login-script.js
import { auth } from './firebase-config.js';
import { 
    GoogleAuthProvider, 
    signInWithPopup, 
    signInWithEmailAndPassword,
    onAuthStateChanged // Mantido para consistência, embora a lógica principal de onAuthStateChanged aqui seja simples
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
                .then((result) => {
                    const user = result.user;
                    // Sinaliza para o index.html que um login com Google ocorreu
                    // e que a verificação para definir senha deve ser feita.
                    // Usamos user.uid para ser específico para este login.
                    sessionStorage.setItem('checkAssignPasswordForUser', user.uid);
                    
                    // Redireciona IMEDIATAMENTE para a página inicial
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    console.error("Erro no login com Google:", error);
                    showMessage(`Erro Google: ${error.message}`);
                });
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
                    // Login com email/senha não precisa do popup, apenas redireciona.
                    window.location.href = 'index.html';
                })
                .catch((error) => showMessage(`Erro Email/Senha: ${mapFirebaseAuthError(error.code)}`));
        });
    }

    // O onAuthStateChanged aqui pode ser simplificado ou removido se a única ação
    // era redirecionar usuários já logados, pois isso pode ser feito de forma mais robusta
    // ao tentar acessar a página de login quando já se está logado (ex: no script principal).
    onAuthStateChanged(auth, (user) => {
        if (user && window.location.pathname.includes('login.html')) {
            // Se o usuário de alguma forma chega na página de login já autenticado,
            // e não é o fluxo de 'checkAssignPassword', redireciona para o início.
            const checkAssignFlag = sessionStorage.getItem('checkAssignPasswordForUser');
            if (!checkAssignFlag || checkAssignFlag !== user.uid) {
                 console.log('Usuário já logado na página de login, redirecionando para index.html');
                 // window.location.href = 'index.html'; // Pode causar loop se o index.html redirecionar de volta.
                                                      // Melhor deixar o index.html lidar com o estado logado.
            }
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
    console.log("David's Farm login script (v6 - com sessionStorage flag) carregado!");
});