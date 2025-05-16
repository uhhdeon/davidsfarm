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

    // Função para verificar se o usuário tem provedor de senha
    const hasPasswordProvider = (user) => {
        if (user && user.providerData) {
            return user.providerData.some(provider => provider.providerId === 'password');
        }
        return false;
    };

    // Função para perguntar sobre definir senha após login com Google
    const askToSetPassword = (user) => {
        // Verifica se logou com Google e não tem senha, e não recusou antes
        const loggedWithGoogle = user.providerData.some(p => p.providerId === 'google.com');
        const alreadyHasPassword = hasPasswordProvider(user);
        const declinedKey = `declinedSetPassword_${user.uid}`;
        const hasDeclined = localStorage.getItem(declinedKey) === 'true';

        if (loggedWithGoogle && !alreadyHasPassword && !hasDeclined) {
            // Usando window.confirm por simplicidade. Um modal customizado seria melhor.
            setTimeout(() => { // Pequeno delay para o usuário processar o login
                if (window.confirm("Você conectou sua conta Google. Gostaria de definir uma senha para também poder entrar com seu email e uma senha no futuro?")) {
                    // Se sim, redireciona para a página de perfil, aba segurança
                    window.location.href = 'profile.html#security'; // Adiciona um hash para focar na aba
                } else {
                    // Se não, marca para não perguntar novamente neste navegador
                    localStorage.setItem(declinedKey, 'true');
                }
            }, 1000); // Delay de 1 segundo
        }
    };


    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', () => {
            const provider = new GoogleAuthProvider();
            signInWithPopup(auth, provider)
                .then((result) => {
                    const user = result.user;
                    showMessage(`Login com Google bem-sucedido! Redirecionando...`, 'success');
                    askToSetPassword(user); // Pergunta sobre definir senha
                    // O redirecionamento principal para index.html ocorrerá após o popup (se houver) ou diretamente
                    if (!user.providerData.some(p => p.providerId === 'google.com') || hasPasswordProvider(user) || localStorage.getItem(`declinedSetPassword_${user.uid}`) === 'true') {
                        window.location.href = 'index.html';
                    }
                    // Se askToSetPassword for redirecionar, esse window.location.href acima pode não ser executado se o usuário clicar "sim" rápido.
                    // Se o usuário clicar "Não", ele será redirecionado para index.html após o popup.
                    // Se clicar "Sim", será redirecionado para profile.html#security.
                    // Para garantir o redirecionamento para index.html se não for para profile:
                    if (window.location.pathname.includes('login.html') && !window.location.hash.includes('security')) {
                         // Garante que se não houver redirecionamento para profile, vá para index.
                         // A lógica de askToSetPassword pode precisar de um callback para o redirecionamento final.
                         // Por ora, se o usuário clicar "não" ou fechar o confirm, ele pode ficar na página de login.
                         // Uma melhoria seria:
                         // askToSetPassword(user).then(redirectUrl => window.location.href = redirectUrl || 'index.html');
                         // Mas window.confirm é síncrono.
                         // Se o usuário não for redirecionado por askToSetPassword (clicou Não ou já tinha senha/recusado)
                         if (!(localStorage.getItem(`declinedSetPassword_${user.uid}`) === 'false' && window.location.href.includes('profile.html#security'))) {
                            setTimeout(() => { window.location.href = 'index.html'; }, 500); // Pequeno delay para o popup.
                         }
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
            console.log('Usuário já logado, considerando redirecionar de login.html');
            // Decide se mostra o popup ou redireciona direto
            const loggedWithGoogle = user.providerData.some(p => p.providerId === 'google.com');
            const alreadyHasPassword = hasPasswordProvider(user);
            const declinedKey = `declinedSetPassword_${user.uid}`;
            const hasDeclined = localStorage.getItem(declinedKey) === 'true';

            if(loggedWithGoogle && !alreadyHasPassword && !hasDeclined) {
                // Se o usuário atualizou a página de login mas ainda não respondeu ao popup
                // askToSetPassword(user); // Pode causar duplo popup. Melhor não aqui.
                // A lógica de redirecionamento precisa ser cuidadosa para não criar loops.
            } else {
                // Se não precisa perguntar, redireciona para index
                // window.location.href = 'index.html';
            }
        }
    });

    function mapFirebaseAuthError(errorCode) {
        // ... (função mapFirebaseAuthError da etapa anterior) ...
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