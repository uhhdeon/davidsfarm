// firebase-config.js
// ATUALIZADO: Adicionado displayName_lowercase ao criar/atualizar perfil no Firestore.
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
    apiKey: "AIzaSyCOoIQ1Wjan1LvkpgdKsY4tmPmZECM8U8w",
    authDomain: "david-farm-e8b9d.firebaseapp.com",
    projectId: "david-farm-e8b9d",
    storageBucket: "david-farm-e8b9d.firebasestorage.app",
    messagingSenderId: "936154396455",
    appId: "1:936154396455:web:4e4fc485f10fe99c705b02",
    measurementId: "G-KL3VR2JFT8"
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

    const authDisplayName = userAuth.displayName || userAuth.email?.split('@')[0] || `Usuário${userAuth.uid.substring(0,5)}`;
    const authPhotoURL = userAuth.photoURL || null; 

    if (!userDocSnap.exists()) {
        console.log(`Usuário ${userAuth.uid} não encontrado no Firestore. Criando perfil...`);
        try {
            friendIdToUse = await createUniqueFriendId();
            userFirestoreData = {
                uid: userAuth.uid,
                displayName: authDisplayName,
                displayName_lowercase: authDisplayName.toLowerCase(), // NOVO CAMPO
                photoURL: authPhotoURL,
                friendId: friendIdToUse,
                scratchUsername: "", 
                pronouns: "",        
                profileDescription: "", 
                profileTheme: null,  
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
            if (error.message === "FRIEND_ID_GENERATION_FAILED") return null;
            return userFirestoreData; 
        }
    } else {
        const updates = {};
        if (userFirestoreData.displayName !== authDisplayName) {
            updates.displayName = authDisplayName;
            updates.displayName_lowercase = authDisplayName.toLowerCase(); // ATUALIZA TAMBÉM
        }
        if (userFirestoreData.photoURL !== authPhotoURL) updates.photoURL = authPhotoURL;

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
        if (typeof userFirestoreData.friendsCount !== 'number') updates.friendsCount = 0;
        if (typeof userFirestoreData.followersCount !== 'number') updates.followersCount = 0;
        if (typeof userFirestoreData.followingCount !== 'number') updates.followingCount = 0;
        if (typeof userFirestoreData.scratchUsername === 'undefined') updates.scratchUsername = "";
        if (typeof userFirestoreData.pronouns === 'undefined') updates.pronouns = "";
        if (typeof userFirestoreData.profileDescription === 'undefined') updates.profileDescription = "";
        if (typeof userFirestoreData.profileTheme === 'undefined') updates.profileTheme = null;
        if (typeof userFirestoreData.displayName_lowercase === 'undefined' && updates.displayName) { // Se displayName_lowercase não existe e estamos atualizando displayName
             updates.displayName_lowercase = updates.displayName.toLowerCase();
        } else if (typeof userFirestoreData.displayName_lowercase === 'undefined' && userFirestoreData.displayName) { // Se não existe mas o displayName original existe
             updates.displayName_lowercase = userFirestoreData.displayName.toLowerCase();
        }


        if (Object.keys(updates).length > 0) {
            console.log(`Atualizando perfil Firestore (ensureUserProfile) para ${userAuth.uid}:`, updates);
            await updateDoc(userDocRef, updates);
            needsFirestoreWrite = true;
        }
    }
    
    if (needsFirestoreWrite || !userDocSnap.exists()) { 
        userDocSnap = await getDoc(userDocRef);
        userFirestoreData = userDocSnap.exists() ? userDocSnap.data() : userFirestoreData; 
    }
    
    if (userFirestoreData && !userFirestoreData.uid) {
        userFirestoreData.uid = userAuth.uid;
    }

    return userFirestoreData; 
};

export { app, auth, db };