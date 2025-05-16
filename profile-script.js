// profile-script.js
import { auth } from './firebase-config.js';
import { 
    onAuthStateChanged,
    updateProfile,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    verifyBeforeUpdateEmail,
    signOut,
    deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    // ... (seletores do DOM da etapa anterior)
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
    const changePasswordForm = document.getElementById('change-password-form');
    const currentPasswordGroup = document.getElementById('current-password-group'); // Novo seletor
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
    const passwordMessageDiv = document.getElementById('password-message');
    const passwordFormTitle = document.getElementById('password-form-title'); // Novo
    const newPasswordLabel = document.getElementById('new-password-label'); // Novo
    const passwordSubmitButton = document.getElementById('password-submit-button'); // Novo
    const changeEmailForm = document.getElementById('change-email-form');
    const currentEmailDisplay = document.getElementById('current-email-display');
    const emailCurrentPasswordInput = document.getElementById('email-current-password');
    const newEmailInput = document.getElementById('new-email');
    const emailMessageDiv = document.getElementById('email-message');
    const logoutButtonProfilePage = document.getElementById('logout-button-profile-page');
    const deleteAccountButton = document.getElementById('delete-account-button');
    const accountActionMessageDiv = document.getElementById('account-action-message');

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

    if (profilePhotoUrlInput && profilePhotoPreviewImg) { /* ... (sem alterações) ... */
        profilePhotoUrlInput.addEventListener('input', () => {
            const newUrl = profilePhotoUrlInput.value.trim();
            profilePhotoPreviewImg.src = newUrl || 'imgs/default-avatar.png';
        });
        profilePhotoPreviewImg.onerror = () => {
            profilePhotoPreviewImg.src = 'imgs/default-avatar.png';
            showMessage(profileMessageDiv, 'URL da imagem inválido ou imagem não pôde ser carregada.');
        };
    }
    
    // Função para verificar se o usuário tem provedor de senha
    const hasPasswordProvider = (user) => {
        if (user && user.providerData) {
            return user.providerData.some(provider => provider.providerId === 'password');
        }
        return false;
    };

    // Função para configurar a UI da seção de senha
    const setupPasswordSectionUI = (userHasPassword) => {
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
            if (currentPasswordInput) currentPasswordInput.required = false; // Não é necessário se não tem senha atual
        }
    };


    onAuthStateChanged(auth, (user) => {
        if (user) {
            // ... (preenchimento do header e dados do perfil - sem alterações) ...
            if (userAuthSection) {
                const displayName = user.displayName || user.email;
                const photoURL = user.photoURL || 'imgs/default-avatar.png';
                userAuthSection.innerHTML = `
                    <a href="profile.html" class="user-info-link">
                        <div class="user-info">
                            <img id="user-photo" src="${photoURL}" alt="Foto do Usuário">
                            <span id="user-name">${displayName}</span>
                        </div>
                    </a>`;
            }
            if (profileUsernameInput) profileUsernameInput.value = user.displayName || '';
            if (profilePhotoUrlInput) profilePhotoUrlInput.value = user.photoURL || '';
            if (profilePhotoPreviewImg) profilePhotoPreviewImg.src = user.photoURL || 'imgs/default-avatar.png';
            if (currentEmailDisplay) currentEmailDisplay.textContent = user.email;

            // Configura a UI da seção de senha com base no provedor de senha
            setupPasswordSectionUI(hasPasswordProvider(user));

            // Verifica se foi redirecionado para definir senha
            if (window.location.hash === '#security' && !hasPasswordProvider(user)) {
                 switchTab(tabSeguranca, sectionSeguranca); // Ativa a aba de segurança
                 showMessage(passwordMessageDiv, 'Você acessou com Google. Defina uma senha aqui se desejar.', 'success');
                 window.location.hash = ''; // Limpa o hash para não mostrar a mensagem de novo no refresh
            }


        } else {
            window.location.href = 'login.html';
        }
    });

    if (profileForm) { /* ... (sem alterações) ... */
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newUsername = profileUsernameInput.value.trim();
            const newPhotoURL = profilePhotoUrlInput.value.trim();
            const user = auth.currentUser;
            if (!user) return;
            let isValidUrl = true;
            if (newPhotoURL) { try { new URL(newPhotoURL); } catch (_) { isValidUrl = false; } }
            if (newPhotoURL && !isValidUrl) {
                showMessage(profileMessageDiv, 'O URL da foto de perfil parece ser inválido.'); return;
            }
            const profileUpdates = { displayName: newUsername, photoURL: newPhotoURL };
            showMessage(profileMessageDiv, 'Salvando perfil...', 'success');
            updateProfile(user, profileUpdates)
            .then(() => {
                showMessage(profileMessageDiv, 'Perfil atualizado com sucesso!', 'success');
                if(document.getElementById('user-name')) document.getElementById('user-name').textContent = newUsername || user.email;
                if(document.getElementById('user-photo')) document.getElementById('user-photo').src = newPhotoURL || 'imgs/default-avatar.png';
            }).catch((error) => showMessage(profileMessageDiv, `Erro ao atualizar perfil: ${error.message}`));
        });
    }
    
    const reauthenticateUser = (currentPassword) => { /* ... (sem alterações) ... */
        const user = auth.currentUser;
        if (!user || !user.email) {
             const relevantMessageDiv = passwordMessageDiv.style.display !== 'none' && passwordMessageDiv.offsetParent !== null 
                                     ? passwordMessageDiv 
                                     : (emailMessageDiv.style.display !== 'none' && emailMessageDiv.offsetParent !== null 
                                        ? emailMessageDiv 
                                        : accountActionMessageDiv);
             showMessage(relevantMessageDiv, 'Erro: Usuário não encontrado ou sem email associado.');
             return Promise.reject(new Error('Usuário não encontrado ou sem email.'));
        }
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        return reauthenticateWithCredential(user, credential);
    };

    // Alterar/Definir Senha
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            if (!user) return;

            const userActuallyHasPassword = hasPasswordProvider(user);
            const currentPass = currentPasswordInput.value;
            const newPass = newPasswordInput.value;
            const confirmNewPass = confirmNewPasswordInput.value;

            if (userActuallyHasPassword && !currentPass) {
                showMessage(passwordMessageDiv, 'Por favor, insira sua senha atual para alterá-la.'); return;
            }
            if (!newPass || !confirmNewPass) {
                showMessage(passwordMessageDiv, 'Por favor, preencha a nova senha e a confirmação.'); return;
            }
            if (newPass !== confirmNewPass) {
                showMessage(passwordMessageDiv, 'As novas senhas não coincidem.'); return;
            }
            if (newPass.length < 6) {
                showMessage(passwordMessageDiv, 'A nova senha deve ter pelo menos 6 caracteres.'); return;
            }
            
            showMessage(passwordMessageDiv, userActuallyHasPassword ? 'Processando alteração de senha...' : 'Definindo nova senha...', 'success');

            const processUpdatePassword = () => {
                updatePassword(user, newPass)
                    .then(() => {
                        showMessage(passwordMessageDiv, userActuallyHasPassword ? 'Senha alterada com sucesso!' : 'Senha definida com sucesso!', 'success');
                        changePasswordForm.reset();
                        setupPasswordSectionUI(true); // Agora o usuário TEM uma senha
                        // Limpar o localStorage se ele tinha recusado antes
                        localStorage.removeItem(`declinedSetPassword_${user.uid}`);
                    })
                    .catch((error) => {
                         showMessage(passwordMessageDiv, `Erro ao ${userActuallyHasPassword ? 'alterar' : 'definir'} senha: ${error.message}`);
                    });
            };

            if (userActuallyHasPassword) {
                reauthenticateUser(currentPass)
                    .then(processUpdatePassword)
                    .catch((error) => {
                        if (error.code === 'auth/wrong-password' || error.message.includes("INVALID_LOGIN_CREDENTIALS") || error.code === 'auth/invalid-credential') {
                             showMessage(passwordMessageDiv, 'Senha atual incorreta.');
                        } else {
                             showMessage(passwordMessageDiv, `Erro na reautenticação: ${error.message}`);
                        }
                    });
            } else {
                // Se não tem senha, pode definir diretamente (updatePassword também funciona para adicionar)
                processUpdatePassword();
            }
        });
    }

    if (changeEmailForm) { /* ... (lógica do changeEmailForm, sem grandes alterações, mas usa reauthenticateUser) ... */
        changeEmailForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const currentPass = document.getElementById('email-current-password').value;
            const newMail = document.getElementById('new-email').value.trim();
            const user = auth.currentUser;

            if(!user || !currentPass || !newMail) {
                showMessage(emailMessageDiv, 'Preencha a senha atual e o novo email.'); return;
            }
             // Verifica se o usuário tem senha para poder reautenticar
            if (!hasPasswordProvider(user)) {
                showMessage(emailMessageDiv, 'Você precisa definir uma senha para sua conta antes de poder alterar o email.');
                // Opcional: focar na aba de segurança para definir senha
                // switchTab(tabSeguranca, sectionSeguranca);
                return;
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
    
    if (logoutButtonProfilePage) { /* ... (sem alterações) ... */
        logoutButtonProfilePage.addEventListener('click', () => {
            signOut(auth)
                .then(() => { window.location.href = 'index.html'; })
                .catch((error) => showMessage(accountActionMessageDiv, `Erro ao sair: ${error.message}`));
        });
    }
    if (deleteAccountButton) { /* ... (sem alterações, mas usa reauthenticateUser) ... */
        deleteAccountButton.addEventListener('click', () => {
            const user = auth.currentUser;
            if (!user) return;
            if (!window.confirm('Você tem CERTEZA ABSOLUTA que deseja deletar sua conta? Esta ação não pode ser desfeita.')) return;
            
            if (!hasPasswordProvider(user)) {
                // Se o usuário não tem senha (ex: só logou com Google e não definiu senha),
                // a deleção direta pode funcionar, mas é mais seguro pedir re-login recente.
                // Para este caso, vamos permitir a deleção direta se for o único provedor.
                // Ou, melhor ainda, forçar o logout e pedir para logar com o provedor específico
                // antes de deletar, se a API exigir autenticação recente.
                // Para simplificar aqui:
                if(user.providerData.length === 1 && user.providerData[0].providerId === 'google.com') {
                     // Se só tem Google, pode ser que deleteUser funcione sem reauth de senha.
                     // Mas o Firebase geralmente quer reauth para delete.
                     // Este caso pode precisar de logout e re-login com Google para ter um token recente.
                     showMessage(accountActionMessageDiv, 'Para deletar uma conta Google, por favor, saia e entre novamente para confirmar sua identidade recente, depois tente deletar.');
                     return;
                } else {
                    // Se tem outros provedores, ou se tem provedor de senha, a reautenticação com senha é necessária
                    showMessage(accountActionMessageDiv, 'Você precisa ter uma senha definida e autenticada recentemente para deletar a conta. Se você só usa login Google, tente sair e entrar novamente.');
                    return;
                }
            }

            const currentPassword = window.prompt('Para confirmar a exclusão, por favor, digite sua senha atual:');
            if (currentPassword === null) return;
            if (currentPassword === "") {
                showMessage(accountActionMessageDiv, 'Senha atual é necessária.'); return;
            }
            showMessage(accountActionMessageDiv, 'Processando exclusão da conta...', 'success');
            reauthenticateUser(currentPassword)
                .then(() => deleteUser(user))
                .then(() => {
                    alert('Sua conta foi deletada com sucesso.');
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    if (error.code === 'auth/requires-recent-login') {
                        showMessage(accountActionMessageDiv, 'Operação sensível. Saia e entre novamente antes de deletar.');
                    } else if (error.code === 'auth/wrong-password' || error.message.includes("INVALID_LOGIN_CREDENTIALS") || error.code === 'auth/invalid-credential') {
                        showMessage(accountActionMessageDiv, 'Senha atual incorreta.');
                    } else {
                        showMessage(accountActionMessageDiv, `Erro ao deletar conta: ${error.message}`);
                    }
                });
        });
    }

    console.log("David's Farm profile script (v5) carregado!");
});