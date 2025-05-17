// public-profile-script.js
// ESTA É A VERSÃO DA PENÚLTIMA RESPOSTA, QUE TENTA ATUALIZAR
// OS CONTADORES EM AMBOS OS DOCUMENTOS DE USUÁRIO.
// TESTE-A COM AS REGRAS DO FIRESTORE FORNECIDAS NO TOPO DESTA RESPOSTA ATUAL.
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
    const moreOptionsButton = document.getElementById('profile-more-options-btn');
    const optionsPopup = document.getElementById('profile-options-popup');

    let viewer = null;
    let viewedUserUid = null;
    let viewedUserData = null; 
    let viewerData = null;     
    let isFollowingViewedUser = false;
    let soundwaveParticlesInterval = null;

    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (siteContent) setTimeout(() => siteContent.classList.add('visible'), 100);

    const showMessage = (element, message, type = 'error', duration = 5000) => {
        if (!element) return; element.textContent = message;
        element.className = 'form-message ' + (type === 'success' ? 'success' : 'error');
        element.style.display = 'block';
        setTimeout(() => { if (element) { element.style.display = 'none'; element.textContent = ''; }}, duration);
    };
    function rgbStringToComponents(rgbString) {
        if (!rgbString || !rgbString.startsWith('rgb')) return { r: 26, g: 26, b: 26 };
        const result = rgbString.match(/\d+/g);
        if (result && result.length === 3) return { r: parseInt(result[0]), g: parseInt(result[1]), b: parseInt(result[2]) };
        return { r: 26, g: 26, b: 26 };
    }
    function lightenDarkenColor(colorObj, percent) {
        const newR = Math.max(0, Math.min(255, Math.round(colorObj.r * (1 + percent))));
        const newG = Math.max(0, Math.min(255, Math.round(colorObj.g * (1 + percent))));
        const newB = Math.max(0, Math.min(255, Math.round(colorObj.b * (1 + percent))));
        return `rgb(${newR},${newG},${newB})`;
    }
    function calculateLuminance(colorObj) {
        const r = colorObj.r / 255, g = colorObj.g / 255, b = colorObj.b / 255;
        const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function getDynamicAccentColor(baseAccentRgbString, mainBgRgbString) {
        const baseAccentObj = rgbStringToComponents(baseAccentRgbString);
        const mainBgLuminance = calculateLuminance(rgbStringToComponents(mainBgRgbString));
        const accentLuminance = calculateLuminance(baseAccentObj);
        if (mainBgLuminance > 0.6) { if (accentLuminance > 0.5) return lightenDarkenColor(baseAccentObj, -0.45); return `rgb(${baseAccentObj.r},${baseAccentObj.g},${baseAccentObj.b})`; }
        else { if (accentLuminance < 0.35) return lightenDarkenColor(baseAccentObj, 0.6); return `rgb(${baseAccentObj.r},${baseAccentObj.g},${baseAccentObj.b})`; }
    }
    function setTextContrastAndAccents(primaryBgColorString, accentBaseColorString) {
        if (!publicProfileMainElement) return;
        const bgColorObj = rgbStringToComponents(primaryBgColorString); const luminance = calculateLuminance(bgColorObj);
        const dynamicAccent = getDynamicAccentColor(accentBaseColorString, primaryBgColorString);
        if (luminance > 0.5) { publicProfileMainElement.classList.remove('text-theme-light'); publicProfileMainElement.classList.add('text-theme-dark'); }
        else { publicProfileMainElement.classList.remove('text-theme-dark'); publicProfileMainElement.classList.add('text-theme-light'); }
        if (profilePagePhoto) profilePagePhoto.style.borderColor = dynamicAccent;
        if (profilePageScratchLink) profilePageScratchLink.style.color = dynamicAccent;
        if (profileDescriptionSectionTitle) { if (luminance > 0.5) profileDescriptionSectionTitle.style.color = '#1f2328'; else profileDescriptionSectionTitle.style.color = '#FFFFFF'; }
    }
    function createSoundwaveParticle() {
        let particlesContainer = document.getElementById('background-soundwave-particles');
        if (!particlesContainer) {
            particlesContainer = document.createElement('div');
            particlesContainer.id = 'background-soundwave-particles';
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
    const applyPageBackgroundAndParticles = (baseColorRgbString) => {
        const body = document.body; if (baseColorRgbString) { const bgColorObj = rgbStringToComponents(baseColorRgbString); body.style.backgroundColor = lightenDarkenColor(bgColorObj, -0.55); startSoundwaveParticles(); }
        else { body.style.backgroundColor = ''; stopSoundwaveParticles(); }
    };
    const applyPublicProfileTheme = (theme) => {
        if (!publicProfileMainElement) return; let primaryBgColorForContrast = 'rgb(37,37,37)'; let accentBaseColor = 'rgb(0, 191, 255)';
        let siteBaseColorForPageBg = viewedUserData?.profileTheme?.siteBaseColor || null;
        if (!theme) {
            publicProfileMainElement.style.background = ''; publicProfileMainElement.style.backgroundImage = '';
            if (profileDescriptionSection) { profileDescriptionSection.style.background = ''; profileDescriptionSection.style.backgroundImage = '';}
            siteBaseColorForPageBg = 'rgb(26, 26, 26)'; 
        } else {
            siteBaseColorForPageBg = theme.siteBaseColor || (theme.type === 'solid' ? theme.color : theme.color1);
            if (theme.type === 'solid') {
                publicProfileMainElement.style.backgroundImage = 'none'; publicProfileMainElement.style.backgroundColor = theme.color;
                primaryBgColorForContrast = theme.color; accentBaseColor = theme.color; 
                if (profileDescriptionSection) { const lighterColor = lightenDarkenColor(rgbStringToComponents(theme.color), 0.12); profileDescriptionSection.style.backgroundImage = 'none'; profileDescriptionSection.style.backgroundColor = lighterColor;}
            } else if (theme.type === 'gradient') {
                publicProfileMainElement.style.backgroundColor = 'transparent'; publicProfileMainElement.style.backgroundImage = `linear-gradient(to bottom, ${theme.color1}, ${theme.color2})`;
                primaryBgColorForContrast = theme.color1; accentBaseColor = theme.color1;
                if (profileDescriptionSection) { const lighterC1 = lightenDarkenColor(rgbStringToComponents(theme.color1), 0.15); const lighterC2 = lightenDarkenColor(rgbStringToComponents(theme.color2), 0.10); profileDescriptionSection.style.backgroundColor = 'transparent'; profileDescriptionSection.style.backgroundImage = `linear-gradient(to bottom, ${lighterC1}, ${lighterC2})`;}
            }
        }
        setTextContrastAndAccents(primaryBgColorForContrast, accentBaseColor);
        applyPageBackgroundAndParticles(siteBaseColorForPageBg);
    };
    
    onAuthStateChanged(auth, async (loggedInUser) => {
        viewer = loggedInUser; 
        if (viewer) { 
            try { 
                const snap = await getDoc(doc(db, "users", viewer.uid)); 
                if (snap.exists()) viewerData = snap.data(); 
                else viewerData = {displayName: viewer.displayName, photoURL: viewer.photoURL, friendsCount: 0, followersCount: 0, followingCount: 0};
            } catch (error) { console.error("Erro ao buscar dados do visualizador:", error); viewerData = {displayName: viewer.displayName, photoURL: viewer.photoURL}; } 
        } else viewerData = null;

        if (userAuthSection) { 
            if (viewer) { 
                const dName = (viewerData?.displayName || viewer.displayName || viewer.email?.split('@')[0]) ?? "Usuário"; 
                const pUrl = (viewerData?.photoURL || viewer.photoURL) ?? 'imgs/default-avatar.png'; 
                userAuthSection.innerHTML = `<a href="profile.html" class="user-info-link"><div class="user-info"><img id="user-photo" src="${pUrl}" alt="Foto"><span id="user-name">${dName}</span></div></a>`; 
            } else userAuthSection.innerHTML = `<a href="login.html" class="login-button">Login</a>`; 
        }
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
                viewedUserData.friendsCount = viewedUserData.friendsCount || 0;
                viewedUserData.followersCount = viewedUserData.followersCount || 0;
                viewedUserData.followingCount = viewedUserData.followingCount || 0;

                if(profilePagePhoto) profilePagePhoto.src = viewedUserData.photoURL || 'imgs/default-avatar.png'; 
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
                await checkFollowingStatus(); 
                populateOptionsPopup(); 
                updateFriendActionButton(); 
            } else { 
                if(profileLoadingDiv) profileLoadingDiv.style.display = 'none'; 
                showMessage(profileErrorDiv, 'Perfil não encontrado.'); 
                applyPageBackgroundAndParticles(null); 
            }
        } catch (error) { 
            console.error("Erro ao carregar perfil público:", error); 
            if(profileLoadingDiv) profileLoadingDiv.style.display = 'none'; 
            showMessage(profileErrorDiv, 'Erro ao carregar o perfil.'); 
            applyPageBackgroundAndParticles(null); 
        }
    }

    function populateOptionsPopup() {
        if (!optionsPopup || !viewedUserData) return; optionsPopup.innerHTML = '';
        if (viewer && viewer.uid !== viewedUserUid) { const followBtn = document.createElement('button'); followBtn.className = 'options-popup-item'; followBtn.id = 'popup-follow-unfollow-btn'; followBtn.innerHTML = `<i class="fas ${isFollowingViewedUser ? 'fa-user-minus' : 'fa-user-plus'}"></i> ${isFollowingViewedUser ? 'Deixar de Seguir' : 'Seguir'}`; followBtn.addEventListener('click', handleFollowUnfollow); optionsPopup.appendChild(followBtn); }
        if (viewedUserData.scratchUsername) { if (optionsPopup.children.length > 0) { const sep = document.createElement('div'); sep.className = 'options-popup-separator'; optionsPopup.appendChild(sep); } const scratchL = document.createElement('a'); scratchL.className = 'options-popup-item'; scratchL.href = `https://scratch.mit.edu/users/${viewedUserData.scratchUsername}/`; scratchL.target = '_blank'; scratchL.rel = 'noopener noreferrer'; scratchL.innerHTML = `<i class="fas fa-external-link-alt"></i> Ver perfil no Scratch`; optionsPopup.appendChild(scratchL); }
        if (optionsPopup.children.length === 0) { const noOpt = document.createElement('div'); noOpt.className = 'options-popup-item'; noOpt.textContent = 'Nenhuma ação disponível'; noOpt.style.fontStyle = 'italic'; noOpt.style.color = '#7f8c8d'; optionsPopup.appendChild(noOpt); }
    }
    if (moreOptionsButton && optionsPopup) {
        moreOptionsButton.addEventListener('click', (event) => { event.stopPropagation(); optionsPopup.classList.toggle('visible'); if (optionsPopup.classList.contains('visible')) populateOptionsPopup(); });
        document.addEventListener('click', (event) => { if (optionsPopup.classList.contains('visible') && !optionsPopup.contains(event.target) && event.target !== moreOptionsButton && !moreOptionsButton.contains(event.target) ) optionsPopup.classList.remove('visible'); });
    }
    async function checkFollowingStatus() {
         isFollowingViewedUser = false; if (viewer && viewedUserUid && viewer.uid !== viewedUserUid) { const ref = doc(db, `users/${viewer.uid}/following/${viewedUserUid}`); try { const snap = await getDoc(ref); isFollowingViewedUser = snap.exists(); } catch (e) { console.error("Erro checkFollowing:", e); isFollowingViewedUser = false;}}
    }

    async function handleFollowUnfollow() {
        if (!viewer || !viewedUserUid || !viewedUserData || viewer.uid === viewedUserUid) {
            showMessage(friendActionMessage, "Ação inválida.", "error"); return;
        }
        const actionText = isFollowingViewedUser ? "Deixar de seguir" : "Seguir";
        showMessage(friendActionMessage, `${actionText.replace('ar de s', 'ando')}...`, "success", 3000);
        if(optionsPopup) optionsPopup.classList.remove('visible'); 

        const viewerFollowingRef = doc(db, `users/${viewer.uid}/following/${viewedUserUid}`);
        const viewedUserFollowersRef = doc(db, `users/${viewedUserUid}/followers/${viewer.uid}`);
        const viewerDocRef = doc(db, "users", viewer.uid);
        const viewedUserDocRef = doc(db, "users", viewedUserUid); // Referência para o doc do usuário visualizado

        try {
            await runTransaction(db, async (transaction) => {
                const viewerProfileSnap = await transaction.get(viewerDocRef);
                const currentViewerDataForTransaction = viewerProfileSnap.data() || viewerData || {displayName: viewer.displayName, photoURL: viewer.photoURL};

                if (isFollowingViewedUser) { 
                    transaction.delete(viewerFollowingRef);
                    transaction.delete(viewedUserFollowersRef);
                    transaction.update(viewerDocRef, { followingCount: increment(-1) });
                    transaction.update(viewedUserDocRef, { followersCount: increment(-1) }); // TENTANDO ATUALIZAR O CONTADOR DO OUTRO
                } else { 
                    transaction.set(viewerFollowingRef, { timestamp: serverTimestamp(), displayName: viewedUserData.displayName || "Usuário", photoURL: viewedUserData.photoURL || 'imgs/default-avatar.png' });
                    transaction.set(viewedUserFollowersRef, { timestamp: serverTimestamp(), displayName: currentViewerDataForTransaction.displayName || "Seguidor", photoURL: currentViewerDataForTransaction.photoURL || 'imgs/default-avatar.png' });
                    transaction.update(viewerDocRef, { followingCount: increment(1) });
                    transaction.update(viewedUserDocRef, { followersCount: increment(1) }); // TENTANDO ATUALIZAR O CONTADOR DO OUTRO
                }
            });
            isFollowingViewedUser = !isFollowingViewedUser; 
            if (viewedUserData) {
                 viewedUserData.followersCount = (viewedUserData.followersCount || 0) + (isFollowingViewedUser ? 1 : -1);
                 if(followersCountSpan) followersCountSpan.textContent = Math.max(0, viewedUserData.followersCount);
            }
            if(viewerData){ 
                viewerData.followingCount = (viewerData.followingCount || 0) + (isFollowingViewedUser ? 1 : -1);
            }
            showMessage(friendActionMessage, isFollowingViewedUser ? `Agora você segue ${viewedUserData.displayName || 'este usuário'}!` : `Você deixou de seguir ${viewedUserData.displayName || 'este usuário'}.`, "success");
            populateOptionsPopup();
        } catch (error) {
            console.error("Erro ao seguir/deixar de seguir:", error);
            showMessage(friendActionMessage, `Erro: ${error.message || "Falha na operação."}`, "error");
        }
    }

    async function updateFriendActionButton() {
        if (!friendActionButtonContainer) { console.warn("friendActionButtonContainer não encontrado"); return; }
        friendActionButtonContainer.innerHTML = ''; 
        if (!viewer || !viewedUserData) { if (viewer && viewedUserUid && viewer.uid === viewedUserUid) { friendActionButtonContainer.innerHTML = `<a href="profile.html" class="profile-action-button edit">Editar Meu Perfil</a>`; } return; }
        if (viewer.uid === viewedUserUid) { friendActionButtonContainer.innerHTML = `<a href="profile.html" class="profile-action-button edit">Editar Meu Perfil</a>`; return; }
        const currentViewerData = viewerData || { displayName: viewer.displayName || viewer.email.split('@')[0], photoURL: viewer.photoURL || 'imgs/default-avatar.png' };
        try {
            const friendRef = doc(db, `users/${viewer.uid}/friends/${viewedUserUid}`); const sentRequestRef = doc(db, `users/${viewer.uid}/friendRequestsSent/${viewedUserUid}`); const receivedRequestRef = doc(db, `users/${viewer.uid}/friendRequestsReceived/${viewedUserUid}`);
            const [friendSnap, sentSnap, receivedSnap] = await Promise.all([getDoc(friendRef), getDoc(sentRequestRef), getDoc(receivedRequestRef)]);
            if (friendSnap.exists()) { friendActionButtonContainer.innerHTML = `<button id="remove-friend-public-btn" class="profile-action-button delete"><img src="imgs/trashbin.png" alt="Remover" class="btn-icon">Remover Amigo</button>`; document.getElementById('remove-friend-public-btn')?.addEventListener('click', handleRemoveFriend); }
            else if (sentSnap.exists()) { friendActionButtonContainer.innerHTML = `<button id="cancel-request-public-btn" class="profile-action-button cancel">Cancelar Pedido</button>`; document.getElementById('cancel-request-public-btn')?.addEventListener('click', handleCancelRequest); }
            else if (receivedSnap.exists()) { friendActionButtonContainer.innerHTML = `<div class="profile-action-buttons-group"><button id="accept-request-public-btn" class="profile-action-button accept">Aceitar Pedido</button><button id="decline-request-public-btn" class="profile-action-button decline">Recusar Pedido</button></div>`; document.getElementById('accept-request-public-btn')?.addEventListener('click', handleAcceptRequest); document.getElementById('decline-request-public-btn')?.addEventListener('click', handleDeclineRequest); }
            else { friendActionButtonContainer.innerHTML = `<button id="add-friend-public-btn" class="profile-action-button add">Adicionar Amigo</button>`; document.getElementById('add-friend-public-btn')?.addEventListener('click', () => handleAddFriend(currentViewerData)); }
        } catch (error) { console.error("Erro status amizade:", error); showMessage(friendActionMessage, "Erro ações amizade.", "error");}
    }
    async function handleAddFriend(currentViewerDataForAction) { 
        if (!viewer || !viewedUserData || !currentViewerDataForAction) { showMessage(friendActionMessage, "Erro: Dados incompletos."); return; } showMessage(friendActionMessage, "Enviando pedido...", "success"); const batch = writeBatch(db);
        try { 
            const sentRef = doc(db, `users/${viewer.uid}/friendRequestsSent`, viewedUserUid); 
            batch.set(sentRef, { timestamp: serverTimestamp(), receiverUid: viewedUserUid, receiverName: viewedUserData.displayName || "Usuário", receiverPhotoURL: viewedUserData.photoURL || 'imgs/default-avatar.png'}); 
            const receivedRef = doc(db, `users/${viewedUserUid}/friendRequestsReceived`, viewer.uid); 
            batch.set(receivedRef, { timestamp: serverTimestamp(), senderUid: viewer.uid, senderName: currentViewerDataForAction.displayName, senderPhotoURL: currentViewerDataForAction.photoURL }); 
            await batch.commit(); showMessage(friendActionMessage, "Pedido enviado!", "success"); updateFriendActionButton(); 
        }
        catch (error) { console.error("Erro ao enviar pedido:", error); showMessage(friendActionMessage, "Erro ao enviar."); }
    }
    async function handleRemoveFriend() { 
        if (!viewer || !viewedUserData) { showMessage(friendActionMessage, "Erro: Dados incompletos."); return; } 
        if (window.confirm(`Remover ${viewedUserData.displayName || 'este usuário'} dos amigos?`)) { 
            showMessage(friendActionMessage, 'Removendo...', 'success'); 
            const batch = writeBatch(db); 
            const viewerDocRef = doc(db, "users", viewer.uid); 
            const viewedUserDocRef = doc(db, "users", viewedUserUid); 
            try { 
                batch.delete(doc(db, `users/${viewer.uid}/friends`, viewedUserUid)); 
                batch.delete(doc(db, `users/${viewedUserUid}/friends`, viewer.uid)); 
                batch.update(viewerDocRef, { friendsCount: increment(-1) }); 
                batch.update(viewedUserDocRef, { friendsCount: increment(-1) }); // TENTANDO ATUALIZAR O CONTADOR DO OUTRO
                await batch.commit(); 
                if(viewedUserData) { viewedUserData.friendsCount = Math.max(0, (viewedUserData.friendsCount || 1) - 1); if(friendsCountSpan) friendsCountSpan.textContent = viewedUserData.friendsCount; } 
                if(viewerData) { viewerData.friendsCount = Math.max(0, (viewerData.friendsCount || 1) -1); } 
                showMessage(friendActionMessage, 'Amigo removido.', 'success'); updateFriendActionButton();
            } catch (e) { console.error("Erro ao remover amigo:", e); showMessage(friendActionMessage, 'Erro ao remover.'); }
        }
    }
    async function handleCancelRequest() { 
        if (!viewer || !viewedUserData) { showMessage(friendActionMessage, "Erro: Dados incompletos."); return; } 
        showMessage(friendActionMessage, 'Cancelando...', 'success'); const batch = writeBatch(db); 
        try { 
            batch.delete(doc(db, `users/${viewer.uid}/friendRequestsSent`, viewedUserUid)); 
            batch.delete(doc(db, `users/${viewedUserUid}/friendRequestsReceived`, viewer.uid)); 
            await batch.commit(); showMessage(friendActionMessage, 'Pedido cancelado.', 'success'); updateFriendActionButton(); 
        } catch (e) { console.error("Erro ao cancelar:", e); showMessage(friendActionMessage, 'Erro ao cancelar.'); }
    }
    async function handleAcceptRequest() { 
        if (!viewer || !viewedUserData || !viewerData ) { showMessage(friendActionMessage, "Erro: Dados incompletos."); return; } 
        showMessage(friendActionMessage, 'Aceitando...', 'success'); 
        const batch = writeBatch(db); 
        const viewerDocRef = doc(db, "users", viewer.uid); 
        const viewedUserDocRef = doc(db, "users", viewedUserUid);
        try { 
            const friendDataForViewer = { timestamp: serverTimestamp(), displayName: viewedUserData.displayName || "Amigo", photoURL: viewedUserData.photoURL || 'imgs/default-avatar.png' };
            const friendDataForViewed = { timestamp: serverTimestamp(), displayName: viewerData.displayName || viewer.displayName || "Amigo", photoURL: viewerData.photoURL || viewer.photoURL || 'imgs/default-avatar.png' };
            batch.set(doc(db, `users/${viewer.uid}/friends`, viewedUserUid), friendDataForViewer); 
            batch.set(doc(db, `users/${viewedUserUid}/friends`, viewer.uid), friendDataForViewed);
            batch.delete(doc(db, `users/${viewer.uid}/friendRequestsReceived`, viewedUserUid)); 
            batch.delete(doc(db, `users/${viewedUserUid}/friendRequestsSent`, viewer.uid)); 
            batch.update(viewerDocRef, { friendsCount: increment(1) }); 
            batch.update(viewedUserDocRef, { friendsCount: increment(1) }); // TENTANDO ATUALIZAR O CONTADOR DO OUTRO
            await batch.commit();
            if(viewedUserData) { viewedUserData.friendsCount = (viewedUserData.friendsCount || 0) + 1; if(friendsCountSpan) friendsCountSpan.textContent = viewedUserData.friendsCount; }
            if(viewerData) { viewerData.friendsCount = (viewerData.friendsCount || 0) + 1; }
            showMessage(friendActionMessage, 'Amigo adicionado!', 'success'); updateFriendActionButton();
        } catch (e) { console.error("Erro ao aceitar:", e); showMessage(friendActionMessage, 'Erro ao aceitar.'); }
    }
    async function handleDeclineRequest() { 
        if (!viewer || !viewedUserData) { showMessage(friendActionMessage, "Erro: Dados incompletos."); return; } 
        showMessage(friendActionMessage, 'Recusando...', 'success'); const batch = writeBatch(db);
        try { 
            batch.delete(doc(db, `users/${viewer.uid}/friendRequestsReceived`, viewedUserUid)); 
            batch.delete(doc(db, `users/${viewedUserUid}/friendRequestsSent`, viewer.uid)); 
            await batch.commit(); showMessage(friendActionMessage, 'Pedido recusado.', 'success'); updateFriendActionButton(); 
        }
        catch (e) { console.error("Erro ao recusar:", e); showMessage(friendActionMessage, 'Erro ao recusar.'); }
    }

    console.log("David's Farm public profile script (vTentando Atualizar Contadores Ambos Lados) carregado!");
});