// profile-script.js
import { auth } from './firebase-config.js';
import { 
    onAuthStateChanged,
    updateProfile,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    verifyBeforeUpdateEmail,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const userAuthSection = document.querySelector('.user-auth-section');
    const currentYearSpan = document.getElementById('currentYear');
    const siteContent = document.getElementById('site-content');

    const tabPerfil = document.getElementById('tab-perfil');
    const tabSeguranca = document.getElementById('tab-seguranca');
    const sectionPerfil = document.getElementById('section-perfil');
    const sectionSeguranca = document.getElementById('section-seguranca');

    const profileForm = document.getElementById('profile-form');
    const profileUsernameInput = document.getElementById('profile-username');
    const profilePhotoUrlInput = document.getElementById('profile-photo-url-input'); // Input de URL
    const profilePhotoPreviewImg = document.getElementById('profile-photo-preview-img'); // Imagem de preview
    const profileMessageDiv = document.getElementById('profile-message');

    const changePasswordForm = document.getElementById('change-password-form');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
    const passwordMessageDiv = document.getElementById('password-message');

    const changeEmailForm = document.getElementById('change-email-form');
    const currentEmailDisplay = document.getElementById('current-email-display');
    const emailCurrentPasswordInput = document.getElementById('email-current-password');
    const newEmailInput = document.getElementById('new-email');
    const emailMessageDiv = document.getElementById('email-message');
    
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (siteContent) setTimeout(() => siteContent.classList.add('visible'), 100);

    const showMessage = (element, message, type = 'error') => {
        element.textContent = message;
        element.className = 'form-message ' + (type === 'success' ? 'success' : '');
        element.style.display = 'block';
        setTimeout(() => { element.style.display = 'none'; element.textContent = ''; }, 7000);
    };

    const switchTab = (activeTabButton, activeSection) => {
        [tabPerfil, tabSeguranca].forEach(btn => btn.classList.remove('active'));
        [sectionPerfil, sectionSeguranca].forEach(sec => sec.classList.remove('active'));
        activeTabButton.classList.add('active');
        activeSection.classList.add('active');
    };

    if (tabPerfil) tabPerfil.addEventListener('click', () => switchTab(tabPerfil, sectionPerfil));
    if (tabSeguranca) tabSeguranca.addEventListener('click', () => switchTab(tabSeguranca, sectionSeguranca));

    // Atualiza a pré-visualização da foto quando o URL no input muda
    if (profilePhotoUrlInput && profilePhotoPreviewImg) {
        profilePhotoUrlInput.addEventListener('input', () => {
            const newUrl = profilePhotoUrlInput.value.trim();
            if (newUrl) {
                profilePhotoPreviewImg.src = newUrl;
            } else {
                profilePhotoPreviewImg.src = 'imgs/default-avatar.png'; // Volta para o default se o campo estiver vazio
            }
        });
        // Adiciona um error handler para a imagem de preview
        profilePhotoPreviewImg.onerror = () => {
            profilePhotoPreviewImg.src = 'imgs/default-avatar.png'; // Se o URL for inválido/imagem não carregar
            showMessage(profileMessageDiv, 'URL da imagem inválido ou imagem não pôde ser carregada.');
        };
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            if (userAuthSection) {
                const displayName = user.displayName || user.email;
                const photoURL = user.photoURL || 'imgs/default-avatar.png';
                userAuthSection.innerHTML = `
                    <div class="user-info">
                        <a href="profile.html" style="display: flex; align-items: center; text-decoration: none; color: inherit;">
                            <img id="user-photo" src="${photoURL}" alt="Foto">
                            <span id="user-name">${displayName}</span>
                        </a>
                        <button id="logout-button-profile" class="logout-button-style">Sair</button>
                    </div>`;
                document.getElementById('logout-button-profile')?.addEventListener('click', () => signOut(auth).then(() => window.location.href = 'index.html'));
            }

            if (profileUsernameInput) profileUsernameInput.value = user.displayName || '';
            // Preenche o input de URL da foto e a pré-visualização
            if (profilePhotoUrlInput) profilePhotoUrlInput.value = user.photoURL || '';
            if (profilePhotoPreviewImg) profilePhotoPreviewImg.src = user.photoURL || 'imgs/default-avatar.png';
            
            if (currentEmailDisplay) currentEmailDisplay.textContent = user.email;

        } else {
            window.location.href = 'login.html';
        }
    });

    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newUsername = profileUsernameInput.value.trim();
            const newPhotoURL = profilePhotoUrlInput.value.trim(); // Pega o URL do input de texto
            const user = auth.currentUser;
            if (!user) return;

            // Validação simples de URL (opcional, mas bom ter)
            let isValidUrl = true;
            if (newPhotoURL) {
                try {
                    new URL(newPhotoURL); // Tenta criar um objeto URL
                } catch (_) {
                    isValidUrl = false;
                }
            }
            
            if (newPhotoURL && !isValidUrl) {
                showMessage(profileMessageDiv, 'O URL da foto de perfil parece ser inválido.');
                return;
            }


            const profileUpdates = {
                displayName: newUsername,
                photoURL: newPhotoURL // Usa o URL diretamente
            };
            
            showMessage(profileMessageDiv, 'Salvando perfil...', 'success');

            updateProfile(user, profileUpdates)
            .then(() => {
                showMessage(profileMessageDiv, 'Perfil atualizado com sucesso!', 'success');
                // Atualiza header no cliente
                if(document.getElementById('user-name')) document.getElementById('user-name').textContent = newUsername || user.email;
                if(document.getElementById('user-photo')) document.getElementById('user-photo').src = newPhotoURL || 'imgs/default-avatar.png';
                // A pré-visualização já deve estar atualizada pelo listener 'input'
            }).catch((error) => {
                // O erro "Photo URL too long" não deve acontecer com URLs HTTPs normais.
                // Mas outros erros podem ocorrer (ex: URL inválido se o Firebase validar o formato).
                showMessage(profileMessageDiv, `Erro ao atualizar perfil: ${error.message}`);
            });
        });
    }

    // Funções reauthenticateUser, changePasswordForm, changeEmailForm permanecem as mesmas da etapa anterior.
    // Vou incluí-las para garantir que o script esteja completo:
    const reauthenticateUser = (currentPassword) => {
        const user = auth.currentUser;
        if (!user || !user.email) {
             const relevantMessageDiv = passwordMessageDiv.style.display !== 'none' && passwordMessageDiv.offsetParent !== null ? passwordMessageDiv : emailMessageDiv;
             showMessage(relevantMessageDiv, 'Erro: Usuário não encontrado ou sem email associado.');
             return Promise.reject(new Error('Usuário não encontrado ou sem email.'));
        }
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        return reauthenticateWithCredential(user, credential);
    };

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const currentPass = currentPasswordInput.value;
            const newPass = newPasswordInput.value;
            const confirmNewPass = confirmNewPasswordInput.value;

            if (!currentPass || !newPass || !confirmNewPass) {
                showMessage(passwordMessageDiv, 'Por favor, preencha todos os campos de senha.'); return;
            }
            if (newPass !== confirmNewPass) {
                showMessage(passwordMessageDiv, 'As novas senhas não coincidem.'); return;
            }
            if (newPass.length < 6) {
                showMessage(passwordMessageDiv, 'A nova senha deve ter pelo menos 6 caracteres.'); return;
            }
            showMessage(passwordMessageDiv, 'Processando alteração de senha...', 'success');
            reauthenticateUser(currentPass)
                .then(() => updatePassword(auth.currentUser, newPass))
                .then(() => {
                    showMessage(passwordMessageDiv, 'Senha alterada com sucesso!', 'success');
                    changePasswordForm.reset();
                })
                .catch((error) => {
                    if (error.code === 'auth/wrong-password' || error.message.includes("INVALID_LOGIN_CREDENTIALS") || error.code === 'auth/invalid-credential') {
                         showMessage(passwordMessageDiv, 'Senha atual incorreta.');
                    } else {
                         showMessage(passwordMessageDiv, `Erro ao alterar senha: ${error.message}`);
                    }
                });
        });
    }

    if (changeEmailForm) {
        changeEmailForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const currentPass = emailCurrentPasswordInput.value;
            const newMail = newEmailInput.value.trim();
            const user = auth.currentUser;

            if(!user || !currentPass || !newMail) {
                showMessage(emailMessageDiv, 'Preencha a senha atual e o novo email.'); return;
            }
            showMessage(emailMessageDiv, 'Processando alteração de email...', 'success');
            reauthenticateUser(currentPass)
                .then(() => verifyBeforeUpdateEmail(user, newMail))
                .then(() => {
                    showMessage(emailMessageDiv, 'Email de verificação enviado para o novo endereço. Verifique sua caixa de entrada para confirmar.', 'success');
                    changeEmailForm.reset();
                })
                .catch((error) => {
                     if (error.code === 'auth/wrong-password' || error.message.includes("INVALID_LOGIN_CREDENTIALS") || error.code === 'auth/invalid-credential') {
                         showMessage(emailMessageDiv, 'Senha atual incorreta.');
                    } else if (error.code === 'auth/email-already-in-use') {
                        showMessage(emailMessageDiv, 'Este email já está em uso.');
                    } else if (error.code === 'auth/invalid-email') {
                        showMessage(emailMessageDiv, 'O novo email é inválido.');
                    } else {
                         showMessage(emailMessageDiv, `Erro ao alterar email: ${error.message}`);
                    }
                });
        });
    }
    console.log("David's Farm profile script (com URL para foto) carregado!");
});