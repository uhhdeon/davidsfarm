// login-script.js
import { auth, db } from './firebase-config.js'; // Importa db
import { 
    GoogleAuthProvider, 
    signInWithPopup, 
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    setDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; // Firestore functions

document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const emailLoginButton = document.getElementById('login-button-email');
    const googleLoginButton = document.getElementById('google-login-button');
    const authStatusDiv = document.getElementById('auth-status');

    const showMessage = (message, type = 'error') => { /* ... (sem alterações) ... */
        authStatusDiv.textContent = message;
        authStatusDiv.className = 'auth-status ' + (type === 'success' ? 'success' : '');
    };

    // --- COPIAR ensureUserProfileExists e suas funções auxiliares AQUI ---
    // (generateFriendIdInternal, isFriendIdTakenInternal, createUniqueFriendIdInternal)
    // --- para dentro deste escopo ou importar de um utils.js ---
    async function ensureUserProfileExists(user, dbInstance) { // authInstance não é necessário aqui
        if (!user) return null;
        const userDocRef = doc(dbInstance, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
            console.log(`Perfil para ${user.uid} (Google login) não encontrado. Criando...`);
            const generateFriendIdInternal = () => Math.floor(100000 + Math.random() * 900000).toString();
            const isFriendIdTakenInternal = async (friendId) => {
                const mappingRef = doc(dbInstance, "friendIdMappings", friendId);
                const docSnapInternal = await getDoc(mappingRef);
                return docSnapInternal.exists();
            };
            const createUniqueFriendIdInternal = async () => {
                let friendId; let taken = true; let attempts = 0; const maxAttempts = 10;
                while (taken && attempts < maxAttempts) {
                    friendId = generateFriendIdInternal();
                    taken = await isFriendIdTakenInternal(friendId); attempts++;
                }
                if (taken) { console.error("Falha ao gerar friendId (Google login)"); return null; }
                return friendId;
            };
            try {
                const friendId = await createUniqueFriendIdInternal();
                if (!friendId) throw new Error("Falha ao gerar friendId para novo perfil Google.");
                const userProfileData = {
                    uid: user.uid, displayName: user.displayName || user.email, email: user.email,
                    photoURL: user.photoURL || null, friendId: friendId, createdAt: serverTimestamp()
                };
                await setDoc(userDocRef, userProfileData);
                await setDoc(doc(dbInstance, "friendIdMappings", friendId), { uid: user.uid });
                console.log("Perfil e Friend ID criados para usuário Google:", user.uid);
                return { ...userProfileData, id: user.uid };
            } catch (error) { console.error("Erro ao criar perfil Firestore para usuário Google:", error); return null;}
        } else { return { ...userDocSnap.data(), id: userDocSnap.id }; }
    }
    // --- FIM de ensureUserProfileExists e auxiliares ---


    const hasPasswordProvider = (user) => { /* ... (sem alterações da etapa anterior) ... */
        if (user && user.providerData) {
            return user.providerData.some(provider => provider.providerId === 'password');
        }
        return false;
    };

    const askToSetPassword = (user) => { /* ... (sem alterações da etapa anterior) ... */
        const loggedWithGoogle = user.providerData.some(p => p.providerId === 'google.com');
        const alreadyHasPassword = hasPasswordProvider(user);
        const declinedKey = `declinedSetPassword_${user.uid}`;
        const hasDeclined = localStorage.getItem(declinedKey) === 'true';
        if (loggedWithGoogle && !alreadyHasPassword && !hasDeclined) {
            setTimeout(() => {
                if (window.confirm("Você conectou sua conta Google. Gostaria de definir uma senha para também poder entrar com seu email e uma senha no futuro?")) {
                    window.location.href = 'profile.html#security';
                } else {
                    localStorage.setItem(declinedKey, 'true');
                }
            }, 1000);
        }
    };


    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', () => {
            const provider = new GoogleAuthProvider();
            signInWithPopup(auth, provider)
                .then(async (result) => { // Adicionado async aqui
                    const user = result.user;
                    
                    // Garante que o perfil e friendId existam/sejam criados
                    await ensureUserProfileExists(user, db); 
                    
                    // Sinaliza para o index.html sobre o popup (lógica anterior, pode ser mantida ou ajustada)
                    sessionStorage.setItem('checkAssignPasswordForUser', user.uid);
                    
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    console.error("Erro no login com Google:", error);
                    showMessage(`Erro Google: ${error.message}`);
                });
        });
    }

    if (emailLoginButton) { /* ... (sem alterações) ... */
        emailLoginButton.addEventListener('click', () => {
            const email = emailInput.value;
            const password = passwordInput.value;
            if (!email || !password) {
                showMessage('Por favor, preencha email e senha.'); return;
            }
            signInWithEmailAndPassword(auth, email, password)
                .then(() => { window.location.href = 'index.html'; })
                .catch((error) => showMessage(`Erro Email/Senha: ${mapFirebaseAuthError(error.code)}`));
        });
    }

    onAuthStateChanged(auth, (user) => { /* ... (lógica de onAuthStateChanged da etapa anterior, pode ser simplificada) ... */
        if (user && window.location.pathname.includes('login.html')) {
            const checkAssignFlag = sessionStorage.getItem('checkAssignPasswordForUser');
            if (!checkAssignFlag || checkAssignFlag !== user.uid) {
                 // Se não estamos no meio do fluxo de "checkAssignPassword", e já está logado,
                 // poderia redirecionar para index.html, mas cuidado com loops.
                 // console.log('Usuário já logado na página de login, possível redirecionamento.');
            }
        }
    });

    function mapFirebaseAuthError(errorCode) { /* ... (sem alterações) ... */
        switch (errorCode) {
            case 'auth/invalid-email': return 'Formato de email inválido.';
            case 'auth/user-disabled': return 'Este usuário foi desabilitado.';
            case 'auth/user-not-found': return 'Nenhum usuário encontrado com este email.';
            case 'auth/wrong-password': return 'Senha incorreta.';
            case 'auth/invalid-credential': return 'Credenciais inválidas (email ou senha).';
            default: return `Erro desconhecido (${errorCode})`;
        }
    }
    console.log("David's Farm login script (v7 - ensureProfile) carregado!");
});