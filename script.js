// script.js
import { auth } from './firebase-config.js'; // Importa a instância do auth
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

    function createParticles() {
        if (!particlesContainer) return;
        for (let i = 0; i < numberOfParticles; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            particle.style.left = `${Math.random() * 100}%`;
            const size = Math.random() * 10 + 5;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            const duration = Math.random() * 10 + 10;
            const delay = Math.random() * 10;
            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `-${delay}s`;
            particle.style.bottom = `${Math.random() * -50 - 50}vh`;
            particlesContainer.appendChild(particle);
            particle.addEventListener('animationiteration', () => {
                particle.style.left = `${Math.random() * 100}%`;
                const newSize = Math.random() * 10 + 5;
                particle.style.width = `${newSize}px`;
                particle.style.height = `${newSize}px`;
            });
        }
    }

    setTimeout(() => {
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
            loadingScreen.addEventListener('transitionend', () => {
                if (loadingScreen.parentNode) {
                    loadingScreen.parentNode.removeChild(loadingScreen);
                }
                if (siteContent) {
                    siteContent.classList.remove('hidden');
                    siteContent.classList.add('visible');
                }
                createParticles();
            }, { once: true });
        }
    }, 1500);

    // Gerenciar exibição do usuário
    onAuthStateChanged(auth, (user) => {
        if (userAuthSection) {
            userAuthSection.innerHTML = ''; // Limpa a seção antes de adicionar novo conteúdo
            if (user) {
                // Usuário está logado
                const displayName = user.displayName || user.email; // Usa email se displayName não estiver disponível
                const photoURL = user.photoURL || 'imgs/default-avatar.png'; // Placeholder se não houver foto

                const userInfoHTML = `
                    <div class="user-info">
                        <img id="user-photo" src="${photoURL}" alt="Foto do Usuário">
                        <span id="user-name">${displayName}</span>
                        <button id="logout-button" class="logout-button-style">Sair</button>
                    </div>
                `;
                userAuthSection.innerHTML = userInfoHTML;

                const logoutButton = document.getElementById('logout-button');
                if (logoutButton) {
                    logoutButton.addEventListener('click', () => {
                        signOut(auth).then(() => {
                            console.log('Usuário deslogado');
                            // A UI será atualizada pelo onAuthStateChanged
                        }).catch((error) => {
                            console.error('Erro ao sair:', error);
                        });
                    });
                }
            } else {
                // Usuário está deslogado
                const loginButtonHTML = `<a href="login.html" class="login-button">Login</a>`;
                userAuthSection.innerHTML = loginButtonHTML;
                // Reaplicar animação ao botão de login se necessário (pode precisar de CSS específico)
                // Por simplicidade, a animação de entrada do botão de login original é aplicada via CSS na carga da página.
                // Se o botão for recriado, pode não ter a mesma animação de entrada sem lógica adicional.
            }
        }
    });

    console.log("David's Farm script v3 (modular) carregado e pronto!");
});