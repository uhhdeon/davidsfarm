// play-script.js
import { auth, db } from './firebase-config.js'; // Importa db para buscar o título do projeto
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


document.addEventListener('DOMContentLoaded', () => {
    const userAuthSection = document.querySelector('.user-auth-section');
    const currentYearSpan = document.getElementById('currentYear');
    const siteContent = document.getElementById('site-content');
    const projectTitlePlayPage = document.getElementById('project-title-play-page');
    const embedTargetDiv = document.getElementById('scratch-embed-target');
    const loadingDiv = document.getElementById('play-page-loading');
    const errorDiv = document.getElementById('play-page-error');

    let viewer = null;
    let viewerData = null;

    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (siteContent) setTimeout(() => siteContent.classList.add('visible'), 100); // Revela conteúdo

    const showPlayMessage = (message, type = 'error') => {
        if(loadingDiv) loadingDiv.style.display = 'none';
        if(errorDiv){
            errorDiv.textContent = message;
            errorDiv.className = 'form-message ' + type;
            errorDiv.style.display = 'block';
        }
        if(embedTargetDiv && type === 'error') embedTargetDiv.innerHTML = ''; // Limpa área do iframe em caso de erro
    };

    onAuthStateChanged(auth, async (loggedInUser) => {
        viewer = loggedInUser;
        if (viewer) {
            try {
                const viewerDocSnap = await getDoc(doc(db, "users", viewer.uid));
                if (viewerDocSnap.exists()) viewerData = viewerDocSnap.data();
            } catch (error) { console.error("Erro ao buscar dados do visualizador:", error); }
        }
        if (userAuthSection) {
            if (viewer) {
                const dName = (viewerData?.displayName || viewer.displayName || viewer.email?.split('@')[0]) ?? "Usuário";
                const pUrl = (viewerData?.photoURL || viewer.photoURL) ?? 'imgs/default-avatar.png';
                userAuthSection.innerHTML = `<a href="profile.html" class="user-info-link"><div class="user-info"><img id="user-photo" src="${pUrl}" alt="Foto"><span id="user-name">${dName}</span></div></a>`;
            } else {
                userAuthSection.innerHTML = `<a href="login.html" class="login-button">Login</a>`;
            }
        }
    });

    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');

    async function fetchProjectTitleFromFirestore(projectIdToFind) {
        // Tenta encontrar o projeto em QUALQUER usuário para pegar o título customizado
        // Isso é uma simplificação. Idealmente, você passaria o UID do dono do projeto também,
        // ou teria uma coleção global de projetos se os títulos fossem globais.
        // Por agora, buscamos o primeiro que encontrar com esse projectId.
        try {
            const usersRef = collection(db, "users");
            const usersSnapshot = await getDocs(usersRef);
            for (const userDoc of usersSnapshot.docs) {
                const projectsRef = collection(db, `users/${userDoc.id}/scratchProjects`);
                const q = query(projectsRef, where("projectId", "==", projectIdToFind));
                const projectSnapshot = await getDocs(q);
                if (!projectSnapshot.empty) {
                    return projectSnapshot.docs[0].data().customTitle || "Projeto Scratch";
                }
            }
        } catch (error) {
            console.error("Erro ao buscar título do projeto no Firestore:", error);
        }
        return "Projeto Scratch"; // Fallback
    }


    if (projectId && /^\d+$/.test(projectId)) {
        if (loadingDiv) loadingDiv.style.display = 'block';

        fetchProjectTitleFromFirestore(projectId).then(title => {
            if(projectTitlePlayPage) projectTitlePlayPage.textContent = title;
        });

        const iframe = document.createElement('iframe');
        iframe.src = `https://scratch.mit.edu/projects/${projectId}/embed`;
        iframe.allowTransparency = "true";
        iframe.width = "485"; // Largura padrão do embed do Scratch
        iframe.height = "402"; // Altura padrão do embed do Scratch
        iframe.frameBorder = "0";
        iframe.scrolling = "no";
        iframe.allowFullscreen = true;

        if (embedTargetDiv) {
            embedTargetDiv.appendChild(iframe);
            if(loadingDiv) loadingDiv.style.display = 'none';
        } else {
            showPlayMessage("Erro: Container para o jogo não encontrado.", "error");
        }

    } else {
        showPlayMessage("ID do projeto inválido ou não fornecido.", "error");
        if(projectTitlePlayPage) projectTitlePlayPage.textContent = "Erro";
    }
});