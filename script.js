// script.js
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading-screen');
    const siteContent = document.getElementById('site-content');
    const currentYearSpan = document.getElementById('currentYear');
    const particlesContainer = document.getElementById('background-particles');
    const userAuthSection = document.querySelector('.user-auth-section');
    const numberOfParticles = 30;

    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

    function createParticles() { /* ... (código createParticles) ... */ 
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

    setTimeout(() => { /* ... (código setTimeout para loading) ... */
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
        } else { // Caso loading screen não exista, apenas mostra o conteúdo
             if (siteContent) {
                siteContent.classList.remove('hidden');
                siteContent.classList.add('visible');
            }
            if (typeof createParticles === 'function') createParticles();
        }
    }, 1500);

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
            } else {
                const loginButtonHTML = `<a href="login.html" class="login-button">Login</a>`;
                userAuthSection.innerHTML = loginButtonHTML;
            }
        }
    });
    console.log("David's Farm script principal (v5) carregado!");
});