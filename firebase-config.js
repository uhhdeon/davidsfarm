// firebase-config.js
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

    const authDisplayName = userAuth.displayName || userAuth.email.split('@')[0];
    const authPhotoURL = userAuth.photoURL || null;

    if (!userDocSnap.exists()) {
        console.log(`Usuário ${userAuth.uid} não encontrado no Firestore. Criando perfil...`);
        try {
            friendIdToUse = await createUniqueFriendId();
            userFirestoreData = {
                uid: userAuth.uid,
                displayName: authDisplayName,
                // NÃO ARMAZENAR O EMAIL AQUI para perfis públicos
                // email: userAuth.email, << REMOVIDO
                photoURL: authPhotoURL,
                friendId: friendIdToUse,
                scratchUsername: "", // Inicializa campos adicionais
                pronouns: "",
                profileDescription: "",
                createdAt: serverTimestamp()
            };
            await setDoc(userDocRef, userFirestoreData);
            
            const mappingRef = doc(db, "friendIdMappings", friendIdToUse);
            await setDoc(mappingRef, { uid: userAuth.uid });
            console.log(`Perfil e Friend ID ${friendIdToUse} criados para ${userAuth.uid}`);
            needsFirestoreWrite = true; // Para garantir que a leitura subsequente pegue os dados
        } catch (error) {
            console.error("Erro ao criar perfil de usuário no Firestore ou Friend ID:", error);
            return userFirestoreData; 
        }
    } else {
        // Usuário existe, verifica se precisa de atualizações (exceto email)
        const updates = {};
        if (userFirestoreData.displayName !== authDisplayName) updates.displayName = authDisplayName;
        if (userFirestoreData.photoURL !== authPhotoURL) updates.photoURL = authPhotoURL;
        // NÃO ATUALIZAR/ADICIONAR EMAIL AQUI
        // if (userFirestoreData.email !== userAuth.email) updates.email = userAuth.email; << REMOVIDO

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
            }
        }
        if (Object.keys(updates).length > 0) {
            console.log(`Atualizando perfil Firestore para ${userAuth.uid}:`, updates);
            await updateDoc(userDocRef, updates);
            needsFirestoreWrite = true;
        }
    }
    
    if (needsFirestoreWrite || !userDocSnap.exists()) { // Recarrega se algo foi escrito ou se não existia
        userDocSnap = await getDoc(userDocRef);
        userFirestoreData = userDocSnap.exists() ? userDocSnap.data() : userFirestoreData;
    }
    
    return userFirestoreData;
};

export { app, auth, db };