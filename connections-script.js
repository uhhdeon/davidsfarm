// connections-script.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, orderBy, limit, startAfter, updateDoc, writeBatch, increment, serverTimestamp, deleteDoc as deleteFirestoreDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; // Renomeado deleteDoc

document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores DOM ---
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
    let profileUserData = null;
    let currentActiveTab = 'friends';
    let soundwaveParticlesInterval = null;
    let lastVisibleDoc = null; // Para paginação futura
    const PAGE_SIZE = 20; // Para paginação futura

    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (siteContent) setTimeout(() => siteContent.classList.add('visible'), 100);

    const showMessageToList = (message, type = 'info') => { // Default para 'info'
        if (emptyMessageP) {
            emptyMessageP.textContent = message;
            emptyMessageP.className = 'list-placeholder form-message ' + type; // Usa o tipo diretamente
            emptyMessageP.style.display = 'block';
        }
        if (connectionsListUl) connectionsListUl.innerHTML = '';
    };
    
    function rgbStringToComponents(rgbString) { /* ... (como antes) ... */
        if (!rgbString || !rgbString.startsWith('rgb')) return { r: 26, g: 26, b: 26 };
        const result = rgbString.match(/\d+/g);
        if (result && result.length === 3) return { r: parseInt(result[0]), g: parseInt(result[1]), b: parseInt(result[2]) };
        return { r: 26, g: 26, b: 26 };
    }
    function lightenDarkenColor(colorObj, percent) { /* ... (como antes) ... */
        const newR = Math.max(0, Math.min(255, Math.round(colorObj.r * (1 + percent))));
        const newG = Math.max(0, Math.min(255, Math.round(colorObj.g * (1 + percent))));
        const newB = Math.max(0, Math.min(255, Math.round(colorObj.b * (1 + percent))));
        return `rgb(${newR},${newG},${newB})`;
    }
    function createSoundwaveParticle() { /* ... (como antes, garantindo que o container é criado se não existir) ... */
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
        const body = document.body;
        if (baseColorRgbString) {
            const bgColorObj = rgbStringToComponents(baseColorRgbString);
            body.style.backgroundColor = lightenDarkenColor(bgColorObj, -0.55);
            startSoundwaveParticles();
        } else {
            body.style.backgroundColor = ''; 
            stopSoundwaveParticles();
        }
    };

    const params = new URLSearchParams(window.location.search);
    profileUid = params.get('uid');
    currentActiveTab = params.get('tab') || 'friends';

    if (!profileUid) {
        if (connectionsPageTitleSpan) connectionsPageTitleSpan.textContent = "Erro";
        showMessageToList("Nenhum perfil de usuário especificado.", "error");
        if (loadingDiv) loadingDiv.style.display = 'none';
        // Não retorna aqui, pois o onAuthStateChanged ainda precisa rodar para o header
    }

    onAuthStateChanged(auth, async (loggedInUser) => {
        viewer = loggedInUser;
        if (viewer) {
            try {
                const viewerDocSnap = await getDoc(doc(db, "users", viewer.uid));
                if (viewerDocSnap.exists()) viewerData = viewerDocSnap.data();
            } catch (error) { console.error("Erro ao buscar dados do visualizador:", error); viewerData = null; }
        } else {
            viewerData = null;
        }
        if (userAuthSection) {
            if (viewer) {
                const dName = (viewerData?.displayName || viewer.displayName || viewer.email?.split('@')[0]) ?? "Usuário";
                const pUrl = (viewerData?.photoURL || viewer.photoURL) ?? 'imgs/default-avatar.png';
                userAuthSection.innerHTML = `<a href="profile.html" class="user-info-link"><div class="user-info"><img id="user-photo" src="${pUrl}" alt="Foto"><span id="user-name">${dName}</span></div></a>`;
            } else userAuthSection.innerHTML = `<a href="login.html" class="login-button">Login</a>`;
        }
        if (profileUid) { // Só carrega se profileUid estiver definido
            fetchProfileAndConnections();
        }
    });

    async function fetchProfileAndConnections() {
        if (!profileUid) return;
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (emptyMessageP) emptyMessageP.style.display = 'none';
        if (connectionsListUl) connectionsListUl.innerHTML = '';

        try {
            const userDocRef = doc(db, "users", profileUid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                profileUserData = userDocSnap.data();
                if (connectionsPageTitleSpan) connectionsPageTitleSpan.textContent = profileUserData.displayName || "Usuário";
                if(connFriendsCountSpan) connFriendsCountSpan.textContent = profileUserData.friendsCount || 0;
                if(connFollowersCountSpan) connFollowersCountSpan.textContent = profileUserData.followersCount || 0;
                if(connFollowingCountSpan) connFollowingCountSpan.textContent = profileUserData.followingCount || 0;
                const siteBaseColor = profileUserData.profileTheme?.siteBaseColor || 
                                     (profileUserData.profileTheme?.type === 'solid' ? profileUserData.profileTheme.color : profileUserData.profileTheme?.color1);
                applyPageBackgroundAndParticles(siteBaseColor || null);
                setActiveTab(currentActiveTab);
            } else {
                showMessageToList("Perfil não encontrado.", "error");
                if (connectionsPageTitleSpan) connectionsPageTitleSpan.textContent = "Desconhecido";
                applyPageBackgroundAndParticles(null);
            }
        } catch (error) {
            console.error("Erro ao buscar dados do perfil:", error);
            showMessageToList("Erro ao carregar dados do perfil.", "error");
            if (connectionsPageTitleSpan) connectionsPageTitleSpan.textContent = "Erro";
            applyPageBackgroundAndParticles(null);
        } finally {
            if (loadingDiv) loadingDiv.style.display = 'none';
        }
    }

    function setActiveTab(tabName) {
        currentActiveTab = tabName;
        const url = new URL(window.location);
        url.searchParams.set('tab', tabName);
        history.pushState({}, '', url);
        [tabFriendsBtn, tabFollowersBtn, tabFollowingBtn].forEach(btn => btn?.classList.remove('active'));
        if (tabName === 'friends' && tabFriendsBtn) tabFriendsBtn.classList.add('active');
        else if (tabName === 'followers' && tabFollowersBtn) tabFollowersBtn.classList.add('active');
        else if (tabName === 'following' && tabFollowingBtn) tabFollowingBtn.classList.add('active');
        fetchConnectionsList(tabName);
    }

    if (tabFriendsBtn) tabFriendsBtn.addEventListener('click', () => setActiveTab('friends'));
    if (tabFollowersBtn) tabFollowersBtn.addEventListener('click', () => setActiveTab('followers'));
    if (tabFollowingBtn) tabFollowingBtn.addEventListener('click', () => setActiveTab('following'));

    async function fetchConnectionsList(type) {
        if (!profileUid || !profileUserData) { // Garante que profileUserData esteja carregado
             if (loadingDiv) loadingDiv.style.display = 'none';
             showMessageToList("Dados do perfil não carregados para buscar a lista.", "error");
            return;
        }
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (emptyMessageP) emptyMessageP.style.display = 'none';
        if (connectionsListUl) connectionsListUl.innerHTML = '';
        lastVisibleDoc = null; // Reseta para paginação futura

        let collectionPath = '';
        if (type === 'friends') collectionPath = `users/${profileUid}/friends`;
        else if (type === 'followers') collectionPath = `users/${profileUid}/followers`;
        else if (type === 'following') collectionPath = `users/${profileUid}/following`;
        else { showMessageToList("Tipo de lista inválido.", "error"); if (loadingDiv) loadingDiv.style.display = 'none'; return; }

        try {
            // Adicionado orderBy 'timestamp' para todas as listas.
            // Se o documento 'friend' não tiver 'timestamp', ele pode não aparecer ou dar erro,
            // ajuste a criação de amigos para incluir um timestamp.
            const q = query(collection(db, collectionPath), orderBy("timestamp", "desc"), limit(PAGE_SIZE));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                let msg = "Nenhum usuário para mostrar aqui.";
                if (type === 'friends') msg = `${profileUserData.displayName || 'Este usuário'} ainda não tem amigos.`;
                else if (type === 'followers') msg = `${profileUserData.displayName || 'Este usuário'} ainda não tem seguidores.`;
                else if (type === 'following') msg = `${profileUserData.displayName || 'Este usuário'} não segue ninguém ainda.`;
                showMessageToList(msg, "info");
            } else {
                const userDetailPromises = querySnapshot.docs.map(itemDoc => {
                    const itemUid = itemDoc.id;
                    // Os documentos em 'followers' e 'following' podem ter nome/foto desnormalizados.
                    // Se não, buscamos do doc principal do usuário.
                    const itemDataFromSubcollection = itemDoc.data();
                    if (itemDataFromSubcollection.displayName && itemDataFromSubcollection.photoURL) {
                        return Promise.resolve({ id: itemUid, ...itemDataFromSubcollection });
                    }
                    return getDoc(doc(db, "users", itemUid)).then(userSnap => {
                        if (userSnap.exists()) return { id: itemUid, ...userSnap.data() };
                        return { id: itemUid, displayName: "Usuário Desconhecido", photoURL: 'imgs/default-avatar.png', isMissing: true };
                    });
                });
                const itemsToRender = await Promise.all(userDetailPromises);
                renderConnectionsList(itemsToRender, type);
                lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1]; // Para paginação futura
            }
        } catch (error) {
            console.error(`Erro ao buscar lista de ${type}:`, error);
            showMessageToList(`Erro ao carregar lista de ${type}. Verifique o console.`, "error");
        } finally {
            if (loadingDiv) loadingDiv.style.display = 'none';
        }
    }

    function renderConnectionsList(items, type) {
        if (!connectionsListUl) return;
        connectionsListUl.innerHTML = ''; 

        items.forEach(item => {
            const li = document.createElement('li'); li.className = 'user-list-item';
            const userLink = document.createElement('a'); userLink.href = `public-profile.html?uid=${item.id}`;
            const avatarImg = document.createElement('img');
            avatarImg.src = item.photoURL || 'imgs/default-avatar.png';
            avatarImg.alt = `Avatar de ${item.displayName || 'Usuário'}`;
            avatarImg.className = 'user-avatar-small';
            const nameSpan = document.createElement('span');
            nameSpan.textContent = item.displayName || 'Usuário Desconhecido';
            if (item.isMissing) nameSpan.style.fontStyle = 'italic';
            userLink.append(avatarImg, nameSpan);
            li.appendChild(userLink);

            const actionsDiv = document.createElement('div'); actionsDiv.className = 'user-list-actions';
            if (viewer && viewer.uid === profileUid) { // Dono do perfil vendo suas listas
                if (type === 'friends' && item.id !== viewer.uid) {
                    const removeFriendBtn = document.createElement('button');
                    removeFriendBtn.className = 'action-button danger remove-friend-conn-btn';
                    removeFriendBtn.textContent = 'Remover'; removeFriendBtn.dataset.friendUid = item.id;
                    removeFriendBtn.addEventListener('click', handleRemoveFriendFromList);
                    actionsDiv.appendChild(removeFriendBtn);
                } else if (type === 'following' && item.id !== viewer.uid) {
                    const unfollowBtn = document.createElement('button');
                    unfollowBtn.className = 'action-button secondary unfollow-conn-btn';
                    unfollowBtn.textContent = 'Deixar de Seguir'; unfollowBtn.dataset.followedUid = item.id;
                    unfollowBtn.addEventListener('click', handleUnfollowFromList);
                    actionsDiv.appendChild(unfollowBtn);
                }
            } else if (viewer && item.id !== viewer.uid) { // Visualizador vendo lista de outro, pode ter ações para cada item
                 // Ex: Adicionar um botão de "Seguir" se ainda não segue o item da lista
                 // Isso requer checar o status de "seguindo" para cada item, o que pode ser custoso.
                 // Por enquanto, mantemos simples.
            }
            const viewProfileBtn = document.createElement('button');
            viewProfileBtn.className = 'action-button primary'; viewProfileBtn.textContent = 'Ver Perfil';
            viewProfileBtn.addEventListener('click', () => { window.location.href = `public-profile.html?uid=${item.id}`; });
            actionsDiv.appendChild(viewProfileBtn);
            if (actionsDiv.hasChildNodes()) li.appendChild(actionsDiv);
            connectionsListUl.appendChild(li);
        });
    }

    async function handleUnfollowFromList(event) {
        const followedUid = event.target.dataset.followedUid;
        if (!viewer || viewer.uid !== profileUid || !followedUid) return;
        const targetUserName = this.closest('.user-list-item').querySelector('span').textContent;
        if (!window.confirm(`Deixar de seguir ${targetUserName}?`)) return;
        
        const viewerFollowingRef = doc(db, `users/${viewer.uid}/following/${followedUid}`);
        const followedUserFollowersRef = doc(db, `users/${followedUid}/followers/${viewer.uid}`);
        const viewerDocRef = doc(db, "users", viewer.uid);
        const followedUserDocRef = doc(db, "users", followedUid);
        try {
            await runTransaction(db, async (transaction) => {
                transaction.delete(viewerFollowingRef); transaction.delete(followedUserFollowersRef);
                transaction.update(viewerDocRef, { followingCount: increment(-1) });
                transaction.update(followedUserDocRef, { followersCount: increment(-1) });
            });
            showMessageToList(`Você deixou de seguir ${targetUserName}.`, "success");
            fetchProfileAndConnections(); 
        } catch (error) { console.error("Erro ao deixar de seguir:", error); showMessageToList("Erro ao deixar de seguir.", "error"); }
    }

    async function handleRemoveFriendFromList(event) {
        const friendUid = event.target.dataset.friendUid;
        if (!viewer || viewer.uid !== profileUid || !friendUid) return;
        const targetUserName = this.closest('.user-list-item').querySelector('span').textContent;
        if (!window.confirm(`Remover amizade com ${targetUserName}?`)) return;
        
        const batch = writeBatch(db);
        const viewerDocRef = doc(db, "users", viewer.uid);
        const friendDocRef = doc(db, "users", friendUid);
        batch.delete(doc(db, `users/${viewer.uid}/friends/${friendUid}`));
        batch.delete(doc(db, `users/${friendUid}/friends/${viewer.uid}`));
        batch.update(viewerDocRef, { friendsCount: increment(-1) });
        batch.update(friendDocRef, { friendsCount: increment(-1) });
        try {
            await batch.commit();
            showMessageToList(`Amizade com ${targetUserName} removida.`, "success");
            fetchProfileAndConnections();
        } catch (error) { console.error("Erro ao remover amizade:", error); showMessageToList("Erro ao remover amizade.", "error"); }
    }

    console.log("David's Farm connections script (vCompletíssimo com Regras Firestore em mente) carregado!");
});