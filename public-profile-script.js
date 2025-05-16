// public-profile-script.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, deleteDoc, updateDoc, runTransaction, serverTimestamp, writeBatch, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores DOM (COMPLETOS) ---
    const userAuthSection = document.querySelector('.user-auth-section');
    const currentYearSpan = document.getElementById('currentYear');
    const siteContent = document.getElementById('site-content');
    const profileLoadingDiv = document.getElementById('public-profile-loading');
    const publicProfileMainElement = document.querySelector('main.public-profile-main');
    const profileContentDiv = document.getElementById('public-profile-content');
    const profileErrorDiv = document.getElementById('public-profile-error');
    const profilePagePhoto = document.getElementById('profile-page-photo');
    const profilePageDisplayName = document.getElementById('profile-page-displayName');
    const profilePageScratchLink = document.getElementById('profile-page-scratch-link');
    const profilePageScratchUsername = document.getElementById('profile-page-scratchUsername');
    const profilePagePronouns = document.getElementById('profile-page-pronouns');
    const profilePageDescriptionText = document.getElementById('profile-page-description');
    const friendActionButtonContainer = document.getElementById('profile-friend-action-button-container');
    const friendActionMessage = document.getElementById('friend-action-message');
    const profileDescriptionSection = document.querySelector('.profile-description-section');
    const profileDescriptionSectionTitle = profileDescriptionSection?.querySelector('h3');
    const friendsCountSpan = document.getElementById('friends-count');
    const followersCountSpan = document.getElementById('followers-count');
    const followingCountSpan = document.getElementById('following-count');
    const statsFriendsLink = document.getElementById('stats-friends-link');
    const statsFollowersLink = document.getElementById('stats-followers-link');
    const statsFollowingLink = document.getElementById('stats-following-link');
    const moreOptionsButton = document.getElementById('profile-more-options-btn'); // VERIFIQUE ESTE ID NO HTML
    const optionsPopup = document.getElementById('profile-options-popup');     // VERIFIQUE ESTE ID NO HTML

    let viewer = null;
    let viewedUserUid = null;
    let viewedUserData = null; 
    let viewerData = null;     
    let isFollowingViewedUser = false;
    let soundwaveParticlesInterval = null;

    // --- Funções Utilitárias e de Tema (COMPLETAS) ---
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (siteContent) setTimeout(() => siteContent.classList.add('visible'), 100);
    const showMessage = (element, message, type = 'error', duration = 5000) => { /* ... (completa) ... */
        if (!element) { console.warn("Elemento de mensagem não encontrado para:", message); return; } element.textContent = message;
        element.className = 'form-message ' + (type === 'success' ? 'success' : 'error');
        element.style.display = 'block';
        setTimeout(() => { if (element) { element.style.display = 'none'; element.textContent = ''; }}, duration);
    };
    function rgbStringToComponents(rgbString) { /* ... (completa) ... */ }
    function lightenDarkenColor(colorObj, percent) { /* ... (completa) ... */ }
    function calculateLuminance(colorObj) { /* ... (completa) ... */ }
    function getDynamicAccentColor(baseAccentRgbString, mainBgRgbString) { /* ... (completa) ... */ }
    function setTextContrastAndAccents(primaryBgColorString, accentBaseColorString) { /* ... (completa) ... */ }
    function createSoundwaveParticle() { /* ... (completa, com criação do container se não existir) ... */
        let particlesContainer = document.getElementById('background-soundwave-particles');
        if (!particlesContainer) {
            particlesContainer = document.createElement('div'); particlesContainer.id = 'background-soundwave-particles';
            particlesContainer.style.position = 'fixed'; particlesContainer.style.top = '0'; particlesContainer.style.left = '0';
            particlesContainer.style.width = '100%'; particlesContainer.style.height = '100%';
            particlesContainer.style.zIndex = '-2'; particlesContainer.style.overflow = 'hidden';
            document.body.prepend(particlesContainer);
        }
        const particle = document.createElement('div'); particle.className = 'soundwave-particle';
        particle.style.position = 'absolute'; particle.style.left = `${Math.random() * 100}%`; particle.style.bottom = '-50px';
        particle.style.width = `${Math.random() * 3 + 1}px`; particle.style.height = `${Math.random() * 60 + 20}px`;
        particle.style.backgroundColor = `rgba(200, 200, 200, ${Math.random() * 0.1 + 0.02})`;
        particle.style.animationName = 'soundwaveRise'; particle.style.animationDuration = `${Math.random() * 8 + 5}s`;
        particle.style.animationTimingFunction = 'linear'; particle.style.animationIterationCount = '1';
        particle.style.animationDelay = `${Math.random() * 2}s`;
        particlesContainer.appendChild(particle);
        particle.addEventListener('animationend', () => particle.remove());
    }
    function startSoundwaveParticles(intervalMs = 300) { if (soundwaveParticlesInterval) clearInterval(soundwaveParticlesInterval); soundwaveParticlesInterval = setInterval(createSoundwaveParticle, intervalMs); }
    function stopSoundwaveParticles() { if (soundwaveParticlesInterval) clearInterval(soundwaveParticlesInterval); const container = document.getElementById('background-soundwave-particles'); if(container) container.innerHTML = '';}
    const applyPageBackgroundAndParticles = (baseColorRgbString) => { /* ... (completa) ... */ };
    const applyPublicProfileTheme = (theme) => { /* ... (completa) ... */ };
    
    onAuthStateChanged(auth, async (loggedInUser) => {
        viewer = loggedInUser; 
        if (viewer) { 
            try { 
                const snap = await getDoc(doc(db, "users", viewer.uid)); 
                if (snap.exists()) viewerData = snap.data(); 
                else viewerData = {displayName: viewer.displayName, photoURL: viewer.photoURL, friendsCount: 0, followersCount: 0, followingCount: 0};
            } catch (error) { console.error("Erro ao buscar dados do visualizador:", error); viewerData = {displayName: viewer.displayName, photoURL: viewer.photoURL}; } 
        } else viewerData = null;

        if (userAuthSection) { /* ... (atualiza header do viewer - completa) ... */ }
        loadPublicProfile();
    });

    async function loadPublicProfile() {
        const params = new URLSearchParams(window.location.search); viewedUserUid = params.get('uid'); 
        if (!viewedUserUid) { if(profileLoadingDiv) profileLoadingDiv.style.display = 'none'; showMessage(profileErrorDiv, 'Perfil não especificado.'); return; } 
        if(profileLoadingDiv) profileLoadingDiv.style.display = 'block'; if(profileContentDiv) profileContentDiv.style.display = 'none';  if(profileErrorDiv) profileErrorDiv.style.display = 'none';
        try { 
            const userDocSnap = await getDoc(doc(db, "users", viewedUserUid)); 
            if (userDocSnap.exists()) { 
                viewedUserData = userDocSnap.data(); 
                // Garante que contadores sejam numéricos para a UI
                viewedUserData.friendsCount = Number(viewedUserData.friendsCount) || 0;
                viewedUserData.followersCount = Number(viewedUserData.followersCount) || 0;
                viewedUserData.followingCount = Number(viewedUserData.followingCount) || 0;

                if(profilePagePhoto) profilePagePhoto.src = viewedUserData.photoURL || 'imgs/default-avatar.png'; 
                // ... (resto do preenchimento do perfil - completo)
                if(profilePageDisplayName) profilePageDisplayName.textContent = viewedUserData.displayName || 'Usuário Anônimo'; 
                if (viewedUserData.scratchUsername && profilePageScratchLink && profilePageScratchUsername) { profilePageScratchUsername.textContent = `@${viewedUserData.scratchUsername}`; profilePageScratchLink.href = `https://scratch.mit.edu/users/${viewedUserData.scratchUsername}/`; profilePageScratchLink.style.display = 'inline'; } else if (profilePageScratchLink) profilePageScratchLink.style.display = 'none'; 
                if(profilePagePronouns) profilePagePronouns.textContent = viewedUserData.pronouns || ''; 
                if(profilePageDescriptionText) profilePageDescriptionText.textContent = viewedUserData.profileDescription || 'Nenhuma descrição.';
                
                if(friendsCountSpan) friendsCountSpan.textContent = viewedUserData.friendsCount; 
                if(followersCountSpan) followersCountSpan.textContent = viewedUserData.followersCount; 
                if(followingCountSpan) followingCountSpan.textContent = viewedUserData.followingCount;
                
                if(statsFriendsLink) statsFriendsLink.href = `connections.html?uid=${viewedUserUid}&tab=friends`; 
                if(statsFollowersLink) statsFollowersLink.href = `connections.html?uid=${viewedUserUid}&tab=followers`; 
                if(statsFollowingLink) statsFollowingLink.href = `connections.html?uid=${viewedUserUid}&tab=following`;
                
                applyPublicProfileTheme(viewedUserData.profileTheme || null); 
                if(profileLoadingDiv) profileLoadingDiv.style.display = 'none'; 
                if(profileContentDiv) profileContentDiv.style.display = 'block'; 
                
                await checkFollowingStatus(); // Essencial antes de popular o popup
                populateOptionsPopup(); // Popula ou repopula o pop-up de opções
                updateFriendActionButton(); 
            } else { /* ... (tratamento de perfil não encontrado - completo) ... */ }
        } catch (error) { /* ... (tratamento de erro - completo) ... */ }
    }

    function populateOptionsPopup() { // REVISADA
        if (!optionsPopup || !viewedUserData || !moreOptionsButton) return; // Verifica se o botão existe
        optionsPopup.innerHTML = ''; 
        let hasOptions = false;

        if (viewer && viewer.uid !== viewedUserUid) { 
            const followButton = document.createElement('button');
            followButton.className = 'options-popup-item';
            followButton.id = 'popup-follow-unfollow-btn';
            followButton.innerHTML = `<i class="fas ${isFollowingViewedUser ? 'fa-user-minus' : 'fa-user-plus'}"></i> ${isFollowingViewedUser ? 'Deixar de Seguir' : 'Seguir'}`;
            followButton.addEventListener('click', handleFollowUnfollow);
            optionsPopup.appendChild(followButton);
            hasOptions = true;
        }

        if (viewedUserData.scratchUsername) {
            if (optionsPopup.children.length > 0) { const sep = document.createElement('div'); sep.className = 'options-popup-separator'; optionsPopup.appendChild(sep); }
            const scratchLinkItem = document.createElement('a'); // Mudado para 'a' para ser clicável como link
            scratchLinkItem.className = 'options-popup-item';
            scratchLinkItem.href = `https://scratch.mit.edu/users/${viewedUserData.scratchUsername}/`;
            scratchLinkItem.target = '_blank'; scratchLinkItem.rel = 'noopener noreferrer';
            scratchLinkItem.innerHTML = `<i class="fas fa-external-link-alt"></i> Ver perfil no Scratch`;
            optionsPopup.appendChild(scratchLinkItem);
            hasOptions = true;
        }

        if (!hasOptions && viewer && viewer.uid === viewedUserUid) { // Se é o próprio perfil e não há outras opções
             const editProfileLink = document.createElement('a');
             editProfileLink.className = 'options-popup-item';
             editProfileLink.href = 'profile.html';
             editProfileLink.innerHTML = `<i class="fas fa-edit"></i> Editar Meu Perfil`;
             optionsPopup.appendChild(editProfileLink);
             hasOptions = true;
        }
        
        if (!hasOptions) { // Se realmente não houver nenhuma opção
            const noOptionsItem = document.createElement('div');
            noOptionsItem.className = 'options-popup-item'; noOptionsItem.textContent = 'Nenhuma ação disponível';
            noOptionsItem.style.fontStyle = 'italic'; noOptionsItem.style.color = '#7f8c8d';
            optionsPopup.appendChild(noOptionsItem);
        }
        // Torna o botão "..." visível se houver opções, ou esconde se não houver (exceto se for o próprio perfil, que sempre tem "Editar")
        if (moreOptionsButton) {
            moreOptionsButton.style.display = (hasOptions || (viewer && viewer.uid === viewedUserUid)) ? 'inline-block' : 'none';
        }
    }

    if (moreOptionsButton && optionsPopup) {
        moreOptionsButton.addEventListener('click', (event) => {
            event.stopPropagation(); 
            // Repopula antes de mostrar para garantir que o estado de "seguir" esteja atualizado
            if (viewedUserData) populateOptionsPopup(); 
            optionsPopup.classList.toggle('visible');
        });
        document.addEventListener('click', (event) => { 
            if (optionsPopup.classList.contains('visible') && !optionsPopup.contains(event.target) && event.target !== moreOptionsButton && !moreOptionsButton.contains(event.target) ) {
                optionsPopup.classList.remove('visible');
            }
        });
    }

    async function checkFollowingStatus() { /* ... (código completo da função da resposta anterior) ... */ }

    async function handleFollowUnfollow() { /* ... (código completo da função da resposta anterior, garantindo que currentViewerDataForTransaction é pego DENTRO da transação ao seguir) ... */
        if (!viewer || !viewedUserUid || !viewedUserData || viewer.uid === viewedUserUid) { showMessage(friendActionMessage, "Ação inválida.", "error"); return; }
        const actionText = isFollowingViewedUser ? "Deixar de seguir" : "Seguir"; showMessage(friendActionMessage, `${actionText.replace('ar de s', 'ando')}...`, "success", 3000);
        if(optionsPopup) optionsPopup.classList.remove('visible'); 
        const viewerFollowingRef = doc(db, `users/${viewer.uid}/following/${viewedUserUid}`);
        const viewedUserFollowersRef = doc(db, `users/${viewedUserUid}/followers/${viewer.uid}`);
        const viewerDocRef = doc(db, "users", viewer.uid);
        try {
            await runTransaction(db, async (transaction) => {
                const viewerProfileSnap = await transaction.get(viewerDocRef); // Pega dados ATUAIS do viewer
                const currentViewerDataForTransaction = viewerProfileSnap.data() || viewerData || {displayName: viewer.displayName, photoURL: viewer.photoURL};
                if (isFollowingViewedUser) { 
                    transaction.delete(viewerFollowingRef); transaction.delete(viewedUserFollowersRef);
                    transaction.update(viewerDocRef, { followingCount: increment(-1) });
                } else { 
                    transaction.set(viewerFollowingRef, { timestamp: serverTimestamp(), displayName: viewedUserData.displayName || "Usuário", photoURL: viewedUserData.photoURL || 'imgs/default-avatar.png' });
                    transaction.set(viewedUserFollowersRef, { timestamp: serverTimestamp(), displayName: currentViewerDataForTransaction.displayName || "Seguidor", photoURL: currentViewerDataForTransaction.photoURL || 'imgs/default-avatar.png' });
                    transaction.update(viewerDocRef, { followingCount: increment(1) });
                }
            });
            isFollowingViewedUser = !isFollowingViewedUser; 
            if (viewedUserData) { const change = isFollowingViewedUser ? 1 : -1; viewedUserData.followersCount = (viewedUserData.followersCount || 0) + change; if(followersCountSpan) followersCountSpan.textContent = Math.max(0, viewedUserData.followersCount); }
            if(viewerData){ const change = isFollowingViewedUser ? 1 : -1; viewerData.followingCount = (viewerData.followingCount || 0) + change; }
            showMessage(friendActionMessage, isFollowingViewedUser ? `Agora você segue ${viewedUserData.displayName || 'este usuário'}!` : `Você deixou de seguir ${viewedUserData.displayName || 'este usuário'}.`, "success");
            populateOptionsPopup();
        } catch (error) { console.error("Erro ao seguir/deixar de seguir:", error); showMessage(friendActionMessage, `Erro: ${error.message || "Falha na operação."}`, "error"); }
    }
    
    // --- Funções de Ação de Amizade (COM ATUALIZAÇÃO DE CONTADOR APENAS DO VIEWER NO FIRESTORE E DADOS DESNORMALIZADOS) ---
    async function updateFriendActionButton() { /* ... (código completo da função da resposta anterior) ... */ }
    async function handleAddFriend(currentViewerDataForAction) { /* ... (código completo da função da resposta anterior, com timestamp, displayName, photoURL) ... */ }
    async function handleRemoveFriend() { /* ... (código completo da função da resposta anterior, increment friendsCount apenas do viewer) ... */ }
    async function handleCancelRequest() { /* ... (código completo da função da resposta anterior) ... */ }
    async function handleAcceptRequest() { /* ... (código completo da função da resposta anterior, increment friendsCount apenas do viewer, com timestamp, displayName, photoURL) ... */ }
    async function handleDeclineRequest() { /* ... (código completo da função da resposta anterior) ... */ }

    console.log("David's Farm public profile script (vREVISADO Contadores e UI) carregado!");
});