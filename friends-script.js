// friends-script.js
// VERSÃO RAIZ ATUALIZADA: Busca SEMPRE os dados frescos (nome, foto) do perfil principal
// de cada usuário listado (amigos, pedidos enviados/recebidos).

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc, getDoc, setDoc, updateDoc, deleteDoc,
    collection, onSnapshot, query, orderBy,
    serverTimestamp, writeBatch, increment
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
    let currentUserData = null;

    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (siteContent) setTimeout(() => siteContent.classList.add('visible'), 100);

    const showMessage = (element, message, type = 'error', duration = 7000) => {
        console.log(`[UI Message - ${type} @ ${element?.id || 'unknown'}]: ${message}`);
        if(element) {
            element.textContent = message;
            element.className = 'form-message ' + (type === 'success' ? 'success' : (type === 'info' ? 'info' : 'error'));
            element.style.display = 'block';
            setTimeout(() => { if (element) {element.style.display = 'none'; element.textContent = '';} }, duration);
        } else {
            console.warn("Elemento para showMessage não encontrado");
        }
    };

    async function fetchUserDetails(uid) {
        if (!uid) {
            console.warn("fetchUserDetails chamado com UID nulo ou indefinido.");
            return { displayName: "Usuário Desconhecido", photoURL: 'imgs/default-avatar.png', isMissing: true };
        }
        const userDocRef = doc(db, "users", uid);
        try {
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                return { ...userDocSnap.data(), id: uid, isMissing: false }; // Adiciona ID e isMissing
            } else {
                console.warn(`Nenhum documento encontrado para o usuário ${uid} em fetchUserDetails.`);
                return { id: uid, displayName: `Usuário (${uid.substring(0,5)}...)`, photoURL: 'imgs/default-avatar.png', isMissing: true };
            }
        } catch (error) {
            console.error(`Erro ao buscar detalhes do usuário ${uid}:`, error);
            return { id: uid, displayName: "Erro ao carregar", photoURL: 'imgs/default-avatar.png', isMissing: true, hasError: true };
        }
    }


    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            const userDocRef = doc(db, "users", currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                currentUserData = userDocSnap.data();
                currentUserData.uid = currentUser.uid; // Garante UID no currentUserData
                currentUserData.friendsCount = currentUserData.friendsCount || 0;
                currentUserData.followersCount = currentUserData.followersCount || 0;
                currentUserData.followingCount = currentUserData.followingCount || 0;

                if (myFriendIdDisplay) myFriendIdDisplay.textContent = currentUserData.friendId || 'Não definido';

                if (userAuthSection) {
                    const displayName = currentUserData.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || "Usuário";
                    const photoURL = currentUserData.photoURL || currentUser.photoURL || 'imgs/default-avatar.png';
                    userAuthSection.innerHTML = `
                        <a href="profile.html" class="user-info-link">
                            <div class="user-info">
                                <img id="user-photo" src="${photoURL}" alt="Foto do Usuário">
                                <span id="user-name">${displayName}</span>
                            </div>
                        </a>`;
                }
                listenToFriends();
                listenToFriendRequests();
            } else {
                console.error("[Auth State - Friends Page] ALERTA: Documento do usuário não encontrado no Firestore para UID:", currentUser.uid);
                if (myFriendIdDisplay) myFriendIdDisplay.textContent = 'Erro (sem perfil Firestore)';
                 if (userAuthSection) {
                    userAuthSection.innerHTML = `<a href="login.html" class="login-button">Erro ao carregar</a>`;
                }
            }
        } else {
            window.location.href = 'login.html';
        }
    });

    if (addFriendButton) {
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
            showMessage(addFriendMessage, "Buscando e enviando pedido...", "info");
            try {
                const mappingRef = doc(db, "friendIdMappings", targetFriendId);
                const mappingSnap = await getDoc(mappingRef);
                if (!mappingSnap.exists()) {
                    showMessage(addFriendMessage, "Usuário com este ID de Amigo não encontrado."); return;
                }
                const targetUid = mappingSnap.data().uid;
                if (targetUid === currentUser.uid) { 
                    showMessage(addFriendMessage, "Você não pode adicionar a si mesmo."); return;
                }
                const targetUserProfile = await fetchUserDetails(targetUid);
                if (targetUserProfile.isMissing) { 
                     showMessage(addFriendMessage, "Perfil do usuário alvo não encontrado no banco de dados."); return;
                }

                const areAlreadyFriends = (await getDoc(doc(db, `users/${currentUser.uid}/friends/${targetUid}`))).exists();
                if (areAlreadyFriends) { showMessage(addFriendMessage, "Vocês já são amigos!"); return; }
                const alreadySentByMe = (await getDoc(doc(db, `users/${currentUser.uid}/friendRequestsSent/${targetUid}`))).exists();
                if (alreadySentByMe) { showMessage(addFriendMessage, "Você já enviou um pedido para este usuário."); return; }
                const alreadyReceivedFromTarget = (await getDoc(doc(db, `users/${currentUser.uid}/friendRequestsReceived/${targetUid}`))).exists();
                if (alreadyReceivedFromTarget) { showMessage(addFriendMessage, "Este usuário já te enviou um pedido. Verifique seus pedidos recebidos."); return; }

                const batch = writeBatch(db);
                const sentRef = doc(db, `users/${currentUser.uid}/friendRequestsSent`, targetUid);
                // Não precisa mais salvar receiverName/PhotoURL aqui, pois sempre buscaremos o atual
                batch.set(sentRef, {
                    status: "pending", timestamp: serverTimestamp(),
                    receiverUid: targetUid 
                });
                const receivedRef = doc(db, `users/${targetUid}/friendRequestsReceived`, currentUser.uid);
                // Não precisa mais salvar senderName/PhotoURL aqui
                batch.set(receivedRef, {
                    status: "pending", senderUid: currentUser.uid,
                    timestamp: serverTimestamp()
                });
                await batch.commit();
                showMessage(addFriendMessage, "Pedido de amizade enviado!", "success");
                addFriendInput.value = '';
            } catch (error) {
                console.error("[Add Friend] Erro CRÍTICO ao enviar pedido:", error);
                showMessage(addFriendMessage, `Erro ao enviar pedido: ${error.message}`);
            }
        });
    }

    const renderList = (listElement, itemsWithFreshData, type) => {
        if (!listElement) { console.error("Elemento de lista não encontrado para renderizar:", type); return; }
        listElement.innerHTML = '';
        if (itemsWithFreshData.length === 0) {
            let placeholderText = "Nenhum item aqui.";
            if (type === 'received') placeholderText = "Nenhum pedido recebido.";
            else if (type === 'sent') placeholderText = "Nenhum pedido enviado.";
            else if (type === 'friends') placeholderText = "Você ainda não tem amigos.";
            listElement.innerHTML = `<li class="list-placeholder">${placeholderText}</li>`;
            return;
        }
        itemsWithFreshData.forEach(freshItemData => { // freshItemData é o resultado de fetchUserDetails
            const li = document.createElement('li');
            li.className = 'friend-list-item';
            
            const targetUid = freshItemData.id;
            const displayName = freshItemData.displayName; // Dados frescos
            const photoURL = freshItemData.photoURL;     // Dados frescos

            const profileLink = document.createElement('a');
            profileLink.href = `public-profile.html?uid=${targetUid}`;
            profileLink.className = 'profile-list-link';

            const avatarImg = document.createElement('img');
            avatarImg.src = photoURL;
            avatarImg.alt = displayName;
            avatarImg.className = 'friend-avatar-small';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = displayName;
            if (freshItemData.isMissing || freshItemData.hasError) nameSpan.style.fontStyle = 'italic';

            profileLink.append(avatarImg, nameSpan);
            li.appendChild(profileLink);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'actions';

            // Os dados originais da subcoleção (como 'status' do pedido) podem ser passados
            // em freshItemData.originalSubcollectionData se necessário.
            // Por agora, 'status' é pego de freshItemData.dataFromRequest se adicionado lá.
            const originalSubData = freshItemData.originalSubcollectionData || {};


            if (type === 'received') {
                const acceptBtn = document.createElement('button'); acceptBtn.className = 'accept-request'; acceptBtn.dataset.id = targetUid; acceptBtn.textContent = 'Aceitar';
                const declineBtn = document.createElement('button'); declineBtn.className = 'decline-request'; declineBtn.dataset.id = targetUid; declineBtn.textContent = 'Recusar';
                actionsDiv.append(acceptBtn, declineBtn);
            } else if (type === 'sent') {
                const statusSpan = document.createElement('span'); statusSpan.className = 'status';
                // Para 'sent', o 'status' viria do documento da subcoleção friendRequestsSent
                // Precisamos garantir que 'originalSubData' (anteriormente itemWrapper.data) está disponível
                statusSpan.textContent = `(${(originalSubData.status || 'pendente')})`;
                const cancelBtn = document.createElement('button'); cancelBtn.className = 'cancel-request'; cancelBtn.dataset.id = targetUid; cancelBtn.textContent = 'Cancelar';
                actionsDiv.append(statusSpan, cancelBtn);
            } else if (type === 'friends') {
                const removeBtn = document.createElement('button'); removeBtn.className = 'remove-friend'; removeBtn.dataset.id = targetUid;
                const trashIcon = document.createElement('img'); trashIcon.src = 'imgs/trashbin.png'; trashIcon.alt = 'Remover'; trashIcon.className = 'btn-icon-small';
                removeBtn.appendChild(trashIcon);
                actionsDiv.appendChild(removeBtn);
            }
            if (actionsDiv.hasChildNodes()) li.appendChild(actionsDiv);
            listElement.appendChild(li);
        });
    };
    
    let unsubFriends, unsubSent, unsubReceived;

    function listenToFriends() {
        if (!currentUser || !friendsList) return;
        if (unsubFriends) unsubFriends();
        
        const friendsQueryRef = query(collection(db, `users/${currentUser.uid}/friends`), orderBy("timestamp", "desc"));
        unsubFriends = onSnapshot(friendsQueryRef, async (snapshot) => {
            const friendsDataPromises = snapshot.docs.map(async (friendDoc) => {
                const friendUid = friendDoc.id;
                // SEMPRE buscar dados frescos do amigo
                const friendProfileDetails = await fetchUserDetails(friendUid);
                return { 
                    ...friendProfileDetails, // Contém id, displayName, photoURL, isMissing, etc.
                    originalSubcollectionData: friendDoc.data() // Mantém dados da subcoleção original se precisar (ex: timestamp)
                };
            });
            const friendsDataWithFreshDetails = await Promise.all(friendsDataPromises);
            renderList(friendsList, friendsDataWithFreshDetails, 'friends');
        }, error => {
            console.error("[Listener Friends] Erro:", error);
            if (friendsList) friendsList.innerHTML = `<li class="list-placeholder error">Erro ao carregar amigos.</li>`;
        });
    }

    function listenToFriendRequests() {
        if (!currentUser) return;

        if (unsubSent) unsubSent();
        const sentQueryRef = query(collection(db, `users/${currentUser.uid}/friendRequestsSent`), orderBy("timestamp", "desc"));
        unsubSent = onSnapshot(sentQueryRef, async (snapshot) => {
            const sentItemsPromises = snapshot.docs.map(async (requestDoc) => {
                const recipientUid = requestDoc.id; // O ID do documento é o UID do destinatário
                const requestData = requestDoc.data(); // Dados do pedido (status, timestamp)
                const recipientProfileDetails = await fetchUserDetails(recipientUid); // Busca dados frescos do destinatário
                return {
                    ...recipientProfileDetails, // Contém id (que será recipientUid), displayName, photoURL, etc.
                    originalSubcollectionData: requestData // Para ter acesso ao 'status' do pedido
                };
            });
            const sentItemsWithFreshDetails = await Promise.all(sentItemsPromises);
            renderList(sentRequestsList, sentItemsWithFreshDetails, 'sent');
        }, error => {
            console.error("[Listener Sent Requests] Erro:", error);
            if (sentRequestsList) sentRequestsList.innerHTML = `<li class="list-placeholder error">Erro ao carregar pedidos enviados.</li>`;
        });

        if (unsubReceived) unsubReceived();
        const receivedQueryRef = query(collection(db, `users/${currentUser.uid}/friendRequestsReceived`), orderBy("timestamp", "desc"));
        unsubReceived = onSnapshot(receivedQueryRef, async (snapshot) => {
            const receivedItemsPromises = snapshot.docs.map(async (requestDoc) => {
                const senderUid = requestDoc.id; // O ID do documento é o UID do remetente
                const requestData = requestDoc.data(); // Dados do pedido (status, timestamp)
                const senderProfileDetails = await fetchUserDetails(senderUid); // Busca dados frescos do remetente
                return {
                    ...senderProfileDetails, // Contém id (senderUid), displayName, photoURL, etc.
                    originalSubcollectionData: requestData // Para ter acesso a outros dados do pedido se houver
                };
            });
            const receivedItemsWithFreshDetails = await Promise.all(receivedItemsPromises);
            renderList(receivedRequestsList, receivedItemsWithFreshDetails, 'received');
        }, error => {
            console.error("[Listener Received Requests] Erro:", error);
            if (receivedRequestsList) receivedRequestsList.innerHTML = `<li class="list-placeholder error">Erro ao carregar pedidos recebidos.</li>`;
        });
    }
    
    document.addEventListener('click', async (event) => {
        if (!currentUser || !currentUserData) {
            console.warn("Ação de amizade clicada, mas currentUser ou currentUserData não estão definidos.");
            return;
        }
        const targetButton = event.target.closest('button.accept-request, button.decline-request, button.cancel-request, button.remove-friend');
        
        if (!targetButton) return; 

        const otherUserId = targetButton.dataset.id;
        if (!otherUserId) {
            console.warn("Botão de ação de amizade não tem data-id.", targetButton);
            return;
        }

        const batch = writeBatch(db);
        const currentUserDocRef = doc(db, "users", currentUser.uid);
        
        try {
            if (targetButton.classList.contains('accept-request')) {
                showMessage(addFriendMessage, 'Aceitando pedido...', 'info');
                const otherUserProfile = await fetchUserDetails(otherUserId); // Pega dados frescos para desnormalizar na amizade
                if (otherUserProfile.isMissing || otherUserProfile.hasError) throw new Error("Perfil do remetente do pedido não encontrado ou erro ao buscar.");

                // Salva dados desnormalizados (frescos) na criação da amizade
                batch.set(doc(db, `users/${currentUser.uid}/friends`, otherUserId), {
                    timestamp: serverTimestamp(),
                    friendName: otherUserProfile.displayName, // Dado fresco
                    friendPhotoURL: otherUserProfile.photoURL  // Dado fresco
                });
                batch.set(doc(db, `users/${otherUserId}/friends`, currentUser.uid), {
                    timestamp: serverTimestamp(),
                    friendName: currentUserData.displayName, // Dado do usuário logado
                    friendPhotoURL: currentUserData.photoURL
                });
                batch.delete(doc(db, `users/${currentUser.uid}/friendRequestsReceived`, otherUserId));
                batch.delete(doc(db, `users/${otherUserId}/friendRequestsSent`, currentUser.uid));
                
                batch.update(currentUserDocRef, { friendsCount: increment(1) });
                
                await batch.commit();
                currentUserData.friendsCount = (currentUserData.friendsCount || 0) + 1; 
                showMessage(addFriendMessage, 'Amigo adicionado!', 'success');
            }
            else if (targetButton.classList.contains('decline-request')) {
                showMessage(addFriendMessage, 'Recusando pedido...', 'info');
                batch.delete(doc(db, `users/${currentUser.uid}/friendRequestsReceived`, otherUserId));
                batch.delete(doc(db, `users/${otherUserId}/friendRequestsSent`, currentUser.uid));
                await batch.commit();
                showMessage(addFriendMessage, 'Pedido recusado.', 'success');
            }
            else if (targetButton.classList.contains('cancel-request')) {
                showMessage(addFriendMessage, 'Cancelando pedido...', 'info');
                batch.delete(doc(db, `users/${currentUser.uid}/friendRequestsSent`, otherUserId));
                batch.delete(doc(db, `users/${otherUserId}/friendRequestsReceived`, currentUser.uid));
                await batch.commit();
                showMessage(addFriendMessage, 'Pedido cancelado.', 'success');
            }
            else if (targetButton.classList.contains('remove-friend')) {
                const friendNameElement = targetButton.closest('.friend-list-item')?.querySelector('.profile-list-link span');
                const friendNameToConfirm = friendNameElement ? friendNameElement.textContent : 'este amigo';
                if(window.confirm(`Tem certeza que deseja remover ${friendNameToConfirm}?`)) {
                    showMessage(addFriendMessage, 'Removendo amigo...', 'info');
                    batch.delete(doc(db, `users/${currentUser.uid}/friends`, otherUserId));
                    batch.delete(doc(db, `users/${otherUserId}/friends`, currentUser.uid));
                    
                    batch.update(currentUserDocRef, { friendsCount: increment(-1) });

                    await batch.commit();
                    currentUserData.friendsCount = Math.max(0, (currentUserData.friendsCount || 1) - 1); 
                    showMessage(addFriendMessage, 'Amigo removido.', 'success');
                } else {
                    return; 
                }
            }
        } catch (e) {
            console.error("Erro na ação de amizade:", e);
            showMessage(addFriendMessage, `Erro: ${e.message || 'Falha na operação.'}`);
        }
    });
    
    console.log("David's Farm friends script (vRaiz - Foto Fresca em Todas as Listas) carregado!");
});