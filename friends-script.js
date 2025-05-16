// friends-script.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"; // signOut não será usado diretamente no header aqui
import { 
    doc, getDoc, setDoc, updateDoc, deleteDoc,
    collection, onSnapshot,
    serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const userAuthSection = document.querySelector('.user-auth-section'); // Para o header
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
    let currentUserData = null; 

    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (siteContent) setTimeout(() => siteContent.classList.add('visible'), 100);

    const showMessage = (element, message, type = 'error') => {
        // ... (função showMessage da etapa anterior - sem alterações) ...
        console.log(`[UI Message - ${type} @ ${element?.id || 'unknown'}]: ${message}`); // Adicionado ? para element.id
        if(element) {
            element.textContent = message;
            element.className = 'form-message ' + (type === 'success' ? 'success' : '');
            element.style.display = 'block';
            setTimeout(() => { element.style.display = 'none'; element.textContent = ''; }, 7000);
        } else {
            console.warn("Elemento para showMessage não encontrado");
        }
    };

    async function fetchUserDetails(uid) {
        // ... (função fetchUserDetails da etapa anterior - sem alterações) ...
        if (!uid) { 
            console.warn("fetchUserDetails chamado com UID nulo ou indefinido.");
            return { displayName: "Usuário Desconhecido", photoURL: 'imgs/default-avatar.png' }; 
        }
        const userDocRef = doc(db, "users", uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            return userDocSnap.data();
        } else {
            console.warn(`Nenhum documento encontrado para o usuário ${uid} em fetchUserDetails.`);
            return { displayName: `Usuário (${uid.substring(0,5)}...)`, photoURL: 'imgs/default-avatar.png' };
        }
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            console.log("[Auth State - Friends Page] Usuário logado:", currentUser.uid);
            
            const userDocSnap = await getDoc(doc(db, "users", currentUser.uid));
            if (userDocSnap.exists()) {
                currentUserData = userDocSnap.data();
                console.log("[Auth State - Friends Page] Dados do Firestore do usuário:", currentUserData);
                if (myFriendIdDisplay) myFriendIdDisplay.textContent = currentUserData.friendId || 'Não definido';
                
                // ATUALIZAÇÃO DO HEADER PARA SER IGUAL AO DO INDEX.HTML
                if (userAuthSection) {
                    const displayName = currentUserData.displayName || currentUser.displayName || currentUser.email;
                    const photoURL = currentUserData.photoURL || currentUser.photoURL || 'imgs/default-avatar.png';
                    // O nome e a foto do usuário agora são um link para profile.html, sem botão de sair aqui
                    userAuthSection.innerHTML = `
                        <a href="profile.html" class="user-info-link">
                            <div class="user-info">
                                <img id="user-photo" src="${photoURL}" alt="Foto do Usuário">
                                <span id="user-name">${displayName}</span>
                            </div>
                        </a>`;
                    // O botão de logout foi REMOVIDO do header desta página
                }
                listenToFriends();
                listenToFriendRequests();
            } else {
                console.error("[Auth State - Friends Page] ALERTA: Documento do usuário não encontrado no Firestore para UID:", currentUser.uid);
                if (myFriendIdDisplay) myFriendIdDisplay.textContent = 'Erro (sem perfil Firestore)';
                // Se o usuário chegou aqui sem perfil no Firestore, algo está errado no fluxo de ensureUserProfileAndFriendId
                // Poderia tentar chamar ensureUserProfileAndFriendId aqui, mas idealmente já deveria ter sido resolvido.
                 if (userAuthSection) { // Mostra botão de login se os dados do usuário falharem criticamente
                    userAuthSection.innerHTML = `<a href="login.html" class="login-button">Login Necessário</a>`;
                }
            }
        } else {
            window.location.href = 'login.html';
        }
    });

    // --- Lógica para Adicionar Amigos ---
    if (addFriendButton) {
        // ... (lógica do addFriendButton da etapa anterior - sem alterações) ...
        addFriendButton.addEventListener('click', async () => {
            if (!currentUser || !currentUserData || !currentUserData.friendId) {
                showMessage(addFriendMessage, "Seus dados de usuário ainda não foram carregados ou falta ID de amigo. Tente recarregar."); return;
            }
            const targetFriendId = addFriendInput.value.trim();
            if (!targetFriendId || targetFriendId.length !== 6 || !/^\d+$/.test(targetFriendId) ) {
                showMessage(addFriendMessage, "ID de Amigo inválido (6 dígitos numéricos)."); return;
            }
            if (targetFriendId === currentUserData.friendId) {
                showMessage(addFriendMessage, "Você não pode adicionar a si mesmo."); return;
            }
            showMessage(addFriendMessage, "Buscando e enviando pedido...", "success");
            console.log(`[Add Friend] User ${currentUser.uid} (FriendID: ${currentUserData.friendId}) tentando adicionar Friend ID: ${targetFriendId}`);
            try {
                const mappingRef = doc(db, "friendIdMappings", targetFriendId);
                const mappingSnap = await getDoc(mappingRef);
                if (!mappingSnap.exists()) {
                    showMessage(addFriendMessage, "Usuário com este ID de Amigo não encontrado."); return;
                }
                const targetUid = mappingSnap.data().uid;
                console.log(`[Add Friend] UID do destinatário encontrado: ${targetUid}`);
                const targetUserProfile = await fetchUserDetails(targetUid);
                if (targetUid === currentUser.uid) {
                    showMessage(addFriendMessage, "Você não pode adicionar a si mesmo."); return;
                }
                const areAlreadyFriends = (await getDoc(doc(db, `users/${currentUser.uid}/friends/${targetUid}`))).exists();
                if (areAlreadyFriends) { showMessage(addFriendMessage, "Vocês já são amigos!"); return; }
                const alreadySentByMe = (await getDoc(doc(db, `users/${currentUser.uid}/friendRequestsSent/${targetUid}`))).exists();
                if (alreadySentByMe) { showMessage(addFriendMessage, "Você já enviou um pedido para este usuário."); return; }
                const alreadyReceivedFromTarget = (await getDoc(doc(db, `users/${currentUser.uid}/friendRequestsReceived/${targetUid}`))).exists();
                if (alreadyReceivedFromTarget) { showMessage(addFriendMessage, "Este usuário já te enviou um pedido. Verifique seus pedidos recebidos."); return; }

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
                    senderName: currentUserData.displayName || currentUser.email,
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

    // --- Funções para Renderizar Listas ---
   const renderList = (listElement, items, type) => {
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
            const itemData = itemWrapper.data || itemWrapper; // Acessa os dados corretos do item
            // Prioriza nomes e fotos que podem ter sido salvos diretamente no pedido/amigo,
            // caso contrário usa o displayName/photoURL do objeto de usuário completo (itemWrapper ou itemData se for perfil)
            const targetUid = itemWrapper.id; // UID do usuário sendo listado
            const displayName = itemData.displayName || itemData.senderName || itemData.receiverName || "Usuário";
            const photoURL = itemData.photoURL || itemData.senderPhotoURL || itemData.receiverPhotoURL || 'imgs/default-avatar.png';

            // Cria o link para o perfil público
            const profileLink = `<a href="public-profile.html?uid=${targetUid}" class="profile-list-link">`;
            
            let content = `${profileLink}<img src="${photoURL}" alt="${displayName}" class="friend-avatar-small"> <span>${displayName}</span></a>`; // Fecha o <a>

            if (type === 'received') {
                content += ` <div class="actions"><button class="accept-request" data-id="${targetUid}">Aceitar</button> <button class="decline-request" data-id="${targetUid}">Recusar</button></div>`;
            } else if (type === 'sent') {
                // Para pedidos enviados, o targetUid é o destinatário. O 'status' vem de itemData.status.
                content += ` <span class="status">(${(itemData.status || 'pendente')})</span> <button class="cancel-request" data-id="${targetUid}">Cancelar</button>`;
            } else if (type === 'friends') {
                content += ` <div class="actions"><button class="remove-friend" data-id="${targetUid}"><img src="imgs/trashbin.png" alt="Remover" class="btn-icon-small"></button></div>`;
            }
            li.innerHTML = content;
            listElement.appendChild(li);
        });
    };
    
    // --- Listeners para as listas ---
    let unsubFriends, unsubSent, unsubReceived;
    function listenToFriends() { /* ... (sem alterações) ... */
        if (!currentUser) return;
        if (unsubFriends) unsubFriends();
        const friendsQuery = collection(db, `users/${currentUser.uid}/friends`);
        unsubFriends = onSnapshot(friendsQuery, async (snapshot) => {
            const friendsDataPromises = snapshot.docs.map(async (friendDoc) => {
                const friendUid = friendDoc.id;
                const friendProfile = await fetchUserDetails(friendUid);
                return { id: friendUid, ...friendProfile, dataFromFriendDoc: friendDoc.data() };
            });
            const friendsData = await Promise.all(friendsDataPromises);
            renderList(friendsList, friendsData, 'friends');
        }, error => console.error("[Listener Friends] Erro:", error));
    }
    function listenToFriendRequests() { /* ... (sem alterações) ... */
        if (!currentUser) return;
        if (unsubSent) unsubSent();
        if (unsubReceived) unsubReceived();
        const sentQuery = collection(db, `users/${currentUser.uid}/friendRequestsSent`);
        unsubSent = onSnapshot(sentQuery, async (snapshot) => {
            const sentData = snapshot.docs.map(d => ({ id: d.id, data: d.data() }));
            renderList(sentRequestsList, sentData, 'sent');
        }, error => console.error("[Listener Sent Requests] Erro:", error));
        const receivedQuery = collection(db, `users/${currentUser.uid}/friendRequestsReceived`);
        unsubReceived = onSnapshot(receivedQuery, async (snapshot) => {
            const receivedData = snapshot.docs.map(d => ({ id: d.id, data: d.data() }));
            renderList(receivedRequestsList, receivedData, 'received');
        }, error => console.error("[Listener Received Requests] Erro:", error));
    }
    
    // --- Ações nas Listas (Aceitar, Recusar, Cancelar, Remover) ---
    document.addEventListener('click', async (event) => {
        // ... (lógica de clique para ações de amizade da etapa anterior - sem alterações) ...
        if (!currentUser || !currentUserData) return;
        const target = event.target;
        const otherUserId = target.dataset.id; 
        if (!otherUserId && (target.classList.contains('accept-request') || target.classList.contains('decline-request') || target.classList.contains('cancel-request') || target.classList.contains('remove-friend'))) {
            return;
        }
        const batch = writeBatch(db);
        if (target.classList.contains('accept-request')) {
            console.log(`[Accept Request] Usuário ${currentUser.uid} (eu) aceitando pedido de ${otherUserId}`);
            showMessage(addFriendMessage, 'Aceitando pedido...', 'success');
            try {
                const otherUserProfile = await fetchUserDetails(otherUserId);
                batch.set(doc(db, `users/${currentUser.uid}/friends`, otherUserId), { 
                    addedAt: serverTimestamp(), 
                    friendName: otherUserProfile.displayName || "Amigo",
                    friendPhotoURL: otherUserProfile.photoURL || 'imgs/default-avatar.png'
                });
                batch.set(doc(db, `users/${otherUserId}/friends`, currentUser.uid), { 
                    addedAt: serverTimestamp(), 
                    friendName: currentUserData.displayName || "Amigo",
                    friendPhotoURL: currentUserData.photoURL || 'imgs/default-avatar.png'
                });
                batch.delete(doc(db, `users/${currentUser.uid}/friendRequestsReceived`, otherUserId));
                batch.delete(doc(db, `users/${otherUserId}/friendRequestsSent`, currentUser.uid));
                await batch.commit();
                showMessage(addFriendMessage, 'Amigo adicionado!', 'success');
            } catch (e) { console.error("[Accept Request] Erro CRÍTICO:", e); showMessage(addFriendMessage, 'Erro ao aceitar pedido. Verifique o console.'); }
        } 
        else if (target.classList.contains('decline-request')) {
            console.log(`[Decline Request] Pedido de ${otherUserId} recusado por ${currentUser.uid}`);
            showMessage(addFriendMessage, 'Recusando pedido...', 'success');
            try {
                batch.delete(doc(db, `users/${currentUser.uid}/friendRequestsReceived`, otherUserId));
                batch.delete(doc(db, `users/${otherUserId}/friendRequestsSent`, currentUser.uid));
                await batch.commit();
                showMessage(addFriendMessage, 'Pedido recusado.', 'success');
            } catch (e) { console.error("[Decline Request] Erro:", e); showMessage(addFriendMessage, 'Erro ao recusar pedido.');}
        }
        else if (target.classList.contains('cancel-request')) {
            console.log(`[Cancel Request] ${currentUser.uid} cancelando pedido para ${otherUserId}`);
            showMessage(addFriendMessage, 'Cancelando pedido...', 'success');
            try {
                batch.delete(doc(db, `users/${currentUser.uid}/friendRequestsSent`, otherUserId));
                batch.delete(doc(db, `users/${otherUserId}/friendRequestsReceived`, currentUser.uid));
                await batch.commit();
                showMessage(addFriendMessage, 'Pedido cancelado.', 'success');
            } catch (e) { console.error("[Cancel Request] Erro:", e); showMessage(addFriendMessage, 'Erro ao cancelar pedido. Verifique o console.');}
        }
        else if (target.classList.contains('remove-friend')) {
            if(window.confirm("Tem certeza que deseja remover este amigo?")) {
                console.log(`[Remove Friend] ${currentUser.uid} removendo amigo ${otherUserId}`);
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
    
    console.log("David's Farm friends script (v6 - header consistente) carregado!");
});