// friends-script.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    doc, getDoc, setDoc, updateDoc, deleteDoc,
    collection, query, where, getDocs, onSnapshot,
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
    let currentUserData = null;

    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (siteContent) setTimeout(() => siteContent.classList.add('visible'), 100);

    const showMessage = (element, message, type = 'error') => {
        console.log(`[UI Message - ${type}]: ${message}`);
        element.textContent = message;
        element.className = 'form-message ' + (type === 'success' ? 'success' : '');
        element.style.display = 'block';
        setTimeout(() => { element.style.display = 'none'; element.textContent = ''; }, 7000); // Aumentei o tempo
    };

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            console.log("Usuário logado:", currentUser.uid, currentUser.email);
            if (userAuthSection) {
                const displayName = user.displayName || user.email;
                const photoURL = user.photoURL || 'imgs/default-avatar.png';
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

            const userDocRef = doc(db, "users", currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                currentUserData = userDocSnap.data();
                console.log("Dados do usuário logado (Firestore):", currentUserData);
                if (myFriendIdDisplay) myFriendIdDisplay.textContent = currentUserData.friendId || 'Não definido';
                
                listenToFriends();
                listenToFriendRequests();
            } else {
                console.error("ALERTA: Documento do usuário não encontrado no Firestore para UID:", currentUser.uid);
                if (myFriendIdDisplay) myFriendIdDisplay.textContent = 'Erro ao carregar ID';
                // Aqui, você pode querer chamar a função ensureUserProfileAndFriendId se ela estiver acessível
                // ou redirecionar/mostrar uma mensagem mais crítica.
            }
        } else {
            window.location.href = 'login.html';
        }
    });

    if (addFriendButton) {
        addFriendButton.addEventListener('click', async () => {
            if (!currentUser || !currentUserData) {
                showMessage(addFriendMessage, "Você precisa estar logado."); return;
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

                const targetUserDocSnap = await getDoc(doc(db, "users", targetUid));
                const targetUserName = targetUserDocSnap.exists() ? targetUserDocSnap.data().displayName : "Usuário Destino";
                const targetUserPhotoURL = targetUserDocSnap.exists() ? targetUserDocSnap.data().photoURL : 'imgs/default-avatar.png';

                if (targetUid === currentUser.uid) {
                    showMessage(addFriendMessage, "Você não pode adicionar a si mesmo (checado novamente)."); return;
                }

                // Checagens prévias (amigos, pedidos existentes)
                // ... (as checagens são importantes, mantê-las)
                const areAlreadyFriends = (await getDoc(doc(db, `users/${currentUser.uid}/friends/${targetUid}`))).exists();
                if (areAlreadyFriends) {
                    showMessage(addFriendMessage, "Vocês já são amigos!"); return;
                }
                const alreadySent = (await getDoc(doc(db, `users/${currentUser.uid}/friendRequestsSent/${targetUid}`))).exists();
                if (alreadySent) {
                    showMessage(addFriendMessage, "Você já enviou um pedido para este usuário."); return;
                }
                 const alreadyReceived = (await getDoc(doc(db, `users/${currentUser.uid}/friendRequestsReceived/${targetUid}`))).exists();
                if (alreadyReceived) {
                     showMessage(addFriendMessage, "Este usuário já te enviou um pedido. Verifique seus pedidos recebidos para aceitar."); return;
                }

                const batch = writeBatch(db);

                // Documento na lista de "enviados" do remetente (currentUser)
                const sentPath = `users/${currentUser.uid}/friendRequestsSent/${targetUid}`;
                const sentRef = doc(db, sentPath);
                const sentData = { 
                    status: "pending", 
                    timestamp: serverTimestamp(),
                    receiverUid: targetUid, // Adicionado para referência
                    receiverName: targetUserName || "Usuário Desconhecido",
                    receiverPhotoURL: targetUserPhotoURL
                };
                console.log(`[Add Friend] Preparando para escrever em (sent): ${sentPath}`, sentData);
                batch.set(sentRef, sentData);

                // Documento na lista de "recebidos" do destinatário (targetUid)
                const receivedPath = `users/${targetUid}/friendRequestsReceived/${currentUser.uid}`;
                const receivedRef = doc(db, receivedPath);
                const receivedData = { 
                    status: "pending", 
                    senderUid: currentUser.uid,
                    senderName: currentUserData.displayName || currentUser.email,
                    senderPhotoURL: currentUserData.photoURL || 'imgs/default-avatar.png',
                    timestamp: serverTimestamp() 
                };
                console.log(`[Add Friend] Preparando para escrever em (received): ${receivedPath}`, receivedData);
                batch.set(receivedRef, receivedData);
                
                await batch.commit();
                
                showMessage(addFriendMessage, "Pedido de amizade enviado!", "success");
                addFriendInput.value = '';
            } catch (error) {
                console.error("[Add Friend] Erro CRÍTICO ao enviar pedido de amizade:", error.name, error.message, error.code);
                showMessage(addFriendMessage, "Erro ao enviar pedido. Verifique o console para detalhes.");
            }
        });
    }

    const renderList = (listElement, items, type) => { /* ... (sem alterações na renderList) ... */
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
            const displayName = itemData.displayName || itemData.senderName || itemData.receiverName || "Usuário";
            const photoURL = itemData.photoURL || itemData.senderPhotoURL || itemData.receiverPhotoURL || 'imgs/default-avatar.png';
            let content = `<img src="${photoURL}" alt="${displayName}" class="friend-avatar-small"> <span>${displayName}</span>`;
            if (type === 'received') {
                content += ` <div class="actions"><button class="accept-request" data-id="${itemWrapper.id}">Aceitar</button> <button class="decline-request" data-id="${itemWrapper.id}">Recusar</button></div>`;
            } else if (type === 'sent') {
                content += ` <span class="status">(${itemData.status || 'pendente'})</span> <button class="cancel-request" data-id="${itemWrapper.id}">Cancelar</button>`;
            } else if (type === 'friends') {
                content += ` <div class="actions"><button class="remove-friend" data-id="${itemWrapper.id}">Remover</button></div>`;
            }
            li.innerHTML = content;
            listElement.appendChild(li);
        });
    };
    
    let unsubFriends, unsubSent, unsubReceived;

    async function fetchUserDetails(uid) { /* ... (sem alterações) ... */
        const userDocRef = doc(db, "users", uid);
        const userDocSnap = await getDoc(userDocRef);
        return userDocSnap.exists() ? userDocSnap.data() : { displayName: "Usuário Desconhecido", photoURL: 'imgs/default-avatar.png' };
    }

    function listenToFriends() { /* ... (sem alterações) ... */
        if (unsubFriends) unsubFriends();
        const friendsQuery = collection(db, `users/${currentUser.uid}/friends`);
        unsubFriends = onSnapshot(friendsQuery, async (snapshot) => {
            const friendsDataPromises = snapshot.docs.map(async (friendDoc) => {
                const friendUid = friendDoc.id;
                const friendProfile = await fetchUserDetails(friendUid);
                return { id: friendUid, ...friendProfile, data: friendDoc.data() };
            });
            const friendsData = await Promise.all(friendsDataPromises);
            renderList(friendsList, friendsData, 'friends');
        }, error => console.error("Erro no listener de amigos:", error));
    }

    function listenToFriendRequests() { /* ... (sem alterações) ... */
        if (unsubSent) unsubSent();
        if (unsubReceived) unsubReceived();

        const sentQuery = collection(db, `users/${currentUser.uid}/friendRequestsSent`);
        unsubSent = onSnapshot(sentQuery, async (snapshot) => {
            const sentDataPromises = snapshot.docs.map(async (d) => ({ id: d.id, data: d.data() }));
            const sentData = await Promise.all(sentDataPromises);
            renderList(sentRequestsList, sentData, 'sent');
        }, error => console.error("Erro no listener de pedidos enviados:", error));

        const receivedQuery = collection(db, `users/${currentUser.uid}/friendRequestsReceived`);
        unsubReceived = onSnapshot(receivedQuery, async (snapshot) => {
            const receivedDataPromises = snapshot.docs.map(async (d) => ({ id: d.id, data: d.data() }));
            const receivedData = await Promise.all(receivedDataPromises);
            renderList(receivedRequestsList, receivedData, 'received');
        }, error => console.error("Erro no listener de pedidos recebidos:", error));
    }
    
    document.addEventListener('click', async (event) => {
        if (!currentUser || !currentUserData) return;
        const target = event.target;
        const otherUserId = target.dataset.id; 

        if (!otherUserId && (target.classList.contains('accept-request') || target.classList.contains('decline-request') || target.classList.contains('cancel-request') || target.classList.contains('remove-friend'))) {
            console.warn("Ação de amigo clicada sem data-id no botão.", target);
            return;
        }
        
        const batch = writeBatch(db);

        if (target.classList.contains('accept-request')) {
            console.log(`[Accept Request] De: ${otherUserId} Para: ${currentUser.uid}`);
            showMessage(addFriendMessage, 'Aceitando pedido...', 'success');
            try {
                batch.set(doc(db, `users/${currentUser.uid}/friends`, otherUserId), { addedAt: serverTimestamp(), friendName: (await getDoc(doc(db, "users", otherUserId))).data()?.displayName });
                batch.set(doc(db, `users/${otherUserId}/friends`, currentUser.uid), { addedAt: serverTimestamp(), friendName: currentUserData.displayName });
                batch.delete(doc(db, `users/${currentUser.uid}/friendRequestsReceived`, otherUserId));
                batch.delete(doc(db, `users/${otherUserId}/friendRequestsSent`, currentUser.uid)); // Importante deletar da lista de enviados do outro
                await batch.commit();
                showMessage(addFriendMessage, 'Amigo adicionado!', 'success');
            } catch (e) { console.error("[Accept Request] Erro:", e); showMessage(addFriendMessage, 'Erro ao aceitar pedido.'); }
        } 
        else if (target.classList.contains('decline-request')) {
            console.log(`[Decline Request] De: ${otherUserId} Para: ${currentUser.uid}`);
            showMessage(addFriendMessage, 'Recusando pedido...', 'success');
            try {
                batch.delete(doc(db, `users/${currentUser.uid}/friendRequestsReceived`, otherUserId));
                // Também deleta da lista de enviados do outro usuário
                batch.delete(doc(db, `users/${otherUserId}/friendRequestsSent`, currentUser.uid));
                await batch.commit();
                showMessage(addFriendMessage, 'Pedido recusado.', 'success');
            } catch (e) { console.error("[Decline Request] Erro:", e); showMessage(addFriendMessage, 'Erro ao recusar pedido.');}
        }
        else if (target.classList.contains('cancel-request')) {
            // otherUserId aqui é o recipientUid (para quem eu enviei)
            console.log(`[Cancel Request] De: ${currentUser.uid} Para: ${otherUserId}`);
            showMessage(addFriendMessage, 'Cancelando pedido...', 'success');
            try {
                // Deleta da minha lista de "enviados"
                const sentPath = `users/${currentUser.uid}/friendRequestsSent/${otherUserId}`;
                console.log(`[Cancel Request] Deletando de (sent): ${sentPath}`);
                batch.delete(doc(db, sentPath));

                // Deleta da lista de "recebidos" do outro usuário
                const receivedPath = `users/${otherUserId}/friendRequestsReceived/${currentUser.uid}`;
                console.log(`[Cancel Request] Deletando de (received): ${receivedPath}`);
                batch.delete(doc(db, receivedPath));
                
                await batch.commit();
                showMessage(addFriendMessage, 'Pedido cancelado.', 'success');
            } catch (e) { console.error("[Cancel Request] Erro:", e); showMessage(addFriendMessage, 'Erro ao cancelar pedido. Verifique o console.');}
        }
        else if (target.classList.contains('remove-friend')) {
            // ... (lógica de remover amigo - sem grandes alterações, mas usa batch) ...
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
    
    console.log("David's Farm friends script (v3 - com mais logs) carregado!");
});