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

    // Modal elements
    const setPasswordModal = document.getElementById('set-password-modal');
    const modalSetPasswordYes = document.getElementById('modal-set-password-yes');
    const modalSetPasswordNo = document.getElementById('modal-set-password-no');

    const showMessage = (message, type = 'error') => {
        authStatusDiv.textContent = message;
        authStatusDiv.className = 'auth-status ' + (type === 'success' ? 'success' : '');
    };

    const openSetPasswordModal = () => {
        if (setPasswordModal) setPasswordModal.classList.add('visible');
    };
    const closeSetPasswordModal = () => {
        if (setPasswordModal) setPasswordModal.classList.remove('visible');
    };

    if (modalSetPasswordYes) {
        modalSetPasswordYes.addEventListener('click', () => {
            sessionStorage.setItem('promptSetPassword', 'true'); // Sinaliza para profile.html
            closeSetPasswordModal();
            window.location.href = 'profile.html#seguranca'; // Vai para a aba de segurança
        });
    }
    if (modalSetPasswordNo) {
        modalSetPasswordNo.addEventListener('click', () => {
            closeSetPasswordModal();
            window.location.href = 'index.html'; // Ou apenas fecha o modal e continua
        });
    }

    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', () => {
            const provider = new GoogleAuthProvider();
            signInWithPopup(auth, provider)
                .then((result) => {
                    const user = result.user;
                    // Checa se o usuário tem provedor de senha
                    const hasPasswordProvider = user.providerData.some(
                        (providerInfo) => providerInfo.providerId === 'password'
                    );

                    if (!hasPasswordProvider) {
                        openSetPasswordModal(); // Abre o popup se não tiver senha
                    } else {
                        showMessage(`Login com Google bem-sucedido! Redirecionando...`, 'success');
                        window.location.href = 'index.html';
                    }
                })
                .catch((error) => showMessage(`Erro Google: ${error.message}`));
        });
    }

    if (emailLoginButton) {
        emailLoginButton.addEventListener('click', () => {
            const email = emailInput.value;
            const password = passwordInput.value;
            if (!email || !password) {
                showMessage('Por favor, preencha email e senha.'); return;
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
            // Se usuário já logado e está na página de login, verificar se o modal precisa ser mostrado (caso de redirect)
            // No entanto, a lógica do modal é melhor após o clique no botão Google.
            // Para agora, se já logado, podemos apenas redirecionar ou não fazer nada se o modal for o próximo passo.
            console.log('Usuário já logado na página de login.');
        }
    });

    function mapFirebaseAuthError(errorCode) { /* ... (função mapFirebaseAuthError) ... */ 
        switch (errorCode) {
            case 'auth/invalid-email': return 'Formato de email inválido.';
            case 'auth/user-disabled': return 'Este usuário foi desabilitado.';
            case 'auth/user-not-found': return 'Nenhum usuário encontrado com este email.';
            case 'auth/wrong-password': return 'Senha incorreta.';
            case 'auth/invalid-credential': return 'Credenciais inválidas (email ou senha).';
            default: return `Erro desconhecido (${errorCode})`;
        }
    }
    console.log("David's Farm login script (v5) carregado!");
});