// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc, // Adicionado updateDoc para o caso de atualizar friendId em doc existente
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAoI436Z3hx8rp63S6Ea095YpGxAeJdazA",
    authDomain: "david-s-farm.firebaseapp.com",
    projectId: "david-s-farm",
    storageBucket: "david-s-farm.firebasestorage.app",
    messagingSenderId: "1036766340330",
    appId: "1:1036766340330:web:5fb56b8eb0d7241c7a2393",
    measurementId: "G-XP73P7XJ09"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Funções Utilitárias para Friend ID ---
const generateFriendIdInternal = () => Math.floor(100000 + Math.random() * 900000).toString();

const isFriendIdTakenInternal = async (friendId) => {
    const mappingRef = doc(db, "friendIdMappings", friendId);
    const docSnap = await getDoc(mappingRef);
    return docSnap.exists();
};

// Exporta createUniqueFriendId para ser usado se necessário externamente, embora ensureUserProfileAndFriendId o use internamente.
export const createUniqueFriendId = async () => {
    let friendId;
    let taken = true;
    let attempts = 0;
    const maxAttempts = 10; 

    while (taken && attempts < maxAttempts) {
        friendId = generateFriendIdInternal(); // Usa a função interna
        taken = await isFriendIdTakenInternal(friendId); // Usa a função interna
        attempts++;
    }
    if (taken) {
        console.error("Falha crítica: Não foi possível gerar um ID de amigo único após várias tentativas.");
        throw new Error("FRIEND_ID_GENERATION_FAILED"); 
    }
    return friendId;
};

// Função para garantir que o perfil do usuário e o friendId existam no Firestore
// AGORA ESTÁ CORRETAMENTE EXPORTADA
export const ensureUserProfileAndFriendId = async (userAuth) => {
    if (!userAuth) {
        console.warn("ensureUserProfileAndFriendId chamada com userAuth nulo.");
        return null;
    }

    const userDocRef = doc(db, "users", userAuth.uid);
    let userDocSnap = await getDoc(userDocRef);
    let userFirestoreData = userDocSnap.exists() ? userDocSnap.data() : null;
    let friendIdToUse = userFirestoreData?.friendId; // Pega o friendId se já existir

    let profileNeedsUpdateInFirestore = false; // Flag para indicar se houve mudança nos dados do perfil
    let newFriendIdCreated = false;

    // Garante que os dados básicos do Auth estejam refletidos no Firestore se o doc existir
    if (userFirestoreData) {
        const authDisplayName = userAuth.displayName || userAuth.email.split('@')[0];
        const authPhotoURL = userAuth.photoURL || null;

        if (userFirestoreData.displayName !== authDisplayName || userFirestoreData.photoURL !== authPhotoURL || userFirestoreData.email !== userAuth.email) {
            userFirestoreData.displayName = authDisplayName;
            userFirestoreData.photoURL = authPhotoURL;
            userFirestoreData.email = userAuth.email; // Garante que o email está atualizado
            // Não atualiza friendId ou createdAt aqui, apenas dados do perfil Auth
            await updateDoc(userDocRef, {
                displayName: userFirestoreData.displayName,
                photoURL: userFirestoreData.photoURL,
                email: userFirestoreData.email
            });
            console.log(`Perfil Firestore atualizado para ${userAuth.uid} com dados do Auth.`);
            profileNeedsUpdateInFirestore = true; // Indica que pode ser necessário recarregar os dados
        }
    }

    if (!userDocSnap.exists()) {
        console.log(`Usuário ${userAuth.uid} não encontrado no Firestore. Criando perfil completo...`);
        try {
            friendIdToUse = await createUniqueFriendId(); // Gera um novo friendId
            userFirestoreData = {
                uid: userAuth.uid,
                displayName: userAuth.displayName || userAuth.email.split('@')[0],
                email: userAuth.email,
                photoURL: userAuth.photoURL || null,
                friendId: friendIdToUse,
                createdAt: serverTimestamp()
            };
            await setDoc(userDocRef, userFirestoreData);
            
            const mappingRef = doc(db, "friendIdMappings", friendIdToUse);
            await setDoc(mappingRef, { uid: userAuth.uid });
            
            console.log(`Perfil completo e Friend ID ${friendIdToUse} criados para ${userAuth.uid}`);
            newFriendIdCreated = true;
        } catch (error) {
            console.error("Erro ao criar perfil de usuário no Firestore ou Friend ID:", error);
            // Retorna null ou os dados parciais se a criação falhar, para não quebrar o fluxo
            return userFirestoreData; 
        }
    } else if (!userFirestoreData.friendId) {
        // Usuário existe no Firestore, mas não tem friendId (caso de usuário antigo)
        console.log(`Usuário ${userAuth.uid} não tem Friend ID no Firestore. Gerando...`);
        try {
            friendIdToUse = await createUniqueFriendId();
            await updateDoc(userDocRef, { friendId: friendIdToUse }); // Atualiza apenas o friendId

            const mappingRef = doc(db, "friendIdMappings", friendIdToUse);
            await setDoc(mappingRef, { uid: userAuth.uid }); // Garante que o mapeamento exista
            
            if(userFirestoreData) userFirestoreData.friendId = friendIdToUse; // Atualiza dados em memória
            console.log(`Friend ID ${friendIdToUse} gerado e salvo para ${userAuth.uid}`);
            newFriendIdCreated = true;
        } catch (error) {
            console.error("Erro ao gerar e salvar Friend ID para usuário existente:", error);
            // Continua com os dados existentes, mesmo sem friendId se a geração falhar
        }
    }
    
    // Se houve uma criação de perfil ou de friendId, ou atualização de dados do Auth no Firestore,
    // é bom ter os dados mais recentes do Firestore.
    if (!userDocSnap.exists() || newFriendIdCreated || profileNeedsUpdateInFirestore) {
        userDocSnap = await getDoc(userDocRef); // Recarrega o snapshot
        userFirestoreData = userDocSnap.exists() ? userDocSnap.data() : userFirestoreData;
    }
    
    return userFirestoreData;
};

// Exporta as instâncias e a função utilitária principal
export { app, auth, db };