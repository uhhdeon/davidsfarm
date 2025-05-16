// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore,
    doc,
    getDoc,
    setDoc,
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
const generateFriendId = () => Math.floor(100000 + Math.random() * 900000).toString();

const isFriendIdTaken = async (friendId) => {
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
        friendId = generateFriendId();
        taken = await isFriendIdTaken(friendId);
        attempts++;
    }
    if (taken) {
        throw new Error("FRIEND_ID_GENERATION_FAILED"); // Erro customizado
    }
    return friendId;
};

// Função para garantir que o perfil do usuário e o friendId existam no Firestore
export const ensureUserProfileAndFriendId = async (userAuth) => {
    if (!userAuth) return null;

    const userDocRef = doc(db, "users", userAuth.uid);
    let userDocSnap = await getDoc(userDocRef);
    let userFirestoreData = userDocSnap.exists() ? userDocSnap.data() : null;
    let friendIdToUse = userFirestoreData?.friendId;

    let needsUpdate = false;

    if (!userDocSnap.exists()) {
        // Usuário não existe no Firestore, cria o documento
        console.log(`Usuário ${userAuth.uid} não encontrado no Firestore. Criando perfil...`);
        try {
            friendIdToUse = await createUniqueFriendId();
            userFirestoreData = {
                uid: userAuth.uid,
                displayName: userAuth.displayName || userAuth.email.split('@')[0], // Usa parte do email se displayName for nulo
                email: userAuth.email,
                photoURL: userAuth.photoURL || null,
                friendId: friendIdToUse,
                createdAt: serverTimestamp()
            };
            await setDoc(userDocRef, userFirestoreData);
            
            const mappingRef = doc(db, "friendIdMappings", friendIdToUse);
            await setDoc(mappingRef, { uid: userAuth.uid });
            
            console.log(`Perfil e Friend ID ${friendIdToUse} criados para ${userAuth.uid}`);
            needsUpdate = true; // Para recarregar os dados se necessário
        } catch (error) {
            console.error("Erro ao criar perfil de usuário no Firestore ou Friend ID:", error);
            if (error.message === "FRIEND_ID_GENERATION_FAILED") {
                // Lidar com falha na geração do ID de amigo (raro, mas possível)
                // Poderia tentar novamente ou notificar o usuário.
            }
            return userFirestoreData; // Retorna o que tiver, mesmo que incompleto
        }
    } else if (!userFirestoreData.friendId) {
        // Usuário existe, mas não tem friendId (usuário antigo)
        console.log(`Usuário ${userAuth.uid} não tem Friend ID. Gerando...`);
        try {
            friendIdToUse = await createUniqueFriendId();
            await updateDoc(userDocRef, { friendId: friendIdToUse });

            const mappingRef = doc(db, "friendIdMappings", friendIdToUse);
            await setDoc(mappingRef, { uid: userAuth.uid }); // Garante que o mapeamento exista
            
            userFirestoreData.friendId = friendIdToUse; // Atualiza dados em memória
            console.log(`Friend ID ${friendIdToUse} gerado e salvo para ${userAuth.uid}`);
            needsUpdate = true;
        } catch (error) {
            console.error("Erro ao gerar e salvar Friend ID para usuário existente:", error);
            if (error.message === "FRIEND_ID_GENERATION_FAILED") {
                // Lidar com falha
            }
            // Continua com os dados existentes, mesmo sem friendId se a geração falhar
        }
    }
    
    // Se houve criação ou atualização, busca novamente para ter os dados mais recentes.
    if (needsUpdate) {
        userDocSnap = await getDoc(userDocRef);
        userFirestoreData = userDocSnap.exists() ? userDocSnap.data() : userFirestoreData;
    }
    
    return userFirestoreData; // Retorna os dados do Firestore do usuário (com friendId)
};


export { app, auth, db };