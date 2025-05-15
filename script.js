// Importações do Firebase (sintaxe modular v9+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-analytics.js"; // Descomente se precisar do Analytics aqui

// Sua Configuração do Firebase (a mesma que você forneceu)
const firebaseConfig = {
    apiKey: "AIzaSyAoI436Z3hx8rp63S6Ea095YpGxAeJdazA",
    authDomain: "david-s-farm.firebaseapp.com",
    projectId: "david-s-farm",
    storageBucket: "david-s-farm.firebasestorage.app", // Verifique se este é o correto no seu console Firebase
    messagingSenderId: "1036766340330",
    appId: "1:1036766340330:web:5fb56b8eb0d7241c7a2393",
    measurementId: "G-XP73P7XJ09"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// const analytics = getAnalytics(app); // Descomente se precisar do Analytics aqui

document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading-screen');
    const siteContent = document.getElementById('site-content');
    const currentYearSpan = document.getElementById('currentYear');
    const particlesContainer = document.getElementById('background-particles');
    const numberOfParticles = 30;
    const userStatusHeader = document.getElementById('user-status-header');

    // Atualiza o ano no rodapé
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // Função para criar partículas (mantida como antes)
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

    // Simula um tempo de carregamento (mantido como antes)
    setTimeout(() => {
        if (loadingScreen) loadingScreen.classList.add('fade-out');
        if (loadingScreen) {
             loadingScreen.addEventListener('transitionend', () => {
                if (loadingScreen.parentNode) {
                    loadingScreen.parentNode.removeChild(loadingScreen);
                }
                if(siteContent) siteContent.classList.remove('hidden');
                if(siteContent) siteContent.classList.add('visible');
                createParticles();
            }, { once: true });
        } else { // Caso a loading screen não exista, mostra o conteúdo mesmo assim
            if(siteContent) siteContent.classList.remove('hidden');
            if(siteContent) siteContent.classList.add('visible');
            createParticles();
        }
    }, 1500);

    // Observador do estado de autenticação
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Usuário está logado
            console.log("Usuário logado no index:", user);
            let displayName = user.displayName || user.email.split('@')[0]; // Usa nome de exibição ou parte do email
            let photoURL = user.photoURL || 'imgs/default-avatar.png'; // Use uma imagem padrão se não houver foto

            if (userStatusHeader) {
                userStatusHeader.innerHTML = `
                    <div class="user-info">
                        <img src="${photoURL}" alt="${displayName}" class="user-avatar">
                        <span class="user-name">${displayName}</span>
                        <button id="logout-button" class="logout-button">Sair</button>
                    </div>
                `;
                const logoutButton = document.getElementById('logout-button');
                if (logoutButton) {
                    logoutButton.addEventListener('click', () => {
                        signOut(auth).then(() => {
                            console.log('Usuário deslogado com sucesso.');
                            // A UI será atualizada pelo onAuthStateChanged
                        }).catch((error) => {
                            console.error('Erro ao sair:', error);
                        });
                    });
                }
            }
        } else {
            // Usuário está deslogado
            console.log("Nenhum usuário logado no index.");
            if (userStatusHeader) {
                userStatusHeader.innerHTML = '<a href="login.html" class="login-button">Login</a>';
            }
        }
    });

    console.log("David's Farm script principal (v3) carregado e pronto!");
});