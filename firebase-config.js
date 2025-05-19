// firebase-config.js
// ATUALIZADO: Removido o armazenamento do email do usuário no documento principal do Firestore.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCKB2AfgZ-J2qT39OADTBcNxQVruOzzIdU",
    authDomain: "david-farm.firebaseapp.com",
    projectId: "david-farm",
    storageBucket: "david-farm.firebasestorage.app",
    messagingSenderId: "224856226591",
    appId: "1:224856226591:web:7ab5dd8a3fcd8822af4e2a",
    measurementId: "G-S0Q529X6Z1"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const generateFriendIdInternal = () => Math.floor(100000 + Math.random() * 900000).toString();

const isFriendIdTakenInternal = async (friendId) => {
    const mappingRef = doc(db, "friendIdMappings", friendId);
    const docSnap = await getDoc(mappingRef);
    return docSnap.exists();
};

export const createUniqueFriendId = async () => {
    let friendId;
    let taken = true;
    let attempts = 0;
    const maxAttempts = 10;
    while (taken && attempts < maxAttempts) {
        friendId = generateFriendIdInternal();
        taken = await isFriendIdTakenInternal(friendId);
        attempts++;
    }
    if (taken) {
        console.error("Falha crítica: Não foi possível gerar um ID de amigo único.");
        throw new Error("FRIEND_ID_GENERATION_FAILED");
    }
    return friendId;
};

export const ensureUserProfileAndFriendId = async (userAuth) => {
    if (!userAuth) {
        console.warn("ensureUserProfileAndFriendId chamada com userAuth nulo.");
        return null;
    }

    const userDocRef = doc(db, "users", userAuth.uid);
    let userDocSnap = await getDoc(userDocRef);
    let userFirestoreData = userDocSnap.exists() ? userDocSnap.data() : null;
    let friendIdToUse = userFirestoreData?.friendId;
    let needsFirestoreWrite = false;

    // Estes vêm do Firebase Auth e são usados para o perfil Auth e como fallback para o Firestore
    const authDisplayName = userAuth.displayName || userAuth.email?.split('@')[0] || `Usuário${userAuth.uid.substring(0,5)}`;
    const authPhotoURL = userAuth.photoURL || null; 
    // Não vamos mais usar userAuth.email para salvar no Firestore user document

    if (!userDocSnap.exists()) {
        console.log(`Usuário ${userAuth.uid} não encontrado no Firestore. Criando perfil...`);
        try {
            friendIdToUse = await createUniqueFriendId();
            userFirestoreData = {
                uid: userAuth.uid,
                // REMOVIDO: email: userAuth.email, // Não armazenar email no doc principal do usuário
                displayName: authDisplayName,
                photoURL: authPhotoURL,
                friendId: friendIdToUse,
                scratchUsername: "", // Campo inicializado
                pronouns: "",        // Campo inicializado
                profileDescription: "", // Campo inicializado
                profileTheme: null,  // Inicializa profileTheme
                friendsCount: 0,
                followersCount: 0,
                followingCount: 0,
                createdAt: serverTimestamp()
            };
            await setDoc(userDocRef, userFirestoreData);
            
            const mappingRef = doc(db, "friendIdMappings", friendIdToUse);
            await setDoc(mappingRef, { uid: userAuth.uid });
            console.log(`Perfil e Friend ID ${friendIdToUse} criados para ${userAuth.uid}`);
            needsFirestoreWrite = true; 
        } catch (error) {
            console.error("Erro ao criar perfil de usuário no Firestore ou Friend ID:", error);
            // Retorna os dados construídos (sem email) mesmo em caso de falha parcial,
            // ou null se a falha for crítica na geração do friendId.
            if (error.message === "FRIEND_ID_GENERATION_FAILED") return null;
            return userFirestoreData; 
        }
    } else {
        // Usuário existe, verifica se precisa de atualizações
        const updates = {};
        // Sincroniza displayName e photoURL do Auth para o Firestore se diferentes
        if (userFirestoreData.displayName !== authDisplayName) updates.displayName = authDisplayName;
        if (userFirestoreData.photoURL !== authPhotoURL) updates.photoURL = authPhotoURL;
        // REMOVIDO: if (!userFirestoreData.email && userAuth.email) updates.email = userAuth.email;

        if (!userFirestoreData.friendId) {
            console.log(`Usuário ${userAuth.uid} não tem Friend ID no Firestore. Gerando...`);
            try {
                friendIdToUse = await createUniqueFriendId();
                updates.friendId = friendIdToUse;
                const mappingRef = doc(db, "friendIdMappings", friendIdToUse);
                await setDoc(mappingRef, { uid: userAuth.uid });
                console.log(`Friend ID ${friendIdToUse} gerado e salvo para ${userAuth.uid}`);
            } catch (error) {
                console.error("Erro ao gerar Friend ID para usuário existente:", error);
                // Não crítico o suficiente para parar, mas o friendId pode ficar faltando.
            }
        }
        // Inicializa contadores se não existirem (para perfis antigos que não os tinham)
        if (typeof userFirestoreData.friendsCount !== 'number') updates.friendsCount = 0;
        if (typeof userFirestoreData.followersCount !== 'number') updates.followersCount = 0;
        if (typeof userFirestoreData.followingCount !== 'number') updates.followingCount = 0;
        // Inicializa outros campos se não existirem (para perfis antigos)
        if (typeof userFirestoreData.scratchUsername === 'undefined') updates.scratchUsername = "";
        if (typeof userFirestoreData.pronouns === 'undefined') updates.pronouns = "";
        if (typeof userFirestoreData.profileDescription === 'undefined') updates.profileDescription = "";
        if (typeof userFirestoreData.profileTheme === 'undefined') updates.profileTheme = null;


        if (Object.keys(updates).length > 0) {
            console.log(`Atualizando perfil Firestore (ensureUserProfile) para ${userAuth.uid}:`, updates);
            await updateDoc(userDocRef, updates);
            needsFirestoreWrite = true;
        }
    }
    
    // Se houve escrita ou o documento não existia, recarrega os dados para retornar a versão mais atual
    if (needsFirestoreWrite || !userDocSnap.exists()) { 
        userDocSnap = await getDoc(userDocRef);
        userFirestoreData = userDocSnap.exists() ? userDocSnap.data() : userFirestoreData; // Usa o que foi construído se ainda não existe
    }
    
    // Garante que o UID está no objeto retornado, mesmo que pego do userAuth
    if (userFirestoreData && !userFirestoreData.uid) {
        userFirestoreData.uid = userAuth.uid;
    }

    return userFirestoreData; // Retorna os dados do Firestore (sem o email)
};

export { app, auth, db };