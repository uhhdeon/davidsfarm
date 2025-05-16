// script.js
import { auth, ensureUserProfileAndFriendId } from './firebase-config.js'; // Importa ensureUserProfileAndFriendId
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    // ... (seletores do DOM e funções createParticles, setTimeout do loadingScreen - sem alterações)...
    const loadingScreen = document.getElementById('loading-screen');
    const siteContent = document.getElementById('site-content');
    const currentYearSpan = document.getElementById('currentYear');
    const particlesContainer = document.getElementById('background-particles');
    const userAuthSection = document.querySelector('.user-auth-section');
    const numberOfParticles = 30;

    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
    function createParticles() { /* ... (sem alterações) ... */
        if (!particlesContainer) return;
        for (let i = 0; i < numberOfParticles; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            particle.style.left = `${Math.random() * 100}%`;
            const size = Math.random() * 10 + 5;
            particle.style.width = `${size}px`; particle.style.height = `${size}px`;
            const duration = Math.random() * 10 + 10; const delay = Math.random() * 10;
            particle.style.animationDuration = `${duration}s`; particle.style.animationDelay = `-${delay}s`;
            particle.style.bottom = `${Math.random() * -50 - 50}vh`;
            particlesContainer.appendChild(particle);
            particle.addEventListener('animationiteration', () => {
                particle.style.left = `${Math.random() * 100}%`;
                const newSize = Math.random() * 10 + 5;
                particle.style.width = `${newSize}px`; particle.style.height = `${newSize}px`;
            });
        } 
    }
    setTimeout(() => { /* ... (sem alterações) ... */
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
            loadingScreen.addEventListener('transitionend', () => {
                if (loadingScreen.parentNode) { loadingScreen.parentNode.removeChild(loadingScreen); }
                if (siteContent) {
                    siteContent.classList.remove('hidden');
                    siteContent.classList.add('visible');
                }
                if (typeof createParticles === 'function') createParticles();
            }, { once: true });
        }
    }, 1500);


    const hasPasswordProvider = (user) => { /* ... (sem alterações) ... */
        if (user && user.providerData) {
            return user.providerData.some(provider => provider.providerId === 'password');
        }
        return false;
    };

    const checkAndAskToSetPassword = (user) => { /* ... (sem alterações, mas depende do user.uid) ... */
        if (!user) return;
        const checkAssignFlag = sessionStorage.getItem('checkAssignPasswordForUser');
        if (checkAssignFlag !== user.uid) { return; }
        sessionStorage.removeItem('checkAssignPasswordForUser');
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
            }, 1200);
        }
    };

    onAuthStateChanged(auth, async (user) => { // Tornada async para aguardar ensureUserProfileAndFriendId
        if (userAuthSection) {
            userAuthSection.innerHTML = '';
            if (user) {
                // GARANTE/CRIA PERFIL NO FIRESTORE E FRIEND ID PARA TODOS OS USUÁRIOS LOGADOS
                try {
                    console.log("Verificando/Criando perfil Firestore para:", user.uid);
                    const userProfileData = await ensureUserProfileAndFriendId(user); // Chama a função
                    if (userProfileData) {
                        console.log("Dados do perfil Firestore:", userProfileData);
                        // Usa userProfileData.displayName e userProfileData.photoURL se quiser os dados do Firestore
                        // ou user.displayName e user.photoURL para os dados do Auth.
                        // É bom que estejam sincronizados. ensureUserProfileAndFriendId já tenta usar os do Auth.
                    } else {
                        console.warn("Não foi possível obter/criar dados do perfil no Firestore para o usuário:", user.uid);
                    }
                } catch (error) {
                    console.error("Erro ao garantir perfil e Friend ID:", error);
                }

                // Continua com a lógica de UI do header
                const displayName = user.displayName || user.email.split('@')[0];
                const photoURL = user.photoURL || 'imgs/default-avatar.png';
                const userInfoHTML = `
                    <a href="profile.html" class="user-info-link">
                        <div class="user-info">
                            <img id="user-photo" src="${photoURL}" alt="Foto do Usuário">
                            <span id="user-name">${displayName}</span>
                        </div>
                    </a>`;
                userAuthSection.innerHTML = userInfoHTML;

                checkAndAskToSetPassword(user); // Chama a função do popup

            } else {
                const loginButtonHTML = `<a href="login.html" class="login-button">Login</a>`;
                userAuthSection.innerHTML = loginButtonHTML;
            }
        }
    });
    console.log("David's Farm script principal (v6 - com ensureUserProfile) carregado!");
});