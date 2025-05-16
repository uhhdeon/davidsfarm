// profile-script.js
import { auth, db } from './firebase-config.js';
import { 
    onAuthStateChanged,
    updateProfile as updateAuthProfile,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    verifyBeforeUpdateEmail,
    signOut,
    deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // ... (todos os seletores do DOM da etapa anterior) ...
    const userAuthSection = document.querySelector('.user-auth-section');
    const currentYearSpan = document.getElementById('currentYear');
    const siteContent = document.getElementById('site-content');
    const tabPerfil = document.getElementById('tab-perfil');
    const tabSeguranca = document.getElementById('tab-seguranca');
    const sectionPerfil = document.getElementById('section-perfil');
    const sectionSeguranca = document.getElementById('section-seguranca');
    const profileForm = document.getElementById('profile-form');
    const profileUsernameInput = document.getElementById('profile-username');
    const profilePhotoUrlInput = document.getElementById('profile-photo-url-input');
    const profilePhotoPreviewImg = document.getElementById('profile-photo-preview-img');
    const profileMessageDiv = document.getElementById('profile-message');
    const profileScratchUsernameInput = document.getElementById('profile-scratch-username');
    const profilePronounsInput = document.getElementById('profile-pronouns');
    const profileDescriptionInput = document.getElementById('profile-description');
    const viewPublicProfileButton = document.getElementById('view-public-profile-button');
    const changePasswordForm = document.getElementById('change-password-form');
    const currentPasswordGroup = document.getElementById('current-password-group');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
    const passwordMessageDiv = document.getElementById('password-message');
    const passwordFormTitle = document.getElementById('password-form-title');
    const newPasswordLabel = document.getElementById('new-password-label');
    const passwordSubmitButton = document.getElementById('password-submit-button');
    const changeEmailForm = document.getElementById('change-email-form');
    const currentEmailDisplay = document.getElementById('current-email-display'); // Será preenchido com auth.currentUser.email
    const emailCurrentPasswordInput = document.getElementById('email-current-password');
    const newEmailInput = document.getElementById('new-email');
    const emailMessageDiv = document.getElementById('email-message');
    const logoutButtonProfilePage = document.getElementById('logout-button-profile-page');
    const deleteAccountButton = document.getElementById('delete-account-button');
    const accountActionMessageDiv = document.getElementById('account-action-message');

    let currentUserForProfile = null;

    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (siteContent) setTimeout(() => siteContent.classList.add('visible'), 100);

    const showMessage = (element, message, type = 'error') => { /* ... (sem alterações) ... */
        element.textContent = message;
        element.className = 'form-message ' + (type === 'success' ? 'success' : '');
        element.style.display = 'block';
        setTimeout(() => { element.style.display = 'none'; element.textContent = ''; }, 7000);
    };
    const switchTab = (activeTabButton, activeSection) => { /* ... (sem alterações) ... */
        [tabPerfil, tabSeguranca].forEach(btn => btn.classList.remove('active'));
        [sectionPerfil, sectionSeguranca].forEach(sec => sec.classList.remove('active'));
        activeTabButton.classList.add('active');
        activeSection.classList.add('active');
    };

    if (tabPerfil) tabPerfil.addEventListener('click', () => switchTab(tabPerfil, sectionPerfil));
    if (tabSeguranca) tabSeguranca.addEventListener('click', () => switchTab(tabSeguranca, sectionSeguranca));
    if (profilePhotoUrlInput && profilePhotoPreviewImg) { /* ... (preview da foto, sem alterações) ... */
        profilePhotoUrlInput.addEventListener('input', () => {
            const newUrl = profilePhotoUrlInput.value.trim();
            profilePhotoPreviewImg.src = newUrl || 'imgs/default-avatar.png';
        });
        profilePhotoPreviewImg.onerror = () => {
            profilePhotoPreviewImg.src = 'imgs/default-avatar.png';
            showMessage(profileMessageDiv, 'URL da imagem inválido ou não pôde ser carregada.');
        };
    }
    const hasPasswordProvider = (user) => { /* ... (sem alterações) ... */
        return user.providerData.some(provider => provider.providerId === 'password');
    };
    const setupPasswordSectionUI = (userHasPassword) => { /* ... (sem alterações) ... */
        if (userHasPassword) {
            if (currentPasswordGroup) currentPasswordGroup.style.display = 'block';
            if (passwordFormTitle) passwordFormTitle.textContent = 'Alterar Senha';
            if (newPasswordLabel) newPasswordLabel.textContent = 'Nova Senha:';
            if (passwordSubmitButton) passwordSubmitButton.textContent = 'Alterar Senha';
            if (currentPasswordInput) currentPasswordInput.required = true;
        } else {
            if (currentPasswordGroup) currentPasswordGroup.style.display = 'none';
            if (passwordFormTitle) passwordFormTitle.textContent = 'Definir Nova Senha';
            if (newPasswordLabel) newPasswordLabel.textContent = 'Defina sua Senha:';
            if (passwordSubmitButton) passwordSubmitButton.textContent = 'Definir Senha';
            if (currentPasswordInput) currentPasswordInput.required = false;
        }
    };

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUserForProfile = user;
            if (userAuthSection) { /* ... (preenchimento do header, sem alterações) ... */
                const displayName = user.displayName || user.email.split('@')[0];
                const photoURL = user.photoURL || 'imgs/default-avatar.png';
                userAuthSection.innerHTML = `
                    <a href="profile.html" class="user-info-link">
                        <div class="user-info"> <img id="user-photo" src="${photoURL}" alt="Foto"> <span id="user-name">${displayName}</span> </div>
                    </a>`;
            }

            // Carrega dados do Firestore para preencher o formulário de perfil
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userDataFromFirestore = userDocSnap.data();
                if (profileUsernameInput) profileUsernameInput.value = userDataFromFirestore.displayName || user.displayName || '';
                if (profilePhotoUrlInput) profilePhotoUrlInput.value = userDataFromFirestore.photoURL || user.photoURL || '';
                if (profilePhotoPreviewImg) profilePhotoPreviewImg.src = userDataFromFirestore.photoURL || user.photoURL || 'imgs/default-avatar.png';
                if (profileScratchUsernameInput) profileScratchUsernameInput.value = userDataFromFirestore.scratchUsername || '';
                if (profilePronounsInput) profilePronounsInput.value = userDataFromFirestore.pronouns || '';
                if (profileDescriptionInput) profileDescriptionInput.value = userDataFromFirestore.profileDescription || '';
            } else {
                // Se não há doc no Firestore, preenche com dados do Auth (ensureUserProfileAndFriendId deveria ter criado)
                if (profileUsernameInput) profileUsernameInput.value = user.displayName || '';
                if (profilePhotoUrlInput) profilePhotoUrlInput.value = user.photoURL || '';
                if (profilePhotoPreviewImg) profilePhotoPreviewImg.src = user.photoURL || 'imgs/default-avatar.png';
                console.warn("Documento de usuário não encontrado no Firestore para preenchimento inicial do perfil. Isso é inesperado.");
            }
            
            // Exibe o email do Auth (NÃO do Firestore)
            if (currentEmailDisplay) currentEmailDisplay.textContent = user.email; 
            
            setupPasswordSectionUI(hasPasswordProvider(user));
            if (window.location.hash === '#security') { /* ... (lógica do hash, sem alterações) ... */
                 switchTab(tabSeguranca, sectionSeguranca);
                 if (!hasPasswordProvider(user)) {
                    showMessage(passwordMessageDiv, 'Você acessou com Google. Defina uma senha aqui se desejar.', 'success');
                 }
                 window.location.hash = ''; 
            }
        } else {
            window.location.href = 'login.html';
        }
    });

    if (viewPublicProfileButton) { /* ... (sem alterações) ... */
        viewPublicProfileButton.addEventListener('click', () => {
            if (currentUserForProfile) {
                window.location.href = `public-profile.html?uid=${currentUserForProfile.uid}`;
            } else {
                showMessage(profileMessageDiv, 'Não foi possível determinar o usuário para visualizar o perfil.');
            }
        });
    }

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newUsername = profileUsernameInput.value.trim();
            const newPhotoURL = profilePhotoUrlInput.value.trim() || null; // Envia null se vazio
            const newScratchUsername = profileScratchUsernameInput.value.trim();
            const newPronouns = profilePronounsInput.value.trim();
            const newDescription = profileDescriptionInput.value.trim();

            const user = auth.currentUser;
            if (!user) return;

            let isValidUrl = true;
            if (newPhotoURL) { try { new URL(newPhotoURL); } catch (_) { isValidUrl = false; } }
            if (newPhotoURL && !isValidUrl) {
                showMessage(profileMessageDiv, 'O URL da foto de perfil parece ser inválido.'); return;
            }

            const authProfileUpdates = {
                displayName: newUsername,
                photoURL: newPhotoURL 
            };
            // Dados para o Firestore NÃO INCLUEM EMAIL
            const firestoreProfileUpdates = {
                displayName: newUsername,
                photoURL: newPhotoURL,
                scratchUsername: newScratchUsername,
                pronouns: newPronouns,
                profileDescription: newDescription,
                uid: user.uid // Garante que o UID está lá para a regra de 'create' se for a primeira vez
            };
            
            showMessage(profileMessageDiv, 'Salvando perfil...', 'success');
            try {
                await updateAuthProfile(user, authProfileUpdates);
                const userDocRef = doc(db, "users", user.uid);
                // Usar set com merge para criar se não existir, ou atualizar/adicionar campos
                await setDoc(userDocRef, firestoreProfileUpdates, { merge: true }); 
                showMessage(profileMessageDiv, 'Perfil atualizado com sucesso!', 'success');
                if(document.getElementById('user-name')) document.getElementById('user-name').textContent = newUsername || user.email.split('@')[0];
                if(document.getElementById('user-photo')) document.getElementById('user-photo').src = newPhotoURL || 'imgs/default-avatar.png';
            } catch (error) {
                console.error("Erro ao atualizar perfil:", error);
                showMessage(profileMessageDiv, `Erro ao atualizar perfil: ${error.message}`);
            }
        });
    }
    
    const reauthenticateUser = (currentPassword) => { /* ... (sem alterações) ... */
        const user = currentUserForProfile || auth.currentUser;
        if (!user || !user.email) {
             const relevantMessageDiv = passwordMessageDiv.style.display !== 'none' && passwordMessageDiv.offsetParent !== null ? passwordMessageDiv : (emailMessageDiv.style.display !== 'none' && emailMessageDiv.offsetParent !== null ? emailMessageDiv : accountActionMessageDiv);
             showMessage(relevantMessageDiv, 'Erro: Usuário não encontrado ou sem email associado.');
             return Promise.reject(new Error('Usuário não encontrado ou sem email.'));
        }
        const credential = EmailAuthProvider.credential(user.email, currentPassword); // Usa o email do Auth
        return reauthenticateWithCredential(user, credential);
    };

    if (changePasswordForm) { /* ... (sem alterações) ... */ }
    if (changeEmailForm) { /* ... (sem alterações, mas a exibição do email atual já pega do Auth) ... */ }
    if (logoutButtonProfilePage) { /* ... (sem alterações) ... */ }
    if (deleteAccountButton) { /* ... (sem alterações) ... */ }

    console.log("David's Farm profile script (v7 - sem email no Firestore) carregado!");
});