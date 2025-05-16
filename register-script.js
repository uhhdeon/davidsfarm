// register-script.js
import { auth, db, ensureUserProfileAndFriendId } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('username-input');
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const confirmPasswordInput = document.getElementById('confirm-password-input');
    const registerButton = document.getElementById('register-button');
    const authStatusDiv = document.getElementById('auth-status');

    const showMessage = (message, type = 'error') => { /* ... (sem alterações) ... */
        authStatusDiv.textContent = message;
        authStatusDiv.className = 'auth-status ' + (type === 'success' ? 'success' : '');
    };

    if (registerButton) {
        registerButton.addEventListener('click', async () => {
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            showMessage(''); 
            if (!username || !email || !password || !confirmPassword) { /* ... (validações como antes) ... */
                showMessage('Por favor, preencha todos os campos.'); return;
            }
            if (password !== confirmPassword) { showMessage('As senhas não coincidem.'); return; }
            if (password.length < 6) { showMessage('A senha deve ter pelo menos 6 caracteres.'); return; }
            showMessage('Criando conta...', 'success');
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await updateProfile(user, { displayName: username });
                console.log("Conta Auth criada e perfil Auth atualizado para:", user.email, "Nome:", username);

                // ensureUserProfileAndFriendId agora NÃO salva o email no Firestore.
                const userProfile = await ensureUserProfileAndFriendId(user); 

                if (userProfile && userProfile.friendId) {
                    showMessage(`Conta criada com sucesso! Seu ID de Amigo: ${userProfile.friendId}. Redirecionando...`, 'success');
                } else if (userProfile) {
                    showMessage(`Conta criada! Problema ao gerar ID de Amigo. Tente recarregar. Redirecionando...`, 'success');
                } else {
                     throw new Error("Falha ao criar/processar perfil no banco de dados.");
                }
                setTimeout(() => { window.location.href = 'index.html'; }, 2500);
            } catch (error) {
                console.error("Erro detalhado ao criar conta:", error);
                let errorMessage = error.message;
                if (error.code) { errorMessage = mapFirebaseAuthError(error.code); }
                else if (error.message === "FRIEND_ID_GENERATION_FAILED") { errorMessage = "Não foi possível gerar um ID de amigo único. Tente mais tarde."; }
                showMessage(`Erro ao criar conta: ${errorMessage}`);
            }
        });
    }
    function mapFirebaseAuthError(errorCode) { /* ... (sem alterações) ... */
        switch (errorCode) {
            case 'auth/invalid-email': return 'Formato de email inválido.';
            case 'auth/email-already-in-use': return 'Este email já está em uso.';
            case 'auth/weak-password': return 'A senha é muito fraca (mínimo 6 caracteres).';
            default: return `Erro (${errorCode})`;
        }
    }
    console.log("David's Farm register script (v8 - sem email no Firestore Doc) carregado!");
});