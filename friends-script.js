// friends-script.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    doc, getDoc, setDoc, updateDoc, deleteDoc,
    collection, query, where, getDocs, onSnapshot,
    serverTimestamp, arrayUnion, arrayRemove
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
        element.textContent = message;
        element.className = 'form-message ' + (type === 'success' ? 'success' : '');
        element.style.display = 'block';
        setTimeout(() => { element.style.display = 'none'; element.textContent = ''; }, 5000);
    };

    // --- Lógica Principal de Autenticação e Carregamento de Dados ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            // Preenche header
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

            // Carrega dados do usuário do Firestore, incluindo friendId
            const userDocRef = doc(db, "users", currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                currentUserData = userDocSnap.data();
                if (myFriendIdDisplay) myFriendIdDisplay.textContent = currentUserData.friendId || 'Não definido';
                
                // Inicia os listeners para listas de amigos e pedidos
                listenToFriends();
                listenToFriendRequests();
            } else {
                console.error("Documento do usuário não encontrado no Firestore!");
                if (myFriendIdDisplay) myFriendIdDisplay.textContent = 'Erro ao carregar';
            }

        } else {
            window.location.href = 'login.html';
        }
    });

    // --- Lógica para Adicionar Amigos ---
    if (addFriendButton) {
        addFriendButton.addEventListener('click', async () => {
            if (!currentUser || !currentUserData) {
                showMessage(addFriendMessage, "Você precisa estar logado.");
                return;
            }
            const targetFriendId = addFriendInput.value.trim();
            if (!targetFriendId || targetFriendId.length !== 6 || !/^\d+$/.test(targetFriendId) ) {
                showMessage(addFriendMessage, "Por favor, insira um ID de Amigo válido (6 dígitos numéricos).");
                return;
            }
            if (targetFriendId === currentUserData.friendId) {
                showMessage(addFriendMessage, "Você não pode adicionar a si mesmo.");
                return;
            }

            showMessage(addFriendMessage, "Buscando usuário...", "success");

            try {
                // 1. Encontrar o UID do usuário alvo pelo friendId
                const mappingRef = doc(db, "friendIdMappings", targetFriendId);
                const mappingSnap = await getDoc(mappingRef);

                if (!mappingSnap.exists()) {
                    showMessage(addFriendMessage, "Usuário com este ID de Amigo não encontrado.");
                    return;
                }
                const targetUid = mappingSnap.data().uid;

                if (targetUid === currentUser.uid) { // Checagem dupla
                    showMessage(addFriendMessage, "Você não pode adicionar a si mesmo.");
                    return;
                }

                // Checar se já são amigos ou se já existe um pedido pendente
                const friendDocRef = doc(db, `users/${currentUser.uid}/friends/${targetUid}`);
                const friendDocSnap = await getDoc(friendDocRef);
                if (friendDocSnap.exists()) {
                     showMessage(addFriendMessage, "Vocês já são amigos!"); return;
                }
                const sentRequestRef = doc(db, `users/${currentUser.uid}/friendRequestsSent/${targetUid}`);
                const sentRequestSnap = await getDoc(sentRequestRef);
                if (sentRequestSnap.exists()) {
                     showMessage(addFriendMessage, "Você já enviou um pedido para este usuário."); return;
                }
                 const receivedRequestRef = doc(db, `users/${currentUser.uid}/friendRequestsReceived/${targetUid}`);
                const receivedRequestSnap = await getDoc(receivedRequestRef);
                if (receivedRequestSnap.exists()) {
                     showMessage(addFriendMessage, "Este usuário já te enviou um pedido. Verifique seus pedidos recebidos."); return;
                }


                // 2. Enviar o pedido (criar documentos em ambas as árvores)
                // No remetente:
                const sentRef = doc(db, `users/${currentUser.uid}/friendRequestsSent`, targetUid);
                await setDoc(sentRef, { 
                    status: "pending", 
                    timestamp: serverTimestamp(),
                    receiverName: (await getDoc(doc(db, "users", targetUid))).data()?.displayName || "Usuário Desconhecido" // Adiciona nome do destinatário
                });

                // No destinatário:
                const receivedRef = doc(db, `users/${targetUid}/friendRequestsReceived`, currentUser.uid);
                await setDoc(receivedRef, { 
                    status: "pending", 
                    senderName: currentUserData.displayName || currentUser.email, // Nome do remetente
                    senderPhotoURL: currentUserData.photoURL || 'imgs/default-avatar.png',
                    timestamp: serverTimestamp() 
                });
                
                showMessage(addFriendMessage, "Pedido de amizade enviado!", "success");
                addFriendInput.value = '';
            } catch (error) {
                console.error("Erro ao enviar pedido de amizade:", error);
                showMessage(addFriendMessage, "Erro ao enviar pedido. Tente novamente.");
            }
        });
    }

    // --- Funções para Renderizar Listas ---
    const renderList = (listElement, items, type) => {
        listElement.innerHTML = ''; // Limpa a lista
        if (items.length === 0) {
            listElement.innerHTML = `<li class="list-placeholder">Nenhum item aqui.</li>`;
            return;
        }
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'friend-list-item';
            let content = `<span>${item.displayName || item.senderName || item.receiverName || item.id}</span>`; // item.id é o UID do outro usuário

            if (type === 'received') {
                content += ` <div class="actions"><button class="accept-request" data-id="${item.id}">Aceitar</button> <button class="decline-request" data-id="${item.id}">Recusar</button></div>`;
            } else if (type === 'sent') {
                content += ` <span class="status">(${item.data.status})</span> <button class="cancel-request" data-id="${item.id}">Cancelar</button>`;
            } else if (type === 'friends') {
                content += ` <div class="actions"><button class="remove-friend" data-id="${item.id}">Remover</button></div>`;
            }
            li.innerHTML = content;
            listElement.appendChild(li);
        });
    };
    
    // --- Listeners para as listas (usando onSnapshot para tempo real) ---
    let unsubFriends, unsubSent, unsubReceived;

    function listenToFriends() {
        if (unsubFriends) unsubFriends(); // Cancela listener anterior
        const friendsQuery = collection(db, `users/${currentUser.uid}/friends`);
        unsubFriends = onSnapshot(friendsQuery, async (snapshot) => {
            const friendsData = [];
            for (const friendDoc of snapshot.docs) {
                const friendUid = friendDoc.id;
                const friendProfileSnap = await getDoc(doc(db, "users", friendUid));
                if (friendProfileSnap.exists()) {
                    friendsData.push({ id: friendUid, ...friendProfileSnap.data() });
                }
            }
            renderList(friendsList, friendsData, 'friends');
        });
    }

    function listenToFriendRequests() {
        if (unsubSent) unsubSent();
        if (unsubReceived) unsubReceived();

        // Pedidos Enviados
        const sentQuery = collection(db, `users/${currentUser.uid}/friendRequestsSent`);
        unsubSent = onSnapshot(sentQuery, (snapshot) => {
            const sentData = snapshot.docs.map(d => ({ id: d.id, data: d.data() }));
            renderList(sentRequestsList, sentData, 'sent');
        });

        // Pedidos Recebidos
        const receivedQuery = collection(db, `users/${currentUser.uid}/friendRequestsReceived`);
        unsubReceived = onSnapshot(receivedQuery, (snapshot) => {
            const receivedData = snapshot.docs.map(d => ({ id: d.id, data: d.data() }));
             // Adicionar displayName do remetente se não estiver já em `d.data()`
            const enrichedReceivedData = receivedData.map(req => ({
                id: req.id,
                displayName: req.data.senderName || "Usuário Desconhecido", // Usar o senderName salvo
                data: req.data
            }));
            renderList(receivedRequestsList, enrichedReceivedData, 'received');
        });
    }

    // --- Ações nas Listas (Aceitar, Recusar, Cancelar, Remover) ---
    document.addEventListener('click', async (event) => {
        if (!currentUser) return;
        const target = event.target;
        const userId = target.dataset.id;

        if (target.classList.contains('accept-request')) {
            showMessage(addFriendMessage, 'Aceitando pedido...', 'success');
            try {
                // Adicionar aos amigos de ambos
                await setDoc(doc(db, `users/${currentUser.uid}/friends`, userId), { addedAt: serverTimestamp() });
                await setDoc(doc(db, `users/${userId}/friends`, currentUser.uid), { addedAt: serverTimestamp() });

                // Atualizar status do pedido enviado pelo outro usuário para "accepted" (opcional)
                await updateDoc(doc(db, `users/${userId}/friendRequestsSent`, currentUser.uid), { status: "accepted" });
                
                // Remover pedido recebido
                await deleteDoc(doc(db, `users/${currentUser.uid}/friendRequestsReceived`, userId));
                showMessage(addFriendMessage, 'Amigo adicionado!', 'success');
            } catch (e) { console.error("Erro ao aceitar:", e); showMessage(addFriendMessage, 'Erro ao aceitar pedido.'); }
        } 
        else if (target.classList.contains('decline-request')) {
             showMessage(addFriendMessage, 'Recusando pedido...', 'success');
            try {
                // Opcional: atualizar status para "declined" em vez de deletar, se quiser guardar histórico
                await deleteDoc(doc(db, `users/${currentUser.uid}/friendRequestsReceived`, userId));
                await deleteDoc(doc(db, `users/${userId}/friendRequestsSent`, currentUser.uid)); // Também remove da lista de enviados do outro
                showMessage(addFriendMessage, 'Pedido recusado.', 'success');
            } catch (e) { console.error("Erro ao recusar:", e); showMessage(addFriendMessage, 'Erro ao recusar pedido.');}
        }
        else if (target.classList.contains('cancel-request')) {
            showMessage(addFriendMessage, 'Cancelando pedido...', 'success');
            try {
                await deleteDoc(doc(db, `users/${currentUser.uid}/friendRequestsSent`, userId));
                await deleteDoc(doc(db, `users/${userId}/friendRequestsReceived`, currentUser.uid));
                showMessage(addFriendMessage, 'Pedido cancelado.', 'success');
            } catch (e) { console.error("Erro ao cancelar:", e); showMessage(addFriendMessage, 'Erro ao cancelar pedido.');}
        }
        else if (target.classList.contains('remove-friend')) {
            if(window.confirm("Tem certeza que deseja remover este amigo?")) {
                showMessage(addFriendMessage, 'Removendo amigo...', 'success');
                try {
                    await deleteDoc(doc(db, `users/${currentUser.uid}/friends`, userId));
                    await deleteDoc(doc(db, `users/${userId}/friends`, currentUser.uid));
                    showMessage(addFriendMessage, 'Amigo removido.', 'success');
                } catch (e) { console.error("Erro ao remover:", e); showMessage(addFriendMessage, 'Erro ao remover amigo.');}
            }
        }
    });
    
    console.log("David's Farm friends script carregado!");
});