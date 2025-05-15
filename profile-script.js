// profile-script.js
import { auth } from './firebase-config.js';
import { 
    onAuthStateChanged,
    updateProfile,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    verifyBeforeUpdateEmail, // Mais seguro para mudança de email
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const userAuthSection = document.querySelector('.user-auth-section'); // Para exibir o usuário no header
    const currentYearSpan = document.getElementById('currentYear');

    // Abas e Seções
    const tabPerfil = document.getElementById('tab-perfil');
    const tabSeguranca = document.getElementById('tab-seguranca');
    const sectionPerfil = document.getElementById('section-perfil');
    const sectionSeguranca = document.getElementById('section-seguranca');

    // Formulário de Perfil
    const profileForm = document.getElementById('profile-form');
    const profileUsernameInput = document.getElementById('profile-username');
    const profilePhotoUrlInput = document.getElementById('profile-photo-url');
    const profileMessageDiv = document.getElementById('profile-message');

    // Formulário de Senha
    const changePasswordForm = document.getElementById('change-password-form');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
    const passwordMessageDiv = document.getElementById('password-message');

    // Formulário de Email
    const changeEmailForm = document.getElementById('change-email-form');
    const currentEmailDisplay = document.getElementById('current-email-display');
    const emailCurrentPasswordInput = document.getElementById('email-current-password');
    const newEmailInput = document.getElementById('new-email');
    const emailMessageDiv = document.getElementById('email-message');
    
    const siteContent = document.getElementById('site-content');

    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
    
    // Adiciona a classe 'visible' ao site-content para as animações CSS
    // Isso pode ser feito após a verificação do usuário ou com um pequeno delay
    setTimeout(() => {
        if(siteContent) siteContent.classList.add('visible');
    }, 100); // Pequeno delay para garantir que o DOM está pronto


    // Função para mostrar mensagem
    const showMessage = (element, message, type = 'error') => {
        element.textContent = message;
        element.className = type === 'success' ? 'success' : ''; // Adiciona classe base se necessário no CSS
        element.style.display = 'block';
        setTimeout(() => { element.style.display = 'none'; element.textContent = '';}, 5000); // Limpa após 5s
    };

    // Navegação por Abas
    const switchTab = (activeTabButton, activeSection) => {
        // Remove 'active' de todos os botões e seções
        [tabPerfil, tabSeguranca].forEach(btn => btn.classList.remove('active'));
        [sectionPerfil, sectionSeguranca].forEach(sec => sec.classList.remove('active'));
        // Adiciona 'active' ao botão e seção clicados
        activeTabButton.classList.add('active');
        activeSection.classList.add('active');
    };

    if (tabPerfil) tabPerfil.addEventListener('click', () => switchTab(tabPerfil, sectionPerfil));
    if (tabSeguranca) tabSeguranca.addEventListener('click', () => switchTab(tabSeguranca, sectionSeguranca));


    // Monitora estado de autenticação
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Preenche header
            if (userAuthSection) {
                const displayName = user.displayName || user.email;
                const photoURL = user.photoURL || 'imgs/default-avatar.png';
                 userAuthSection.innerHTML = `
                    <div class="user-info">
                        <img id="user-photo" src="${photoURL}" alt="Foto">
                        <span id="user-name">${displayName}</span>
                        <button id="logout-button-profile" class="logout-button-style">Sair</button>
                    </div>`;
                const logoutButton = document.getElementById('logout-button-profile');
                if(logoutButton) logoutButton.addEventListener('click', () => signOut(auth).then(() => window.location.href = 'index.html'));
            }

            // Preenche dados do perfil
            if (profileUsernameInput) profileUsernameInput.value = user.displayName || '';
            if (profilePhotoUrlInput) profilePhotoUrlInput.value = user.photoURL || '';
            if (currentEmailDisplay) currentEmailDisplay.textContent = user.email;

        } else {
            // Usuário não está logado, redireciona para login
            window.location.href = 'login.html';
        }
    });

    // Salvar Perfil
    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newUsername = profileUsernameInput.value.trim();
            const newPhotoURL = profilePhotoUrlInput.value.trim();
            const user = auth.currentUser;

            if (!user) return;

            updateProfile(user, {
                displayName: newUsername,
                photoURL: newPhotoURL
            }).then(() => {
                showMessage(profileMessageDiv, 'Perfil atualizado com sucesso!', 'success');
                 // Atualiza o header imediatamente se houver uma função para isso, ou onAuthStateChanged fará
                 // Forçar recarga da foto/nome no header se não for automático:
                if(document.getElementById('user-name')) document.getElementById('user-name').textContent = newUsername || user.email;
                if(document.getElementById('user-photo')) document.getElementById('user-photo').src = newPhotoURL || 'imgs/default-avatar.png';

            }).catch((error) => {
                showMessage(profileMessageDiv, `Erro ao atualizar perfil: ${error.message}`);
            });
        });
    }

    const reauthenticate = (currentPassword) => {
        const user = auth.currentUser;
        if (!user || !user.email) { // Adicionado verificação para user.email
             showMessage(passwordMessageDiv, 'Erro: Usuário não encontrado ou sem email associado.');
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

            reauthenticate(currentPass)
                .then(() => {
                    const user = auth.currentUser;
                    return updatePassword(user, newPass);
                })
                .then(() => {
                    showMessage(passwordMessageDiv, 'Senha alterada com sucesso!', 'success');
                    changePasswordForm.reset(); // Limpa o formulário
                })
                .catch((error) => {
                    console.error("Erro ao alterar senha:", error);
                    if (error.code === 'auth/wrong-password') {
                         showMessage(passwordMessageDiv, 'Senha atual incorreta.');
                    } else {
                         showMessage(passwordMessageDiv, `Erro ao alterar senha: ${error.message}`);
                    }
                });
        });
    }

    // Alterar Email
    if (changeEmailForm) {
        changeEmailForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const currentPass = emailCurrentPasswordInput.value;
            const newMail = newEmailInput.value.trim();
            const user = auth.currentUser;

            if(!user || !currentPass || !newMail) {
                showMessage(emailMessageDiv, 'Preencha a senha atual e o novo email.'); return;
            }
            
            reauthenticate(currentPass)
                .then(() => {
                    return verifyBeforeUpdateEmail(user, newMail);
                })
                .then(() => {
                    showMessage(emailMessageDiv, 'Email de verificação enviado para o novo endereço. Por favor, verifique sua caixa de entrada para confirmar a alteração.', 'success');
                    changeEmailForm.reset();
                })
                .catch((error) => {
                    console.error("Erro ao alterar email:", error);
                     if (error.code === 'auth/wrong-password') {
                         showMessage(emailMessageDiv, 'Senha atual incorreta.');
                    } else if (error.code === 'auth/email-already-in-use') {
                        showMessage(emailMessageDiv, 'Este email já está em uso por outra conta.');
                    } else if (error.code === 'auth/invalid-email') {
                        showMessage(emailMessageDiv, 'O novo email fornecido é inválido.');
                    }
                     else {
                         showMessage(emailMessageDiv, `Erro ao alterar email: ${error.message}`);
                    }
                });
        });
    }
    console.log("David's Farm profile script carregado!");
});