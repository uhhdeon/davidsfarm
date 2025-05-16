// register-script.js
import { auth, db, ensureUserProfileAndFriendId } from './firebase-config.js'; // Importa ensureUserProfileAndFriendId
import { 
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// setDoc e serverTimestamp não são mais necessários aqui diretamente se ensureUserProfileAndFriendId cuida disso
// mas createUniqueFriendId foi movido, então a chamada direta a ele não é mais feita aqui.

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
        registerButton.addEventListener('click', async () => {
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            showMessage(''); 

            if (!username || !email || !password || !confirmPassword) {
                showMessage('Por favor, preencha todos os campos.'); return;
            }
            if (password !== confirmPassword) {
                showMessage('As senhas não coincidem.'); return;
            }
            if (password.length < 6) {
                showMessage('A senha deve ter pelo menos 6 caracteres.'); return;
            }
            
            showMessage('Criando conta...', 'success');

            try {
                // 1. Cria o usuário no Firebase Auth
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                // 2. Atualiza o perfil do Firebase Auth com displayName
                // O photoURL pode ser adicionado depois, na página de perfil
                await updateProfile(user, { displayName: username });
                console.log("Conta Auth criada e perfil atualizado para:", user.email, "Nome:", username);

                // 3. Garante que o perfil do Firestore e o Friend ID sejam criados
                // Esta função agora também salva o displayName e email no Firestore.
                const userProfile = await ensureUserProfileAndFriendId(user); 

                if (userProfile && userProfile.friendId) {
                    showMessage(`Conta criada com sucesso! Seu ID de Amigo: ${userProfile.friendId}. Redirecionando...`, 'success');
                } else if (userProfile) { // Perfil criado, mas talvez o friendId tenha falhado (raro)
                    showMessage(`Conta criada! Não foi possível gerar ID de Amigo no momento. Tente atualizar seu perfil. Redirecionando...`, 'success');
                } else { // Falha geral na criação do perfil Firestore
                     throw new Error("Falha ao criar perfil no banco de dados.");
                }
                
                // 4. Redireciona para a PÁGINA INICIAL (index.html)
                // O onAuthStateChanged no script.js do index.html vai pegar o usuário logado.
                setTimeout(() => { window.location.href = 'index.html'; }, 2500);

            } catch (error) {
                console.error("Erro detalhado ao criar conta:", error);
                let errorMessage = error.message;
                if (error.code) {
                    errorMessage = mapFirebaseAuthError(error.code);
                } else if (error.message === "FRIEND_ID_GENERATION_FAILED") {
                    errorMessage = "Não foi possível gerar um ID de amigo único no momento. Tente novamente mais tarde.";
                }
                showMessage(`Erro ao criar conta: ${errorMessage}`);
            }
        });
    }
    
    function mapFirebaseAuthError(errorCode) {
        // ... (função mapFirebaseAuthError da etapa anterior) ...
        switch (errorCode) {
            case 'auth/invalid-email': return 'Formato de email inválido.';
            case 'auth/email-already-in-use': return 'Este email já está em uso.';
            case 'auth/weak-password': return 'A senha é muito fraca (mínimo 6 caracteres).';
            default: return `Erro (${errorCode})`;
        }
    }
    console.log("David's Farm register script (v7 - com ensureUserProfile) carregado!");
});