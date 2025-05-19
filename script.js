// script.js (Página Inicial)
// ETAPA 10: Botão Login/Perfil Dinâmico e Botão GitHub
import { auth, db, ensureUserProfileAndFriendId } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; 

document.addEventListener('DOMContentLoaded', () => {
    // ... (seletores DOM anteriores) ...
    const loadingScreen = document.getElementById('loading-screen');
    const siteContent = document.getElementById('site-content');
    const currentYearSpan = document.getElementById('currentYear');
    const particlesContainer = document.getElementById('background-particles');
    const userAuthSection = document.querySelector('.user-auth-section'); // Header auth
    const numberOfParticles = 30;
    const devMessageCard = document.getElementById('dev-message-card');
    const devAvatarImg = document.getElementById('dev-avatar');
    const devNameSpan = document.getElementById('dev-name');
    const devMessageHeaderClickable = document.getElementById('dev-message-header-clickable'); 
    const YOUR_PROFILE_UID = "DVdF28kA2ZYNs9EuqvxVDpia56t2"; 
    const popupOverlay = document.getElementById('custom-popup-overlay');
    const popupCloseButton = document.getElementById('custom-popup-close');
    const popupContent = document.getElementById('custom-popup-content');
    const mainSearchInput = document.getElementById('main-search-input');
    const searchSuggestionsBox = document.getElementById('search-suggestions-box');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const downloadsButton = document.getElementById('downloads-btn');

    // Seletores para o botão dinâmico Login/Perfil
    const mainAuthButton = document.getElementById('main-auth-button');
    const mainAuthButtonIcon = document.getElementById('main-auth-button-icon');
    const mainAuthButtonText = document.getElementById('main-auth-button-text');

    let viewer = null; 
    let viewerData = null; 

    // ... (Funções createParticles, setTimeout para loadingScreen, hasPasswordProvider, checkAndAskToSetPassword, openPopup, closePopup, loadDevMessage, setupDevMessageClickHandler, updateSearchSuggestions, escapeHtml - MANTIDAS)
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    function createParticles() {
        if (!particlesContainer) return;
        particlesContainer.innerHTML = ''; 
        for (let i = 0; i < numberOfParticles; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            particle.style.left = `${Math.random() * 100}%`;
            const size = Math.random() * 10 + 5;
            particle.style.width = `${size}px`; particle.style.height = `${size}px`;
            const duration = Math.random() * 10 + 10; const delay = Math.random() * 10;
            particle.style.animationDuration = `${duration}s`; particle.style.animationDelay = `-${delay}s`;
            particle.style.bottom = `${Math.random() * -20 - 20}vh`; 
            particlesContainer.appendChild(particle);
            particle.addEventListener('animationiteration', () => {
                particle.style.left = `${Math.random() * 100}%`;
                const newSize = Math.random() * 10 + 5;
                particle.style.width = `${newSize}px`; particle.style.height = `${newSize}px`;
            });
        }
    }

    setTimeout(() => {
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
        } else { 
             if (siteContent) {
                siteContent.classList.remove('hidden');
                siteContent.classList.add('visible');
            }
            if (typeof createParticles === 'function') createParticles();
        }
    }, 1000); 

    const hasPasswordProvider = (user) => {
        if (user && user.providerData) {
            return user.providerData.some(provider => provider.providerId === 'password');
        }
        return false;
    };

    const checkAndAskToSetPassword = (user) => {
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

    const openPopup = () => { if (popupOverlay) popupOverlay.classList.add('visible'); };
    const closePopup = () => { if (popupOverlay) popupOverlay.classList.remove('visible'); if (popupContent) popupContent.innerHTML = ''; };
    if (popupCloseButton) popupCloseButton.addEventListener('click', closePopup);
    if (popupOverlay) popupOverlay.addEventListener('click', (e) => { if (e.target === popupOverlay) closePopup(); });

    onAuthStateChanged(auth, async (user) => {
        viewer = user; 
        if (userAuthSection) { // Atualiza o header
            userAuthSection.innerHTML = '';
            if (user) {
                let userProfileDataForHeader = null;
                try {
                    userProfileDataForHeader = await ensureUserProfileAndFriendId(user); 
                     if (!userProfileDataForHeader) { 
                        console.warn("ensureUserProfileAndFriendId não retornou dados para o header, usando Auth fallback.");
                        viewerData = { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL, email: user.email };
                    } else {
                        viewerData = userProfileDataForHeader; 
                    }
                } catch (error) {
                    console.error("Erro ao garantir perfil e Friend ID para header:", error);
                     viewerData = { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL, email: user.email }; 
                }

                const displayName = viewerData?.displayName || user.displayName || user.email?.split('@')[0] || "Usuário";
                const photoURL = viewerData?.photoURL || user.photoURL || 'imgs/default-avatar.png';
                
                const userInfoHTML = `
                    <a href="profile.html" class="user-info-link">
                        <div class="user-info">
                            <img id="user-photo" src="${photoURL}" alt="Foto do Usuário">
                            <span id="user-name">${displayName}</span>
                        </div>
                    </a>`;
                userAuthSection.innerHTML = userInfoHTML;
                checkAndAskToSetPassword(user); 
            } else {
                const loginButtonHTML = `<a href="login.html" class="login-button">Login</a>`;
                userAuthSection.innerHTML = loginButtonHTML;
                viewerData = null; 
            }
        }

        // Atualiza o botão principal de Login/Perfil na página index.html
        if (mainAuthButton && mainAuthButtonIcon && mainAuthButtonText) {
            if (user) {
                mainAuthButton.href = "profile.html";
                mainAuthButtonText.textContent = "Perfil";
                mainAuthButtonIcon.className = "fas fa-user-circle"; // Ícone de perfil
                mainAuthButton.classList.remove('login-main-btn'); // Remove classe de login se houver
                mainAuthButton.classList.add('profile-main-btn'); // Adiciona classe de perfil (para estilo diferente se quiser)
            } else {
                mainAuthButton.href = "login.html";
                mainAuthButtonText.textContent = "Login";
                mainAuthButtonIcon.className = "fas fa-sign-in-alt"; // Ícone de login
                mainAuthButton.classList.remove('profile-main-btn');
                mainAuthButton.classList.add('login-main-btn');
            }
        }
        setupDevMessageClickHandler(); 
    });

    async function loadDevMessage() {
        if (!devMessageCard || !devAvatarImg || !devNameSpan) return;
        try {
            const devDocRef = doc(db, "users", YOUR_PROFILE_UID);
            const devDocSnap = await getDoc(devDocRef);
            if (devDocSnap.exists()) {
                const devData = devDocSnap.data();
                devAvatarImg.src = devData.photoURL || 'imgs/default-avatar.png';
                devAvatarImg.alt = `Avatar de ${devData.displayName || 'Desenvolvedor'}`;
                devNameSpan.textContent = devData.displayName || 'O Criador';
                devMessageCard.style.display = 'block'; 
            } else {
                console.warn("Documento do desenvolvedor não encontrado para a mensagem especial.");
                devNameSpan.textContent = 'O Criador'; 
                devMessageCard.style.display = 'block'; 
            }
        } catch (error) {
            console.error("Erro ao carregar mensagem do desenvolvedor:", error);
            devNameSpan.textContent = 'O Criador'; 
            devMessageCard.style.display = 'block';
        }
    }

    function setupDevMessageClickHandler() {
        if (devMessageHeaderClickable) {
            devMessageHeaderClickable.style.cursor = 'pointer'; 
            devMessageHeaderClickable.title = `Ver perfil de ${devNameSpan.textContent || 'O Criador'}`;
            devMessageHeaderClickable.addEventListener('click', () => {
                if (viewer) { 
                    window.location.href = `public-profile.html?uid=${YOUR_PROFILE_UID}`;
                } else {
                    if (popupContent && popupOverlay) {
                        popupContent.innerHTML = `
                            <h3>Ver Perfil</h3>
                            <p>Você precisa estar logado para ver o perfil do criador.</p>
                            <div class="popup-actions" style="text-align:center; margin-top:20px;">
                                <a href="login.html" class="popup-apply-button" style="text-decoration:none; background-color: #007bff; color:white; padding:10px 15px; border-radius:5px;">Fazer Login</a>
                                <button id="popup-cancel-login-btn" type="button" class="popup-apply-button" style="background-color:#6c757d; margin-left:10px;">Cancelar</button>
                            </div>
                        `;
                        const cancelLoginBtn = popupContent.querySelector('#popup-cancel-login-btn');
                        if(cancelLoginBtn) cancelLoginBtn.addEventListener('click', closePopup);
                        openPopup();
                    } else {
                        alert("Você precisa estar logado para ver este perfil. Por favor, faça o login.");
                        window.location.href = 'login.html'; 
                    }
                }
            });
        }
    }

    loadDevMessage(); 

    if (mainSearchInput && searchSuggestionsBox && clearSearchBtn) {
        mainSearchInput.addEventListener('input', () => {
            const searchTerm = mainSearchInput.value.trim();
            if (searchTerm) {
                updateSearchSuggestions(searchTerm);
                searchSuggestionsBox.style.display = 'block';
                clearSearchBtn.style.display = 'inline-block';
            } else {
                searchSuggestionsBox.style.display = 'none';
                clearSearchBtn.style.display = 'none';
            }
        });
        mainSearchInput.addEventListener('focus', () => {
            if (mainSearchInput.value.trim()) {
                searchSuggestionsBox.style.display = 'block';
            }
        });
        mainSearchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                const searchTerm = mainSearchInput.value.trim();
                if (searchTerm) {
                    window.location.href = `search-results.html?term=${encodeURIComponent(searchTerm)}&category=people`;
                }
            }
        });
        clearSearchBtn.addEventListener('click', () => {
            mainSearchInput.value = '';
            searchSuggestionsBox.style.display = 'none';
            clearSearchBtn.style.display = 'none';
            mainSearchInput.focus();
        });
        document.addEventListener('click', (event) => {
            if (searchSuggestionsBox && mainSearchInput && !mainSearchInput.contains(event.target) && !searchSuggestionsBox.contains(event.target)) {
                searchSuggestionsBox.style.display = 'none';
            }
        });
    }

    function updateSearchSuggestions(term) {
        if (!searchSuggestionsBox) return;
        searchSuggestionsBox.innerHTML = ''; 
        const categories = [
            { name: "Pessoas", icon: "fa-users", type: "people" },
            { name: "Grupos", icon: "fa-user-friends", type: "groups" }, 
            { name: "Jogos", icon: "fa-gamepad", type: "games" } 
        ];
        categories.forEach(category => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.innerHTML = `
                <i class="fas ${category.icon}"></i>
                <span>Pesquisar "<strong>${escapeHtml(term)}</strong>" em ${category.name}</span>
            `;
            suggestionItem.addEventListener('click', () => {
                window.location.href = `search-results.html?term=${encodeURIComponent(term)}&category=${category.type}`;
            });
            searchSuggestionsBox.appendChild(suggestionItem);
        });
    }

    function escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    if (downloadsButton) {
        downloadsButton.addEventListener('click', () => {
            if (popupContent && popupOverlay) {
                popupContent.innerHTML = `
                    <h3>Downloads</h3>
                    <p>A seção de downloads ainda está sendo feita.</p>
                    <p>Volte mais tarde!</p>
                    <div class="popup-actions" style="text-align:center; margin-top:20px;">
                        <button id="popup-close-maintenance-btn" type="button" class="popup-apply-button" style="background-color:#6c757d;">Entendido</button>
                    </div>
                `;
                const closeMaintenanceBtn = popupContent.querySelector('#popup-close-maintenance-btn');
                if(closeMaintenanceBtn) closeMaintenanceBtn.addEventListener('click', closePopup);
                openPopup();
            } else {
                alert("A seção de downloads está em manutenção. Volte mais tarde!");
            }
        });
    }

    console.log("David's Farm script principal (vBotão Auth Dinâmico e GitHub) carregado!");
});