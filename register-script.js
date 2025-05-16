// register-script.js
import { auth, db } from './firebase-config.js'; // Importa db
import { 
    createUserWithEmailAndPassword,
    updateProfile
    // onAuthStateChanged // Não estritamente necessário aqui se o fluxo principal for para login
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    getDoc,
    serverTimestamp // Para registrar quando o usuário foi criado
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

    // Função para gerar Friend ID de 6 dígitos numérico
    const generateFriendId = () => Math.floor(100000 + Math.random() * 900000).toString();

    // Função para verificar se Friend ID já existe (simplificada)
    // ATENÇÃO: Esta verificação no cliente não é 100% à prova de colisões em alta concorrência.
    // Uma Cloud Function seria mais robusta para garantir unicidade.
    const isFriendIdTaken = async (friendId) => {
        const mappingRef = doc(db, "friendIdMappings", friendId);
        const docSnap = await getDoc(mappingRef);
        return docSnap.exists();
    };

    const createUniqueFriendId = async () => {
        let friendId;
        let taken = true;
        let attempts = 0;
        const maxAttempts = 10; // Evita loop infinito

        while (taken && attempts < maxAttempts) {
            friendId = generateFriendId();
            taken = await isFriendIdTaken(friendId);
            attempts++;
        }
        if (taken) { // Se ainda estiver ocupado após várias tentativas
            throw new Error("Não foi possível gerar um ID de amigo único. Tente novamente.");
        }
        return friendId;
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

            try {
                // 1. Cria o usuário no Firebase Auth
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                // 2. Atualiza o perfil do Firebase Auth com displayName
                await updateProfile(user, { displayName: username });
                console.log("Conta Auth criada e perfil atualizado para:", user.email, "Nome:", username);

                // 3. Gera um Friend ID único
                showMessage('Gerando ID de amigo...', 'success');
                const friendId = await createUniqueFriendId();
                console.log("Friend ID gerado:", friendId);

                // 4. Salva informações adicionais do usuário no Firestore, incluindo o friendId
                const userDocRef = doc(db, "users", user.uid);
                await setDoc(userDocRef, {
                    uid: user.uid,
                    displayName: username,
                    email: user.email,
                    photoURL: user.photoURL || null, // Pode ser nulo inicialmente
                    friendId: friendId,
                    createdAt: serverTimestamp()
                });
                console.log("Documento do usuário salvo no Firestore.");

                // 5. Cria o mapeamento do Friend ID para UID
                const mappingRef = doc(db, "friendIdMappings", friendId);
                await setDoc(mappingRef, {
                    uid: user.uid
                });
                console.log("Mapeamento Friend ID salvo.");

                showMessage(`Conta criada com sucesso! Seu ID de Amigo: ${friendId}. Redirecionando...`, 'success');
                setTimeout(() => { window.location.href = 'login.html'; }, 3000);

            } catch (error) {
                console.error("Erro detalhado ao criar conta:", error);
                showMessage(`Erro ao criar conta: ${mapFirebaseAuthError(error.code || error.message)}`);
            }
        });
    }
    
    function mapFirebaseAuthError(errorCode) {
        if (errorCode.includes("Não foi possível gerar um ID de amigo único")) return errorCode;
        switch (errorCode) {
            case 'auth/invalid-email': return 'Formato de email inválido.';
            case 'auth/email-already-in-use': return 'Este email já está em uso.';
            case 'auth/weak-password': return 'A senha é muito fraca (mínimo 6 caracteres).';
            default: return `Erro (${errorCode})`;
        }
    }
});