// script.js
import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
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

    // Função para verificar se o usuário tem provedor de senha (pode ser movida para um utilitário)
    const hasPasswordProvider = (user) => {
        if (user && user.providerData) {
            return user.providerData.some(provider => provider.providerId === 'password');
        }
        return false;
    };

    // Função para perguntar sobre definir senha (agora no script.js)
    const checkAndAskToSetPassword = (user) => {
        if (!user) return;

        const checkAssignFlag = sessionStorage.getItem('checkAssignPasswordForUser');
        if (checkAssignFlag !== user.uid) { // Só age se o flag for para o usuário atual
            return;
        }

        // Limpa o flag para não perguntar novamente neste refresh/sessão de página
        sessionStorage.removeItem('checkAssignPasswordForUser');

        const loggedWithGoogle = user.providerData.some(p => p.providerId === 'google.com');
        const alreadyHasPassword = hasPasswordProvider(user);
        const declinedKey = `declinedSetPassword_${user.uid}`; // Chave do localStorage
        const hasDeclined = localStorage.getItem(declinedKey) === 'true';

        if (loggedWithGoogle && !alreadyHasPassword && !hasDeclined) {
            // Atraso para o usuário ver a página antes do popup
            setTimeout(() => {
                if (window.confirm("Você conectou sua conta Google. Gostaria de definir uma senha para também poder entrar com seu email e uma senha no futuro?")) {
                    window.location.href = 'profile.html#security'; // Vai para perfil > segurança
                } else {
                    localStorage.setItem(declinedKey, 'true'); // Lembra que recusou
                }
            }, 1200); // Popup aparece após 1.2 segundos na página inicial
        }
    };

    // Gerenciar exibição do usuário no header E CHAMAR A VERIFICAÇÃO DO POPUP
    onAuthStateChanged(auth, (user) => {
        if (userAuthSection) {
            userAuthSection.innerHTML = '';
            if (user) {
                const displayName = user.displayName || user.email;
                const photoURL = user.photoURL || 'imgs/default-avatar.png';
                const userInfoHTML = `
                    <a href="profile.html" class="user-info-link">
                        <div class="user-info">
                            <img id="user-photo" src="${photoURL}" alt="Foto do Usuário">
                            <span id="user-name">${displayName}</span>
                        </div>
                    </a>`;
                userAuthSection.innerHTML = userInfoHTML;

                // CHAMA A FUNÇÃO PARA VERIFICAR SE DEVE MOSTRAR O POPUP
                checkAndAskToSetPassword(user);

            } else {
                const loginButtonHTML = `<a href="/davidsfarm/login/" class="login-button">Login</a>`;
                userAuthSection.innerHTML = loginButtonHTML;
            }
        }
    });
    console.log("David's Farm script principal (v5 - com popup pós-redirect) carregado!");
});