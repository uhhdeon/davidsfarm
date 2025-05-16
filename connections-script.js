// connections-script.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, orderBy, limit, startAfter, updateDoc, writeBatch, increment, serverTimestamp, deleteDoc as deleteFirestoreDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores DOM (COMPLETOS DA VERSÃO ANTERIOR) ---
    const userAuthSection = document.querySelector('.user-auth-section');
    const currentYearSpan = document.getElementById('currentYear');
    const siteContent = document.getElementById('site-content');
    const connectionsPageTitleSpan = document.getElementById('connections-username');
    const tabFriendsBtn = document.getElementById('tab-conn-friends');
    const tabFollowersBtn = document.getElementById('tab-conn-followers');
    const tabFollowingBtn = document.getElementById('tab-conn-following');
    const connFriendsCountSpan = document.getElementById('conn-friends-count');
    const connFollowersCountSpan = document.getElementById('conn-followers-count');
    const connFollowingCountSpan = document.getElementById('conn-following-count');
    const listContainer = document.getElementById('connections-list-container');
    const connectionsListUl = document.getElementById('connections-list');
    const loadingDiv = document.getElementById('connections-loading');
    const emptyMessageP = document.getElementById('connections-empty-message');

    let viewer = null;
    let viewerData = null;
    let profileUid = null;
    let profileUserData = null; // Dados do Firestore do perfil cujas conexões estão sendo vistas
    let currentActiveTab = 'friends';
    let soundwaveParticlesInterval = null;
    let lastVisibleDoc = null; 
    const PAGE_SIZE = 200; // Aumentado para testar mais itens, idealmente implementar "carregar mais"

    // --- Funções Utilitárias e de Tema (COMPLETAS) ---
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (siteContent) setTimeout(() => siteContent.classList.add('visible'), 100);
    const showMessageToList = (message, type = 'info') => { /* ... (completa) ... */ };
    function rgbStringToComponents(rgbString) { /* ... (completa) ... */ }
    function lightenDarkenColor(colorObj, percent) { /* ... (completa) ... */ }
    function createSoundwaveParticle() { /* ... (completa) ... */ }
    function startSoundwaveParticles(intervalMs = 300) { /* ... (completa) ... */ }
    function stopSoundwaveParticles() { /* ... (completa) ... */ }
    const applyPageBackgroundAndParticles = (baseColorRgbString) => { /* ... (completa) ... */ };
    
    const params = new URLSearchParams(window.location.search);
    profileUid = params.get('uid');
    currentActiveTab = params.get('tab') || 'friends';

    if (!profileUid) {
        if (connectionsPageTitleSpan) connectionsPageTitleSpan.textContent = "Erro";
        showMessageToList("Nenhum perfil de usuário especificado.", "error");
        if (loadingDiv) loadingDiv.style.display = 'none';
    }

    onAuthStateChanged(auth, async (loggedInUser) => { /* ... (completa) ... */
        viewer = loggedInUser; 
        if (viewer) { 
            try { 
                const snap = await getDoc(doc(db, "users", viewer.uid)); 
                if (snap.exists()) viewerData = snap.data(); 
                else viewerData = {displayName: viewer.displayName, photoURL: viewer.photoURL, friendsCount: 0, followersCount: 0, followingCount: 0};
            } catch (error) { console.error("Erro ao buscar dados do visualizador:", error); viewerData = {displayName: viewer.displayName, photoURL: viewer.photoURL}; } 
        } else viewerData = null;
        if (userAuthSection) { /* ... (atualiza header do viewer - completa) ... */ }
        if (profileUid) fetchProfileAndConnections();
    });

    async function fetchProfileAndConnections() {
        if (!profileUid) return; 
        if (loadingDiv) loadingDiv.style.display = 'block'; 
        if (emptyMessageP) emptyMessageP.style.display = 'none'; 
        if (connectionsListUl) connectionsListUl.innerHTML = '';
        try {
            const userDocSnap = await getDoc(doc(db, "users", profileUid));
            if (userDocSnap.exists()) {
                profileUserData = userDocSnap.data();
                // Garante que os contadores são números
                profileUserData.friendsCount = Number(profileUserData.friendsCount) || 0;
                profileUserData.followersCount = Number(profileUserData.followersCount) || 0;
                profileUserData.followingCount = Number(profileUserData.followingCount) || 0;

                if (connectionsPageTitleSpan) connectionsPageTitleSpan.textContent = profileUserData.displayName || "Usuário";
                if(connFriendsCountSpan) connFriendsCountSpan.textContent = profileUserData.friendsCount;
                if(connFollowersCountSpan) connFollowersCountSpan.textContent = profileUserData.followersCount;
                if(connFollowingCountSpan) connFollowingCountSpan.textContent = profileUserData.followingCount;
                
                const siteBaseColor = profileUserData.profileTheme?.siteBaseColor || (profileUserData.profileTheme?.type === 'solid' ? profileUserData.profileTheme.color : profileUserData.profileTheme?.color1);
                applyPageBackgroundAndParticles(siteBaseColor || null);
                setActiveTab(currentActiveTab);
            } else { /* ... (tratamento perfil não encontrado - completo) ... */ }
        } catch (error) { /* ... (tratamento erro - completo) ... */ }
        finally { if (loadingDiv) loadingDiv.style.display = 'none'; }
    }

    function setActiveTab(tabName) { /* ... (completa) ... */ }
    if (tabFriendsBtn) tabFriendsBtn.addEventListener('click', () => setActiveTab('friends'));
    if (tabFollowersBtn) tabFollowersBtn.addEventListener('click', () => setActiveTab('followers'));
    if (tabFollowingBtn) tabFollowingBtn.addEventListener('click', () => setActiveTab('following'));

    async function fetchConnectionsList(type) { // REVISADA
        if (!profileUid || !profileUserData) { if (loadingDiv) loadingDiv.style.display = 'none'; showMessageToList("Dados do perfil não carregados.", "error"); return; }
        if (loadingDiv) loadingDiv.style.display = 'block'; if (emptyMessageP) emptyMessageP.style.display = 'none'; if (connectionsListUl) connectionsListUl.innerHTML = '';
        lastVisibleDoc = null; 

        let collectionPath = '';
        let orderByField = "timestamp"; // Campo padrão para ordenação

        if (type === 'friends') collectionPath = `users/${profileUid}/friends`;
        else if (type === 'followers') collectionPath = `users/${profileUid}/followers`;
        else if (type === 'following') collectionPath = `users/${profileUid}/following`;
        else { showMessageToList("Tipo de lista inválido.", "error"); if (loadingDiv) loadingDiv.style.display = 'none'; return; }

        try {
            // Adiciona orderBy 'timestamp' se o campo existir nos documentos da subcoleção
            // Para amigos, se você usou 'addedAt', mude aqui ou nos dados. Assumindo 'timestamp'.
            const q = query(collection(db, collectionPath), orderBy(orderByField, "desc"), limit(PAGE_SIZE));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                let msg = "Nenhum usuário para mostrar aqui.";
                if (type === 'friends') msg = `${profileUserData.displayName || 'Este usuário'} ainda não tem amigos.`;
                else if (type === 'followers') msg = `${profileUserData.displayName || 'Este usuário'} ainda não tem seguidores.`;
                else if (type === 'following') msg = `${profileUserData.displayName || 'Este usuário'} não segue ninguém ainda.`;
                showMessageToList(msg, "info");
            } else {
                // Usa os dados desnormalizados (displayName, photoURL, timestamp) diretamente da subcoleção
                const itemsToRender = querySnapshot.docs.map(itemDoc => {
                    const data = itemDoc.data();
                    return {
                        id: itemDoc.id,
                        displayName: data.displayName || "Usuário Desconhecido", // Fallback
                        photoURL: data.photoURL || 'imgs/default-avatar.png',   // Fallback
                        timestamp: data.timestamp // Para debug, se necessário
                        // Adicione outros campos desnormalizados se houver
                    };
                });
                renderConnectionsList(itemsToRender, type);
                lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
            }
        } catch (error) {
            console.error(`Erro ao buscar ${type}:`, error);
            showMessageToList(`Erro ao carregar ${type}. Verifique se os dados (timestamp, displayName, photoURL) existem na subcoleção.`, "error");
        } finally {
            if (loadingDiv) loadingDiv.style.display = 'none';
        }
    }

    function renderConnectionsList(items, type) { /* ... (completa, como na última resposta, usando item.displayName e item.photoURL) ... */ }
    async function handleUnfollowFromList(event) { /* ... (completa, como na última resposta) ... */ }
    async function handleRemoveFriendFromList(event) { /* ... (completa, como na última resposta) ... */ }

    console.log("David's Farm connections script (vContadores Lidos e Desnormalização) carregado!");
});