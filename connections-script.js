// connections-script.js
// VERSÃO RAIZ ATUALIZADA: Busca SEMPRE os dados frescos (nome, foto) do perfil principal
// de cada usuário listado nas conexões, ignorando dados desnormalizados na subcoleção.
// Contadores continuam sendo por subcoleção.

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, orderBy, limit, startAfter, updateDoc, writeBatch, increment, serverTimestamp, deleteDoc as deleteFirestoreDoc, runTransaction, getCountFromServer } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
    let lastVisibleDoc = null;
    const PAGE_SIZE = 20;

    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (siteContent) setTimeout(() => siteContent.classList.add('visible'), 100);

    const showMessageToList = (message, type = 'info') => {
        if (emptyMessageP) {
            emptyMessageP.textContent = message;
            emptyMessageP.className = 'list-placeholder form-message ' + type;
            emptyMessageP.style.display = 'block';
        }
        if (connectionsListUl) connectionsListUl.innerHTML = '';
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

    async function getSubcollectionCount(userUid, subcollectionName) {
        if (!userUid || !subcollectionName) return 0;
        try {
            const subcollectionRef = collection(db, `users/${userUid}/${subcollectionName}`);
            const snapshot = await getCountFromServer(query(subcollectionRef));
            return snapshot.data().count;
        } catch (error) {
            console.error(`Erro ao contar ${subcollectionName} para ${userUid}:`, error);
            return 0;
        }
    }

    const params = new URLSearchParams(window.location.search);
    profileUid = params.get('uid');
    currentActiveTab = params.get('tab') || 'friends';

    if (!profileUid) {
        if (connectionsPageTitleSpan) connectionsPageTitleSpan.textContent = "Erro";
        showMessageToList("Nenhum perfil de usuário especificado.", "error");
        if (loadingDiv) loadingDiv.style.display = 'none';
        applyPageBackgroundAndParticles(null);
    }

    onAuthStateChanged(auth, async (loggedInUser) => {
        viewer = loggedInUser;
        if (viewer) {
            try {
                const viewerDocSnap = await getDoc(doc(db, "users", viewer.uid));
                if (viewerDocSnap.exists()) {
                    viewerData = viewerDocSnap.data();
                    viewerData.uid = viewer.uid;
                    viewerData.friendsCount = viewerData.friendsCount || 0;
                    viewerData.followersCount = viewerData.followersCount || 0;
                    viewerData.followingCount = viewerData.followingCount || 0;
                } else {
                    viewerData = { uid: viewer.uid, displayName: viewer.displayName, photoURL: viewer.photoURL, email: viewer.email, friendsCount: 0, followersCount: 0, followingCount: 0 };
                }
            } catch (error) { console.error("Erro ao buscar dados do visualizador:", error); viewerData = null; }
        } else {
            viewerData = null;
        }
        if (userAuthSection) {
            if (viewer && viewerData) {
                const dName = (viewerData.displayName || viewer.displayName || viewer.email?.split('@')[0]) ?? "Usuário";
                const pUrl = (viewerData.photoURL || viewer.photoURL) ?? 'imgs/default-avatar.png';
                userAuthSection.innerHTML = `<a href="profile.html" class="user-info-link"><div class="user-info"><img id="user-photo" src="${pUrl}" alt="Foto"><span id="user-name">${dName}</span></div></a>`;
            } else if (viewer) {
                const dName = (viewer.displayName || viewer.email?.split('@')[0]) ?? "Usuário";
                const pUrl = viewer.photoURL ?? 'imgs/default-avatar.png';
                userAuthSection.innerHTML = `<a href="profile.html" class="user-info-link"><div class="user-info"><img id="user-photo" src="${pUrl}" alt="Foto"><span id="user-name">${dName}</span></div></a>`;
            }
             else {
                userAuthSection.innerHTML = `<a href="login.html" class="login-button">Login</a>`;
            }
        }

        if (profileUid) {
            await fetchProfileAndConnectionCounts();
        } else {
             applyPageBackgroundAndParticles(null);
        }
    });

    async function fetchProfileAndConnectionCounts() {
        if (!profileUid) return;
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (emptyMessageP) emptyMessageP.style.display = 'none';
        if (connectionsListUl) connectionsListUl.innerHTML = '';

        try {
            const userDocRef = doc(db, "users", profileUid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                profileUserData = userDocSnap.data();
                profileUserData.uid = profileUid;

                if (connectionsPageTitleSpan) connectionsPageTitleSpan.textContent = profileUserData.displayName || "Usuário";

                const [actualFriendsCount, actualFollowersCount, actualFollowingCount] = await Promise.all([
                    getSubcollectionCount(profileUid, 'friends'),
                    getSubcollectionCount(profileUid, 'followers'),
                    getSubcollectionCount(profileUid, 'following')
                ]);

                if(connFriendsCountSpan) connFriendsCountSpan.textContent = actualFriendsCount;
                if(connFollowersCountSpan) connFollowersCountSpan.textContent = actualFollowersCount;
                if(connFollowingCountSpan) connFollowingCountSpan.textContent = actualFollowingCount;

                profileUserData.friendsCount = actualFriendsCount;
                profileUserData.followersCount = actualFollowersCount;
                profileUserData.followingCount = actualFollowingCount;

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
            console.error("Erro ao buscar dados do perfil e contagens:", error);
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

        if (profileUserData) {
            fetchConnectionsList(tabName);
        } else if (profileUid) {
            console.warn("Tentando definir aba ativa sem profileUserData carregado.");
        }
    }

    if (tabFriendsBtn) tabFriendsBtn.addEventListener('click', () => setActiveTab('friends'));
    if (tabFollowersBtn) tabFollowersBtn.addEventListener('click', () => setActiveTab('followers'));
    if (tabFollowingBtn) tabFollowingBtn.addEventListener('click', () => setActiveTab('following'));

    async function fetchConnectionsList(type) {
        if (!profileUid || !profileUserData) {
             if (loadingDiv) loadingDiv.style.display = 'none';
             showMessageToList("Dados do perfil não carregados para buscar a lista.", "error");
            return;
        }
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (emptyMessageP) emptyMessageP.style.display = 'none';
        if (connectionsListUl) connectionsListUl.innerHTML = '';
        lastVisibleDoc = null;

        let collectionPath = '';
        if (type === 'friends') collectionPath = `users/${profileUid}/friends`;
        else if (type === 'followers') collectionPath = `users/${profileUid}/followers`;
        else if (type === 'following') collectionPath = `users/${profileUid}/following`;
        else { showMessageToList("Tipo de lista inválido.", "error"); if (loadingDiv) loadingDiv.style.display = 'none'; return; }

        try {
            let q;
            q = query(collection(db, collectionPath), orderBy("timestamp", "desc"), limit(PAGE_SIZE));
            
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                let msg = "Nenhum usuário para mostrar aqui.";
                // Ajusta a mensagem para ser mais genérica se profileUserData.displayName não estiver disponível
                const userNameForMsg = profileUserData.displayName || 'Este usuário';
                if (type === 'friends') msg = `${userNameForMsg} ainda não tem amigos.`;
                else if (type === 'followers') msg = `${userNameForMsg} ainda não tem seguidores.`;
                else if (type === 'following') msg = `${userNameForMsg} não segue ninguém ainda.`;
                showMessageToList(msg, "info");
            } else {
                const userDetailPromises = querySnapshot.docs.map(async (itemDoc) => {
                    const itemUid = itemDoc.id;
                    // const itemDataFromSubcollection = itemDoc.data(); // Dados da subcoleção (timestamp, etc.)

                    // SEMPRE buscar os dados frescos do perfil principal para nome e foto
                    const userSnap = await getDoc(doc(db, "users", itemUid));
                    if (userSnap.exists()) {
                        const mainUserData = userSnap.data();
                        return {
                            id: itemUid,
                            displayName: mainUserData.displayName || "Usuário Desconhecido",
                            photoURL: mainUserData.photoURL || 'imgs/default-avatar.png',
                            // ...itemDataFromSubcollection // Pode adicionar outros dados da subcoleção se precisar, como 'timestamp'
                        };
                    }
                    // Fallback se o documento principal do usuário na lista não for encontrado
                    return { id: itemUid, displayName: "Usuário Desconhecido", photoURL: 'imgs/default-avatar.png', isMissing: true };
                });
                const itemsToRender = await Promise.all(userDetailPromises);
                renderConnectionsList(itemsToRender, type);
                if (querySnapshot.docs.length > 0) {
                    lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
                }
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
            avatarImg.src = item.photoURL || 'imgs/default-avatar.png'; // Usará a foto FRESCA
            avatarImg.alt = `Avatar de ${item.displayName || 'Usuário'}`; // Usará o nome FRESCO
            avatarImg.className = 'user-avatar-small';
            const nameSpan = document.createElement('span');
            nameSpan.textContent = item.displayName || 'Usuário Desconhecido'; // Usará o nome FRESCO
            if (item.isMissing) nameSpan.style.fontStyle = 'italic';
            userLink.append(avatarImg, nameSpan);
            li.appendChild(userLink);

            const actionsDiv = document.createElement('div'); actionsDiv.className = 'user-list-actions';
            if (viewer && viewer.uid === profileUid) { 
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
            } else if (viewer && item.id !== viewer.uid) {
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
        const targetUserName = event.target.closest('.user-list-item').querySelector('span').textContent;
        if (!window.confirm(`Deixar de seguir ${targetUserName}?`)) return;

        const viewerFollowingRef = doc(db, `users/${viewer.uid}/following/${followedUid}`);
        const followedUserFollowersRef = doc(db, `users/${followedUid}/followers/${viewer.uid}`);
        const viewerDocRef = doc(db, "users", viewer.uid); 

        try {
            await runTransaction(db, async (transaction) => {
                transaction.delete(viewerFollowingRef);
                transaction.delete(followedUserFollowersRef);
                transaction.update(viewerDocRef, { followingCount: increment(-1) });
            });

            showMessageToList(`Você deixou de seguir ${targetUserName}.`, "success");
            
            if (profileUserData) { 
                profileUserData.followingCount = Math.max(0, (profileUserData.followingCount || 1) - 1);
                if(connFollowingCountSpan) connFollowingCountSpan.textContent = profileUserData.followingCount;

                // Para atualizar o contador de seguidores do 'followedUser' na UI DELE (se aberta),
                // ou em outras partes do app, seria necessário um listener ou Cloud Function.
                // Aqui, estamos apenas atualizando o contador 'following' do profileUid.
                // Se esta ação fizesse o contador de seguidores do 'followedUid' mudar na aba 'Seguidores' *desta página*,
                // então precisaríamos recalcular:
                if (currentActiveTab === 'followers' && profileUid === followedUid) {
                    const newFollowersCount = await getSubcollectionCount(profileUid, 'followers');
                    if (connFollowersCountSpan) connFollowersCountSpan.textContent = newFollowersCount;
                    if (profileUserData) profileUserData.followersCount = newFollowersCount;
                }
            }
            fetchConnectionsList(currentActiveTab); 
        } catch (error) {
            console.error("Erro ao deixar de seguir:", error);
            showMessageToList(`Erro ao deixar de seguir: ${error.message}`, "error");
        }
    }

    async function handleRemoveFriendFromList(event) {
        const friendUid = event.target.dataset.friendUid;
        if (!viewer || viewer.uid !== profileUid || !friendUid) return;
        const targetUserName = event.target.closest('.user-list-item').querySelector('span').textContent;
        if (!window.confirm(`Remover amizade com ${targetUserName}?`)) return;

        const batch = writeBatch(db);
        const viewerDocRef = doc(db, "users", viewer.uid); 

        batch.delete(doc(db, `users/${viewer.uid}/friends/${friendUid}`));
        batch.delete(doc(db, `users/${friendUid}/friends/${viewer.uid}`));
        batch.update(viewerDocRef, { friendsCount: increment(-1) });
        
        try {
            await batch.commit();
            showMessageToList(`Amizade com ${targetUserName} removida.`, "success");
            if (profileUserData) { 
                profileUserData.friendsCount = Math.max(0, (profileUserData.friendsCount || 1) - 1);
                if(connFriendsCountSpan) connFriendsCountSpan.textContent = profileUserData.friendsCount;
                // O contador friendsCount do 'friendUid' não é atualizado aqui pelo cliente.
                // Se estivéssemos vendo a lista de amigos do 'friendUid', seu contador não mudaria em tempo real.
            }
            fetchConnectionsList(currentActiveTab); 
        } catch (error) {
            console.error("Erro ao remover amizade:", error);
            showMessageToList(`Erro ao remover amizade: ${error.message}`, "error");
        }
    }

    console.log("David's Farm connections script (vRaiz - Foto Fresca e Contadores por Subcoleção) carregado!");
});