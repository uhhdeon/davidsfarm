// friends-script.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    doc, getDoc, setDoc, updateDoc, deleteDoc,
    collection, onSnapshot,
    serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const userAuthSection = document.querySelector('.user-auth-section');
    const currentYearSpan = document.getElementById('currentYear');
    const siteContent = document.getElementById('site-content');
    const myFriendIdDisplay = document.getElementById('my-friend-id-display');
    const addFriendInput = document.getElementById('add-friend-input');
    const addFriendButton = document.getElementById('add-friend-button');
    const addFriendMessage = document.getElementById('add-friend-message');
    const receivedRequestsList = document.getElementById('received-requests-list');
    const sentRequestsList = document.getElementById('sent-requests-list');
    const friendsList = document.getElementById('friends-list');

    let currentUser = null;
    let currentUserData = null; // Dados do Firestore do usuário logado

    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (siteContent) setTimeout(() => siteContent.classList.add('visible'), 100);

    const showMessage = (element, message, type = 'error') => {
        console.log(`[UI Message - ${type}]: ${message}`);
        element.textContent = message;
        element.className = 'form-message ' + (type === 'success' ? 'success' : '');
        element.style.display = 'block';
        setTimeout(() => { element.style.display = 'none'; element.textContent = ''; }, 7000);
    };

    async function fetchUserDetails(uid) { // Função auxiliar para buscar dados do usuário
        if (!uid) return { displayName: "Usuário Desconhecido", photoURL: 'imgs/default-avatar.png' };
        const userDocRef = doc(db, "users", uid);
        const userDocSnap = await getDoc(userDocRef);
        return userDocSnap.exists() ? userDocSnap.data() : { displayName: "Usuário (Não encontrado)", photoURL: 'imgs/default-avatar.png' };
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            console.log("Usuário logado:", currentUser.uid, currentUser.email);
            
            const userDocSnap = await getDoc(doc(db, "users", currentUser.uid));
            if (userDocSnap.exists()) {
                currentUserData = userDocSnap.data(); // Armazena os dados do Firestore
                console.log("Dados do usuário logado (Firestore):", currentUserData);
                if (myFriendIdDisplay) myFriendIdDisplay.textContent = currentUserData.friendId || 'Não definido';
                
                if (userAuthSection) { // Atualiza header com dados do Firestore se possível
                    const displayName = currentUserData.displayName || currentUser.displayName || currentUser.email;
                    const photoURL = currentUserData.photoURL || currentUser.photoURL || 'imgs/default-avatar.png';
                    userAuthSection.innerHTML = `
                        <div class="user-info">
                            <a href="profile.html" class="user-info-link">
                                <img id="user-photo" src="${photoURL}" alt="Foto">
                                <span id="user-name">${displayName}</span>
                            </a>
                            <button id="logout-button-friends" class="logout-button-style" style="margin-left: 15px;">Sair</button>
                        </div>`;
                    document.getElementById('logout-button-friends')?.addEventListener('click', () => signOut(auth).then(() => window.location.href = 'index.html'));
                }
                listenToFriends();
                listenToFriendRequests();
            } else {
                console.error("ALERTA: Documento do usuário não encontrado no Firestore para UID:", currentUser.uid);
                if (myFriendIdDisplay) myFriendIdDisplay.textContent = 'Erro ao carregar ID';
                // Se o documento não existe, o ensureUserProfileAndFriendId no script.js do index.html deveria ter criado.
                // Se o usuário navegar direto para friends.html, pode ser um problema.
                // Idealmente, forçar a criação se não existir.
            }
        } else {
            window.location.href = 'login.html';
        }
    });

    if (addFriendButton) {
        addFriendButton.addEventListener('click', async () => {
            if (!currentUser || !currentUserData) {
                showMessage(addFriendMessage, "Você precisa estar logado e seus dados carregados."); return;
            }
            const targetFriendId = addFriendInput.value.trim();
            if (!targetFriendId || targetFriendId.length !== 6 || !/^\d+$/.test(targetFriendId) ) {
                showMessage(addFriendMessage, "ID de Amigo inválido (6 dígitos numéricos)."); return;
            }
            if (targetFriendId === currentUserData.friendId) {
                showMessage(addFriendMessage, "Você não pode adicionar a si mesmo."); return;
            }

            showMessage(addFriendMessage, "Buscando e enviando pedido...", "success");
            console.log(`[Add Friend] Tentando adicionar Friend ID: ${targetFriendId}`);

            try {
                const mappingRef = doc(db, "friendIdMappings", targetFriendId);
                const mappingSnap = await getDoc(mappingRef);

                if (!mappingSnap.exists()) {
                    showMessage(addFriendMessage, "Usuário com este ID de Amigo não encontrado."); return;
                }
                const targetUid = mappingSnap.data().uid;
                console.log(`[Add Friend] UID do destinatário encontrado: ${targetUid}`);

                const targetUserProfile = await fetchUserDetails(targetUid); // Busca dados do destinatário

                if (targetUid === currentUser.uid) {
                    showMessage(addFriendMessage, "Você não pode adicionar a si mesmo (checado novamente)."); return;
                }

                const areAlreadyFriends = (await getDoc(doc(db, `users/${currentUser.uid}/friends/${targetUid}`))).exists();
                if (areAlreadyFriends) { showMessage(addFriendMessage, "Vocês já são amigos!"); return; }
                const alreadySent = (await getDoc(doc(db, `users/${currentUser.uid}/friendRequestsSent/${targetUid}`))).exists();
                if (alreadySent) { showMessage(addFriendMessage, "Você já enviou um pedido para este usuário."); return; }
                const alreadyReceived = (await getDoc(doc(db, `users/${currentUser.uid}/friendRequestsReceived/${targetUid}`))).exists();
                if (alreadyReceived) { showMessage(addFriendMessage, "Este usuário já te enviou um pedido. Verifique seus pedidos recebidos."); return; }

                const batch = writeBatch(db);
                const sentRef = doc(db, `users/${currentUser.uid}/friendRequestsSent`, targetUid);
                batch.set(sentRef, { 
                    status: "pending", timestamp: serverTimestamp(),
                    receiverUid: targetUid,
                    receiverName: targetUserProfile.displayName || "Usuário",
                    receiverPhotoURL: targetUserProfile.photoURL || 'imgs/default-avatar.png'
                });
                const receivedRef = doc(db, `users/${targetUid}/friendRequestsReceived`, currentUser.uid);
                batch.set(receivedRef, { 
                    status: "pending", senderUid: currentUser.uid,
                    senderName: currentUserData.displayName || currentUser.email, // Usa dados do Firestore do usuário logado
                    senderPhotoURL: currentUserData.photoURL || 'imgs/default-avatar.png',
                    timestamp: serverTimestamp() 
                });
                await batch.commit();
                showMessage(addFriendMessage, "Pedido de amizade enviado!", "success");
                addFriendInput.value = '';
            } catch (error) {
                console.error("[Add Friend] Erro CRÍTICO ao enviar pedido:", error);
                showMessage(addFriendMessage, "Erro ao enviar pedido. Verifique o console.");
            }
        });
    }

    const renderList = (listElement, items, type) => { /* ... (sem alterações na renderList, mas o nome agora vem de fetchUserDetails) ... */
        listElement.innerHTML = '';
        if (items.length === 0) {
            let placeholderText = "Nenhum item aqui.";
            if (type === 'received') placeholderText = "Nenhum pedido recebido.";
            if (type === 'sent') placeholderText = "Nenhum pedido enviado.";
            if (type === 'friends') placeholderText = "Você ainda não tem amigos.";
            listElement.innerHTML = `<li class="list-placeholder">${placeholderText}</li>`;
            return;
        }
        items.forEach(itemWrapper => {
            const li = document.createElement('li');
            li.className = 'friend-list-item';
            const itemData = itemWrapper.data || itemWrapper;
            // Prioriza nomes e fotos que podem ter sido salvos diretamente no pedido/amigo,
            // caso contrário usa o displayName/photoURL do objeto de usuário completo (itemWrapper)
            const displayName = itemData.displayName || itemData.senderName || itemData.receiverName || itemWrapper.displayName || "Usuário";
            const photoURL = itemData.photoURL || itemData.senderPhotoURL || itemData.receiverPhotoURL || itemWrapper.photoURL || 'imgs/default-avatar.png';

            let content = `<img src="${photoURL}" alt="${displayName}" class="friend-avatar-small"> <span>${displayName}</span>`;

            if (type === 'received') {
                content += ` <div class="actions"><button class="accept-request" data-id="${itemWrapper.id}">Aceitar</button> <button class="decline-request" data-id="${itemWrapper.id}">Recusar</button></div>`;
            } else if (type === 'sent') {
                content += ` <span class="status">(${(itemData.status || 'pendente')})</span> <button class="cancel-request" data-id="${itemWrapper.id}">Cancelar</button>`;
            } else if (type === 'friends') {
                content += ` <div class="actions"><button class="remove-friend" data-id="${itemWrapper.id}">Remover</button></div>`;
            }
            li.innerHTML = content;
            listElement.appendChild(li);
        });
    };
    
    let unsubFriends, unsubSent, unsubReceived;

    function listenToFriends() {
        if (!currentUser) return;
        if (unsubFriends) unsubFriends();
        const friendsQuery = collection(db, `users/${currentUser.uid}/friends`);
        unsubFriends = onSnapshot(friendsQuery, async (snapshot) => {
            const friendsDataPromises = snapshot.docs.map(async (friendDoc) => {
                const friendUid = friendDoc.id;
                const friendProfile = await fetchUserDetails(friendUid); // Usa a função auxiliar
                return { id: friendUid, ...friendProfile, dataFromFriendDoc: friendDoc.data() };
            });
            const friendsData = await Promise.all(friendsDataPromises);
            renderList(friendsList, friendsData, 'friends');
        }, error => console.error("Erro no listener de amigos:", error));
    }

    function listenToFriendRequests() {
        if (!currentUser) return;
        if (unsubSent) unsubSent();
        if (unsubReceived) unsubReceived();

        // Pedidos Enviados
        const sentQuery = collection(db, `users/${currentUser.uid}/friendRequestsSent`);
        unsubSent = onSnapshot(sentQuery, async (snapshot) => {
            const sentData = snapshot.docs.map(d => ({ id: d.id, data: d.data() })); // Os dados do pedido (receiverName, etc.) já estão aqui
            renderList(sentRequestsList, sentData, 'sent');
        }, error => console.error("Erro no listener de pedidos enviados:", error));

        // Pedidos Recebidos
        const receivedQuery = collection(db, `users/${currentUser.uid}/friendRequestsReceived`);
        unsubReceived = onSnapshot(receivedQuery, async (snapshot) => {
            const receivedData = snapshot.docs.map(d => ({ id: d.id, data: d.data() })); // Os dados do pedido (senderName, etc.) já estão aqui
            renderList(receivedRequestsList, receivedData, 'received');
        }, error => console.error("Erro no listener de pedidos recebidos:", error));
    }
    
    document.addEventListener('click', async (event) => {
        if (!currentUser || !currentUserData) return; // Garante que currentUserData esteja carregado
        const target = event.target;
        const otherUserId = target.dataset.id;

        if (!otherUserId && (target.classList.contains('accept-request') || /* ... outras classes ... */ target.classList.contains('remove-friend'))) {
            return;
        }
        
        const batch = writeBatch(db);

        if (target.classList.contains('accept-request')) {
            console.log(`[Accept Request] De (otherUserId): ${otherUserId} Para (currentUser.uid): ${currentUser.uid}`);
            showMessage(addFriendMessage, 'Aceitando pedido...', 'success');
            try {
                const otherUserProfile = await fetchUserDetails(otherUserId); // Pega dados do outro usuário

                // Adiciona otherUserId à lista de amigos do currentUser
                batch.set(doc(db, `users/${currentUser.uid}/friends`, otherUserId), { 
                    addedAt: serverTimestamp(), 
                    friendName: otherUserProfile.displayName || "Amigo", // Nome do amigo
                    friendPhotoURL: otherUserProfile.photoURL || 'imgs/default-avatar.png'
                });
                // Adiciona currentUser à lista de amigos do otherUserId
                batch.set(doc(db, `users/${otherUserId}/friends`, currentUser.uid), { 
                    addedAt: serverTimestamp(), 
                    friendName: currentUserData.displayName || "Amigo", // Meu nome
                    friendPhotoURL: currentUserData.photoURL || 'imgs/default-avatar.png'
                });

                batch.delete(doc(db, `users/${currentUser.uid}/friendRequestsReceived`, otherUserId));
                batch.delete(doc(db, `users/${otherUserId}/friendRequestsSent`, currentUser.uid));
                
                await batch.commit();
                showMessage(addFriendMessage, 'Amigo adicionado!', 'success');
            } catch (e) { console.error("[Accept Request] Erro CRÍTICO:", e); showMessage(addFriendMessage, 'Erro ao aceitar pedido. Verifique o console.'); }
        } 
        else if (target.classList.contains('decline-request') || target.classList.contains('cancel-request')) {
            // ... (lógica de decline/cancel da etapa anterior, já usando batch e paths corretos) ...
            const actionText = target.classList.contains('decline-request') ? 'recusado' : 'cancelado';
            const isDecline = target.classList.contains('decline-request');
            const isCancel = target.classList.contains('cancel-request');

            console.log(`[${actionText}] Pedido entre: ${currentUser.uid} e ${otherUserId}`);
            showMessage(addFriendMessage, `Pedido ${actionText}...`, 'success');
            try {
                if (isDecline) { // Eu (currentUser) estou recusando um pedido DE otherUserId
                    batch.delete(doc(db, `users/${currentUser.uid}/friendRequestsReceived`, otherUserId));
                    batch.delete(doc(db, `users/${otherUserId}/friendRequestsSent`, currentUser.uid));
                } else if (isCancel) { // Eu (currentUser) estou cancelando um pedido PARA otherUserId
                    batch.delete(doc(db, `users/${currentUser.uid}/friendRequestsSent`, otherUserId));
                    batch.delete(doc(db, `users/${otherUserId}/friendRequestsReceived`, currentUser.uid));
                }
                await batch.commit();
                showMessage(addFriendMessage, `Pedido ${actionText}.`, 'success');
            } catch (e) { console.error(`Erro ao ${actionText} pedido:`, e); showMessage(addFriendMessage, `Erro ao ${actionText} pedido. Verifique o console.`);}
        }
        else if (target.classList.contains('remove-friend')) {
            // ... (lógica de remover amigo da etapa anterior, já usando batch) ...
             if(window.confirm("Tem certeza que deseja remover este amigo?")) {
                console.log(`[Remove Friend] Removendo amigo: ${otherUserId} da lista de ${currentUser.uid}`);
                showMessage(addFriendMessage, 'Removendo amigo...', 'success');
                try {
                    batch.delete(doc(db, `users/${currentUser.uid}/friends`, otherUserId));
                    batch.delete(doc(db, `users/${otherUserId}/friends`, currentUser.uid));
                    await batch.commit();
                    showMessage(addFriendMessage, 'Amigo removido.', 'success');
                } catch (e) { console.error("[Remove Friend] Erro:", e); showMessage(addFriendMessage, 'Erro ao remover amigo.');}
            }
        }
    });
    
    console.log("David's Farm friends script (v4 - debug e nomes) carregado!");
});