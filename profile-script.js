// profile-script.js
import { auth } from './firebase-config.js';
import { 
    onAuthStateChanged, updateProfile, updatePassword,
    EmailAuthProvider, reauthenticateWithCredential,
    verifyBeforeUpdateEmail, signOut, deleteUser
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
    const profilePhotoUrlInput = document.getElementById('profile-photo-url-input');
    const profilePhotoPreviewImg = document.getElementById('profile-photo-preview-img');
    const profileMessageDiv = document.getElementById('profile-message');

    const changePasswordForm = document.getElementById('change-password-form');
    const currentPasswordGroup = document.getElementById('current-password-group'); // Grupo da senha atual
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
    const changePasswordButton = document.getElementById('change-password-button'); // Botão de alterar/definir senha
    const changePasswordTitle = document.getElementById('change-password-title'); // Título da seção de senha
    const passwordMessageDiv = document.getElementById('password-message');

    const changeEmailForm = document.getElementById('change-email-form');
    const currentEmailDisplay = document.getElementById('current-email-display');
    const emailCurrentPasswordInput = document.getElementById('email-current-password');
    const newEmailInput = document.getElementById('new-email');
    const emailMessageDiv = document.getElementById('email-message');
    
    const logoutButtonProfilePage = document.getElementById('logout-button-profile-page');
    const deleteAccountButton = document.getElementById('delete-account-button');
    const accountActionMessageDiv = document.getElementById('account-action-message');

    let currentUserHasPasswordProvider = false; // Flag para controlar o estado da senha

    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (siteContent) setTimeout(() => siteContent.classList.add('visible'), 100);

    const showMessage = (element, message, type = 'error') => { /* ... (função showMessage) ... */ 
        element.textContent = message;
        element.className = 'form-message ' + (type === 'success' ? 'success' : '');
        element.style.display = 'block';
        setTimeout(() => { element.style.display = 'none'; element.textContent = ''; }, 7000);
    };
    
    const switchTab = (activeTabButton, activeSection) => { /* ... (função switchTab) ... */ 
        [tabPerfil, tabSeguranca].forEach(btn => btn.classList.remove('active'));
        [sectionPerfil, sectionSeguranca].forEach(sec => sec.classList.remove('active'));
        activeTabButton.classList.add('active');
        activeSection.classList.add('active');
    };

    if (tabPerfil) tabPerfil.addEventListener('click', () => switchTab(tabPerfil, sectionPerfil));
    if (tabSeguranca) tabSeguranca.addEventListener('click', () => switchTab(tabSeguranca, sectionSeguranca));

    if (profilePhotoUrlInput && profilePhotoPreviewImg) { /* ... (lógica preview foto) ... */ 
        profilePhotoUrlInput.addEventListener('input', () => {
            const newUrl = profilePhotoUrlInput.value.trim();
            profilePhotoPreviewImg.src = newUrl || 'imgs/default-avatar.png';
        });
        profilePhotoPreviewImg.onerror = () => {
            profilePhotoPreviewImg.src = 'imgs/default-avatar.png';
            showMessage(profileMessageDiv, 'URL da imagem inválido ou imagem não pôde ser carregada.');
        };
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            if (userAuthSection) { /* ... (lógica header) ... */ 
                const displayName = user.displayName || user.email;
                const photoURL = user.photoURL || 'imgs/default-avatar.png';
                userAuthSection.innerHTML = `
                    <a href="profile.html" class="user-info-link">
                        <div class="user-info"><img id="user-photo" src="${photoURL}" alt="Foto"><span id="user-name">${displayName}</span></div>
                    </a>`;
            }
            if (profileUsernameInput) profileUsernameInput.value = user.displayName || '';
            if (profilePhotoUrlInput) profilePhotoUrlInput.value = user.photoURL || '';
            if (profilePhotoPreviewImg) profilePhotoPreviewImg.src = user.photoURL || 'imgs/default-avatar.png';
            if (currentEmailDisplay) currentEmailDisplay.textContent = user.email;

            // Verifica se o usuário tem provedor de senha
            currentUserHasPasswordProvider = user.providerData.some(p => p.providerId === 'password');
            updatePasswordSectionUI(currentUserHasPasswordProvider);

            // Verifica se veio do popup para definir senha
            if (sessionStorage.getItem('promptSetPassword') === 'true') {
                switchTab(tabSeguranca, sectionSeguranca); // Abre a aba de segurança
                if (newPasswordInput) newPasswordInput.focus(); // Foca no campo de nova senha
                showMessage(passwordMessageDiv, 'Defina sua nova senha abaixo.', 'success');
                sessionStorage.removeItem('promptSetPassword');
            }

        } else {
            window.location.href = 'login.html';
        }
    });

    function updatePasswordSectionUI(hasPassword) {
        if (currentPasswordGroup && changePasswordButton && changePasswordTitle) {
            if (hasPassword) {
                currentPasswordGroup.classList.remove('hidden');
                currentPasswordInput.required = true;
                changePasswordButton.textContent = 'Alterar Senha';
                changePasswordTitle.textContent = 'Alterar Senha';
            } else {
                currentPasswordGroup.classList.add('hidden');
                currentPasswordInput.required = false;
                currentPasswordInput.value = ''; // Limpa caso haja algo
                changePasswordButton.textContent = 'Definir Senha';
                changePasswordTitle.textContent = 'Definir Nova Senha';
            }
        }
    }
    
    if (profileForm) { /* ... (lógica profileForm submit) ... */ 
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
    
    const reauthenticateUser = (currentPassword) => { /* ... (função reauthenticateUser) ... */
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

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const currentPass = currentPasswordInput.value;
            const newPass = newPasswordInput.value;
            const confirmNewPass = confirmNewPasswordInput.value;

            if (!newPass || !confirmNewPass) {
                showMessage(passwordMessageDiv, 'Por favor, preencha a nova senha e a confirmação.'); return;
            }
            if (currentUserHasPasswordProvider && !currentPass) { // Só exige senha atual se ele tiver uma
                showMessage(passwordMessageDiv, 'Por favor, preencha sua senha atual para alterá-la.'); return;
            }
            if (newPass !== confirmNewPass) {
                showMessage(passwordMessageDiv, 'As novas senhas não coincidem.'); return;
            }
            if (newPass.length < 6) {
                showMessage(passwordMessageDiv, 'A nova senha deve ter pelo menos 6 caracteres.'); return;
            }
            
            showMessage(passwordMessageDiv, 'Processando...', 'success');

            const operation = () => updatePassword(auth.currentUser, newPass);

            if (currentUserHasPasswordProvider) { // Precisa reautenticar para *mudar* uma senha existente
                reauthenticateUser(currentPass)
                    .then(operation)
                    .then(() => {
                        showMessage(passwordMessageDiv, 'Senha alterada com sucesso!', 'success');
                        changePasswordForm.reset();
                        currentUserHasPasswordProvider = true; // Acabou de definir/alterar, então agora tem senha
                        updatePasswordSectionUI(true); 
                    })
                    .catch((error) => {
                        if (error.code === 'auth/wrong-password' || error.message.includes("INVALID_LOGIN_CREDENTIALS") || error.code === 'auth/invalid-credential') {
                            showMessage(passwordMessageDiv, 'Senha atual incorreta.');
                        } else {
                            showMessage(passwordMessageDiv, `Erro ao alterar senha: ${error.message}`);
                        }
                    });
            } else { // Não tem senha, está *definindo* uma nova
                operation()
                    .then(() => {
                        showMessage(passwordMessageDiv, 'Senha definida com sucesso!', 'success');
                        changePasswordForm.reset();
                        currentUserHasPasswordProvider = true; // Acabou de definir, então agora tem senha
                        updatePasswordSectionUI(true); 
                    })
                    .catch((error) => {
                        // Erro auth/requires-recent-login pode acontecer aqui se o login social não for "recente" o suficiente
                        // para o updatePassword. Se acontecer, o usuário precisa deslogar e logar de novo.
                         if (error.code === 'auth/requires-recent-login') {
                            showMessage(passwordMessageDiv, 'Login recente necessário. Por favor, saia e entre novamente para definir sua senha.');
                        } else {
                            showMessage(passwordMessageDiv, `Erro ao definir senha: ${error.message}`);
                        }
                    });
            }
        });
    }

    if (changeEmailForm) { /* ... (lógica changeEmailForm com reauthenticateUser) ... */ 
        changeEmailForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const currentPass = document.getElementById('email-current-password').value;
            const newMail = document.getElementById('new-email').value.trim();
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

    if (logoutButtonProfilePage) { /* ... (lógica logoutButtonProfilePage) ... */ 
        logoutButtonProfilePage.addEventListener('click', () => {
            signOut(auth).then(() => { window.location.href = 'index.html'; })
            .catch((error) => showMessage(accountActionMessageDiv, `Erro ao sair: ${error.message}`));
        });
    }

    if (deleteAccountButton) { /* ... (lógica deleteAccountButton com reauthenticateUser) ... */
        deleteAccountButton.addEventListener('click', () => {
            const user = auth.currentUser;
            if (!user) return;
            if (!window.confirm('TEM CERTEZA ABSOLUTA que deseja deletar sua conta? Esta ação não pode ser desfeita e todos os seus dados associados serão perdidos.')) return;
            
            const currentPassword = window.prompt('Para confirmar a exclusão, por favor, digite sua senha atual (se você tiver uma definida). Se você logou com Google e não definiu uma senha, deixe em branco e clique OK, mas a exclusão pode falhar se uma autenticação recente for necessária.');
            
            if (currentPassword === null) return; // Cancelou

            showMessage(accountActionMessageDiv, 'Processando exclusão da conta...', 'success');

            const deleteOperation = () => {
                deleteUser(user).then(() => {
                    alert('Sua conta foi deletada com sucesso.');
                    window.location.href = 'index.html';
                }).catch(delError => {
                     if (delError.code === 'auth/requires-recent-login') {
                        showMessage(accountActionMessageDiv, 'Exclusão requer login recente. Saia, entre novamente e tente deletar.');
                    } else {
                        showMessage(accountActionMessageDiv, `Erro ao deletar conta: ${delError.message}`);
                    }
                });
            };
            
            // Se o usuário logou com Google e não tem senha, ou se deixou o prompt em branco
            // a reautenticação com senha vazia vai falhar.
            // O Firebase pode exigir reautenticação recente mesmo para contas sociais antes de deletar.
            // Se ele tem senha, precisa fornecer.
            if (currentUserHasPasswordProvider && currentPassword === "") {
                 showMessage(accountActionMessageDiv, 'Senha atual é necessária para deletar a conta.');
                 return;
            }
            if (!currentUserHasPasswordProvider && currentPassword !== "") {
                // Usuário social tentando fornecer uma senha que não existe para reautenticação.
                // A reautenticação vai falhar, mas o Firebase pode permitir deleteUser se o login social for recente.
                 console.log("Tentando deletar conta social, senha fornecida pode não ser usada para reauth se não existir.");
            }


            if (currentUserHasPasswordProvider || currentPassword !== "") { // Tenta reautenticar se ele tem senha ou forneceu uma
                reauthenticateUser(currentPassword)
                    .then(deleteOperation)
                    .catch(reauthError => {
                        if (reauthError.code === 'auth/wrong-password' || reauthError.message.includes("INVALID_LOGIN_CREDENTIALS") || reauthError.code === 'auth/invalid-credential') {
                            showMessage(accountActionMessageDiv, 'Senha atual incorreta. Não foi possível deletar a conta.');
                        } else if (reauthError.code === 'auth/requires-recent-login') { // Este erro pode vir da reautenticação
                             showMessage(accountActionMessageDiv, 'Reautenticação falhou (login não recente). Saia, entre novamente e tente deletar.');
                        }
                         else {
                            showMessage(accountActionMessageDiv, `Erro de reautenticação ao deletar: ${reauthError.message}`);
                        }
                    });
            } else { // Usuário logado com provedor social e não inseriu senha (porque não tem)
                // Tenta deletar diretamente. Pode falhar com 'auth/requires-recent-login'.
                deleteOperation();
            }
        });
    }
    console.log("David's Farm profile script (v5) carregado!");
});