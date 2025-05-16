// public-profile-script.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const userAuthSection = document.querySelector('.user-auth-section'); // Header do visualizador
    const currentYearSpan = document.getElementById('currentYear');
    const siteContent = document.getElementById('site-content');

    const profileLoadingDiv = document.getElementById('public-profile-loading');
    const profileContentDiv = document.getElementById('public-profile-content');
    const profileErrorDiv = document.getElementById('public-profile-error');

    const profilePagePhoto = document.getElementById('profile-page-photo');
    const profilePageDisplayName = document.getElementById('profile-page-displayName');
    const profilePageScratchLink = document.getElementById('profile-page-scratch-link');
    const profilePageScratchUsername = document.getElementById('profile-page-scratchUsername');
    const profilePagePronouns = document.getElementById('profile-page-pronouns');
    const profilePageDescription = document.getElementById('profile-page-description');
    const friendActionButtonContainer = document.getElementById('profile-friend-action-button-container');
    const friendActionMessage = document.getElementById('friend-action-message');


    let viewer = null; // O usuário que está visualizando o perfil
    let viewedUserUid = null; // UID do perfil que está sendo visualizado
    let viewedUserData = null; // Dados do Firestore do perfil visualizado
    let viewerData = null; // Dados do Firestore do visualizador

    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (siteContent) setTimeout(() => siteContent.classList.add('visible'), 100);

    const showMessage = (element, message, type = 'error') => {
        if(element) {
            element.textContent = message;
            element.className = 'form-message ' + (type === 'success' ? 'success' : '');
            element.style.display = 'block';
            setTimeout(() => { element.style.display = 'none'; element.textContent = ''; }, 5000);
        }
    };

    const params = new URLSearchParams(window.location.search);
    viewedUserUid = params.get('uid');

    if (!viewedUserUid) {
        profileLoadingDiv.style.display = 'none';
        showMessage(profileErrorDiv, 'Nenhum perfil de usuário especificado para visualização.', 'error');
        return;
    }

    // Lógica para preencher o header com os dados do VISUALIZADOR
    onAuthStateChanged(auth, async (loggedInUser) => {
        viewer = loggedInUser; // Pode ser null se não estiver logado
        if (viewer) {
             const viewerDocSnap = await getDoc(doc(db, "users", viewer.uid));
             if(viewerDocSnap.exists()) viewerData = viewerDocSnap.data();
        }

        if (userAuthSection) {
            if (viewer) {
                const displayName = viewerData?.displayName || viewer.displayName || viewer.email;
                const photoURL = viewerData?.photoURL || viewer.photoURL || 'imgs/default-avatar.png';
                userAuthSection.innerHTML = `
                    <a href="profile.html" class="user-info-link">
                        <div class="user-info">
                            <img id="user-photo" src="${photoURL}" alt="Foto">
                            <span id="user-name">${displayName}</span>
                        </div>
                    </a>`;
            } else {
                userAuthSection.innerHTML = `<a href="login.html" class="login-button">Login</a>`;
            }
        }
        // Após carregar o estado do visualizador, carrega o perfil visualizado
        loadPublicProfile();
    });


    async function loadPublicProfile() {
        try {
            const userDocRef = doc(db, "users", viewedUserUid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                viewedUserData = userDocSnap.data();
                profilePagePhoto.src = viewedUserData.photoURL || 'imgs/default-avatar.png';
                profilePageDisplayName.textContent = viewedUserData.displayName || 'Usuário Anônimo';
                
                if (viewedUserData.scratchUsername) {
                    profilePageScratchUsername.textContent = `@${viewedUserData.scratchUsername}`;
                    profilePageScratchLink.href = `https://scratch.mit.edu/users/${viewedUserData.scratchUsername}/`;
                    profilePageScratchLink.style.display = 'inline';
                } else {
                    profilePageScratchLink.style.display = 'none';
                }
                profilePagePronouns.textContent = viewedUserData.pronouns || '';
                profilePageDescription.textContent = viewedUserData.profileDescription || 'Nenhuma descrição ainda.';

                profileLoadingDiv.style.display = 'none';
                profileContentDiv.style.display = 'block';
                updateFriendActionButton();
            } else {
                profileLoadingDiv.style.display = 'none';
                showMessage(profileErrorDiv, 'Perfil não encontrado.', 'error');
            }
        } catch (error) {
            console.error("Erro ao carregar perfil público:", error);
            profileLoadingDiv.style.display = 'none';
            showMessage(profileErrorDiv, 'Erro ao carregar o perfil.', 'error');
        }
    }

    async function updateFriendActionButton() {
        if (!friendActionButtonContainer) return;
        friendActionButtonContainer.innerHTML = ''; // Limpa

        if (!viewer) { // Se não há visualizador logado, não mostra botões de ação de amizade
            return;
        }

        if (viewer.uid === viewedUserUid) {
            friendActionButtonContainer.innerHTML = `<a href="profile.html" class="profile-action-button edit">Editar Meu Perfil</a>`;
            return;
        }

        // Checar status de amizade
        const friendRef = doc(db, `users/${viewer.uid}/friends/${viewedUserUid}`);
        const sentRequestRef = doc(db, `users/${viewer.uid}/friendRequestsSent/${viewedUserUid}`);
        const receivedRequestRef = doc(db, `users/${viewer.uid}/friendRequestsReceived/${viewedUserUid}`);

        const [friendSnap, sentSnap, receivedSnap] = await Promise.all([
            getDoc(friendRef), getDoc(sentRequestRef), getDoc(receivedRequestRef)
        ]);

        if (friendSnap.exists()) {
            friendActionButtonContainer.innerHTML = `<button id="remove-friend-public-btn" class="profile-action-button delete"><img src="imgs/trashbin.png" alt="Remover" class="btn-icon">Remover Amigo</button>`;
            document.getElementById('remove-friend-public-btn')?.addEventListener('click', handleRemoveFriend);
        } else if (sentSnap.exists()) {
            friendActionButtonContainer.innerHTML = `<button id="cancel-request-public-btn" class="profile-action-button cancel">Cancelar Pedido</button>`;
            document.getElementById('cancel-request-public-btn')?.addEventListener('click', handleCancelRequest);
        } else if (receivedSnap.exists()) {
            friendActionButtonContainer.innerHTML = `
                <button id="accept-request-public-btn" class="profile-action-button accept">Aceitar Pedido</button>
                <button id="decline-request-public-btn" class="profile-action-button decline">Recusar Pedido</button>`;
            document.getElementById('accept-request-public-btn')?.addEventListener('click', handleAcceptRequest);
            document.getElementById('decline-request-public-btn')?.addEventListener('click', handleDeclineRequest);
        } else {
            friendActionButtonContainer.innerHTML = `<button id="add-friend-public-btn" class="profile-action-button add">Adicionar Amigo</button>`;
            document.getElementById('add-friend-public-btn')?.addEventListener('click', handleAddFriend);
        }
    }

    // --- Funções de Ação de Amizade (adaptadas de friends-script.js) ---
    async function handleAddFriend() {
        if (!viewer || !viewedUserData || !viewerData) { showMessage(friendActionMessage, "Erro: Dados do usuário não carregados."); return; }
        
        showMessage(friendActionMessage, "Enviando pedido...", "success");
        const batch = writeBatch(db);
        try {
            // No remetente (viewer):
            const sentRef = doc(db, `users/${viewer.uid}/friendRequestsSent`, viewedUserUid);
            batch.set(sentRef, { 
                status: "pending", timestamp: serverTimestamp(),
                receiverUid: viewedUserUid,
                receiverName: viewedUserData.displayName || "Usuário",
                receiverPhotoURL: viewedUserData.photoURL || 'imgs/default-avatar.png'
            });
            // No destinatário (viewedUser):
            const receivedRef = doc(db, `users/${viewedUserUid}/friendRequestsReceived`, viewer.uid);
            batch.set(receivedRef, { 
                status: "pending", senderUid: viewer.uid,
                senderName: viewerData.displayName || viewer.email,
                senderPhotoURL: viewerData.photoURL || 'imgs/default-avatar.png',
                timestamp: serverTimestamp() 
            });
            await batch.commit();
            showMessage(friendActionMessage, "Pedido de amizade enviado!", "success");
            updateFriendActionButton(); // Atualiza o botão
        } catch (error) {
            console.error("Erro ao enviar pedido de amizade (perfil público):", error);
            showMessage(friendActionMessage, "Erro ao enviar pedido.");
        }
    }

    async function handleRemoveFriend() {
        if (!viewer || !viewedUserData) return;
        if(window.confirm(`Tem certeza que deseja remover ${viewedUserData.displayName || 'este usuário'} dos seus amigos?`)) {
            showMessage(friendActionMessage, 'Removendo amigo...', 'success');
            const batch = writeBatch(db);
            try {
                batch.delete(doc(db, `users/${viewer.uid}/friends`, viewedUserUid));
                batch.delete(doc(db, `users/${viewedUserUid}/friends`, viewer.uid));
                await batch.commit();
                showMessage(friendActionMessage, 'Amigo removido.', 'success');
                updateFriendActionButton();
            } catch (e) { console.error("Erro ao remover amigo (perfil público):", e); showMessage(friendActionMessage, 'Erro ao remover amigo.');}
        }
    }
    async function handleCancelRequest() { /* ... (similar a friends-script, adaptado para batch e updateFriendActionButton) ... */
        if (!viewer || !viewedUserData) return;
        showMessage(friendActionMessage, 'Cancelando pedido...', 'success');
        const batch = writeBatch(db);
        try {
            batch.delete(doc(db, `users/${viewer.uid}/friendRequestsSent`, viewedUserUid));
            batch.delete(doc(db, `users/${viewedUserUid}/friendRequestsReceived`, viewer.uid));
            await batch.commit();
            showMessage(friendActionMessage, 'Pedido cancelado.', 'success');
            updateFriendActionButton();
        } catch (e) { console.error("Erro ao cancelar pedido (perfil público):", e); showMessage(friendActionMessage, 'Erro ao cancelar pedido.');}
    }
    async function handleAcceptRequest() { /* ... (similar a friends-script, adaptado para batch e updateFriendActionButton) ... */
        if (!viewer || !viewedUserData || !viewerData) return; // viewerData é o perfil de quem aceita (eu)
        showMessage(friendActionMessage, 'Aceitando pedido...', 'success');
        const batch = writeBatch(db);
        try {
            batch.set(doc(db, `users/${viewer.uid}/friends`, viewedUserUid), { 
                addedAt: serverTimestamp(), 
                friendName: viewedUserData.displayName || "Amigo", // Nome de quem enviou o pedido
                friendPhotoURL: viewedUserData.photoURL || 'imgs/default-avatar.png'
            });
            batch.set(doc(db, `users/${viewedUserUid}/friends`, viewer.uid), { 
                addedAt: serverTimestamp(), 
                friendName: viewerData.displayName || "Amigo", // Meu nome
                friendPhotoURL: viewerData.photoURL || 'imgs/default-avatar.png'
            });
            batch.delete(doc(db, `users/${viewer.uid}/friendRequestsReceived`, viewedUserUid)); // Eu (viewer) recebi de viewedUserUid
            batch.delete(doc(db, `users/${viewedUserUid}/friendRequestsSent`, viewer.uid));    // viewedUserUid enviou para mim (viewer)
            await batch.commit();
            showMessage(friendActionMessage, 'Amigo adicionado!', 'success');
            updateFriendActionButton();
        } catch (e) { console.error("Erro ao aceitar pedido (perfil público):", e); showMessage(friendActionMessage, 'Erro ao aceitar pedido.');}
    }
    async function handleDeclineRequest() { /* ... (similar a friends-script, adaptado para batch e updateFriendActionButton) ... */
        if (!viewer || !viewedUserData) return;
        showMessage(friendActionMessage, 'Recusando pedido...', 'success');
        const batch = writeBatch(db);
        try {
            batch.delete(doc(db, `users/${viewer.uid}/friendRequestsReceived`, viewedUserUid));
            batch.delete(doc(db, `users/${viewedUserUid}/friendRequestsSent`, viewer.uid));
            await batch.commit();
            showMessage(friendActionMessage, 'Pedido recusado.', 'success');
            updateFriendActionButton();
        } catch (e) { console.error("Erro ao recusar pedido (perfil público):", e); showMessage(friendActionMessage, 'Erro ao recusar pedido.');}
    }

    console.log("David's Farm public profile script carregado!");
});