// search-results-script.js
// ATUALIZADO: Busca de pessoas usa displayName_lowercase para eficiência e case-insensitivity.
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, query, where, getDocs, orderBy, limit, startAt, endAt, doc, getDoc, getCountFromServer } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; // Adicionado getCountFromServer se for usar

document.addEventListener('DOMContentLoaded', () => {
    const userAuthSection = document.querySelector('.user-auth-section');
    const currentYearSpan = document.getElementById('currentYear');
    const siteContent = document.getElementById('site-content');
    const resultsTitle = document.getElementById('search-results-title');
    const resultsContainer = document.getElementById('search-results-container');
    const loadingDiv = document.getElementById('search-results-loading');
    const noResultsMessage = document.getElementById('search-no-results-message');

    const popupOverlay = document.getElementById('custom-popup-overlay');
    const popupCloseButton = document.getElementById('custom-popup-close');
    const popupContent = document.getElementById('custom-popup-content');

    let viewer = null;
    let viewerData = null;

    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (siteContent) setTimeout(() => siteContent.classList.add('visible'), 100);

    const openPopup = () => { if (popupOverlay) popupOverlay.classList.add('visible'); };
    const closePopup = () => { if (popupOverlay) popupOverlay.classList.remove('visible'); if (popupContent) popupContent.innerHTML = ''; };
    if (popupCloseButton) popupCloseButton.addEventListener('click', closePopup);
    if (popupOverlay) popupOverlay.addEventListener('click', (e) => { if (e.target === popupOverlay) closePopup(); });


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
    const searchTerm = params.get('term');
    const category = params.get('category');

    if (resultsTitle) {
        if (searchTerm && category) {
            resultsTitle.textContent = `Resultados para "${searchTerm}" em ${category === 'people' ? 'Pessoas' : (category === 'games' ? 'Jogos' : 'Desconhecido')}`;
        } else {
            resultsTitle.textContent = "Pesquisa Inválida";
        }
    }

    async function performSearch() {
        if (!searchTerm || !category) {
            noResultsMessage.textContent = "Termo de pesquisa ou categoria não especificados.";
            noResultsMessage.style.display = 'block';
            return;
        }

        if (loadingDiv) loadingDiv.style.display = 'block';
        resultsContainer.innerHTML = '';
        noResultsMessage.style.display = 'none';

        try {
            if (category === 'people') {
                await searchPeople(searchTerm);
            } else if (category === 'games') {
                await searchGamesInefficient(searchTerm); // Mantendo a ineficiente por enquanto, até resolvermos searchableProjects
            } else if (category === 'groups') {
                noResultsMessage.textContent = "A pesquisa em Grupos ainda não foi implementada.";
                noResultsMessage.style.display = 'block';
            } else {
                noResultsMessage.textContent = "Categoria de pesquisa desconhecida.";
                noResultsMessage.style.display = 'block';
            }
        } catch (error) {
            console.error("Erro ao realizar pesquisa:", error);
            noResultsMessage.textContent = "Ocorreu um erro ao realizar a pesquisa.";
            noResultsMessage.style.display = 'block';
        } finally {
            if (loadingDiv) loadingDiv.style.display = 'none';
        }
    }

    async function searchPeople(term) {
        const searchTermLower = term.toLowerCase();
        const usersRef = collection(db, "users");
        
        // Query OTIMIZADA usando displayName_lowercase
        // Isso requer que o campo 'displayName_lowercase' exista nos seus documentos de usuário
        // e que você tenha um índice nele no Firestore.
        const qUsers = query(usersRef, 
                             orderBy("displayName_lowercase"), 
                             where("displayName_lowercase", ">=", searchTermLower), 
                             where("displayName_lowercase", "<=", searchTermLower + '\uf8ff'), // \uf8ff é um caractere unicode alto para queries de prefixo
                             limit(20)); // Limita a 20 resultados, adicione paginação se necessário

        console.log("Buscando pessoas com query otimizada...");
        const usersSnapshot = await getDocs(qUsers);
        const foundUsers = usersSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

        if (foundUsers.length === 0) {
            noResultsMessage.textContent = `Nenhuma pessoa encontrada para "${term}".`;
            noResultsMessage.style.display = 'block';
        } else {
            renderPeopleResults(foundUsers);
        }
    }

    function renderPeopleResults(users) {
        const ul = document.createElement('ul');
        ul.className = 'user-list'; 
        users.forEach(user => {
            const li = document.createElement('li');
            li.className = 'user-list-item';
            
            const userLink = document.createElement('a');
            userLink.href = `public-profile.html?uid=${user.id}`;
            
            const avatarImg = document.createElement('img');
            avatarImg.src = user.photoURL || 'imgs/default-avatar.png';
            avatarImg.alt = `Avatar de ${user.displayName}`;
            avatarImg.className = 'user-avatar-small';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = user.displayName || 'Usuário Desconhecido';
            
            userLink.append(avatarImg, nameSpan);
            li.appendChild(userLink);
            ul.appendChild(li);
        });
        resultsContainer.appendChild(ul);
    }

    // A função searchGamesInefficient e renderGameResults permanecem como na Etapa 9.1
    // até resolvermos a questão da pesquisa de jogos de forma eficiente.
    async function searchGamesInefficient(term) {
        const searchTermLower = term.toLowerCase();
        const foundGames = [];
        
        console.log("Iniciando busca INEFICIENTE de jogos...");
        if(loadingDiv) loadingDiv.textContent = "Buscando jogos (pode levar um tempo)...";

        const usersCollectionRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollectionRef); 

        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            const projectsRef = collection(db, `users/${userId}/scratchProjects`);
            const projectsSnapshot = await getDocs(projectsRef); 

            projectsSnapshot.forEach(projectDoc => {
                const projectData = projectDoc.data();
                // Assume que customTitle existe. Adiciona customTitle_lowercase ao salvar no profile-script.js
                const projectTitleLower = projectData.customTitle ? projectData.customTitle.toLowerCase() : "";
                if (projectTitleLower.includes(searchTermLower)) {
                    foundGames.push({
                        docId: projectDoc.id, 
                        ...projectData,
                        ownerUid: userId, 
                        ownerDisplayName: userData.displayName || "Autor Desconhecido" 
                    });
                }
            });
             if (foundGames.length >= 20) break; 
        }
        console.log(`Busca ineficiente de jogos concluída. ${foundGames.length} jogos encontrados.`);
        if(loadingDiv) loadingDiv.textContent = "Buscando..."; 

        if (foundGames.length === 0) {
            noResultsMessage.textContent = `Nenhum jogo encontrado para "${term}".`;
            noResultsMessage.style.display = 'block';
        } else {
            renderGameResults(foundGames);
        }
    }

    function renderGameResults(projects) {
        const ul = document.createElement('ul');
        ul.className = 'scratch-projects-list-container public-profile-project-list'; 
        
        projects.forEach(project => {
            const li = document.createElement('li');
            li.className = 'scratch-project-item';
            li.dataset.projectId = project.projectId;

            const imgLink = document.createElement('a');
            imgLink.addEventListener('click', (e) => {
                e.preventDefault(); 
                showProjectDetailsPopup(project); 
            });
            imgLink.style.cursor = 'pointer';


            const img = document.createElement('img');
            img.src = project.thumbnailUrl;
            img.alt = `Thumbnail de ${project.customTitle}`;
            img.onerror = function() { this.src = 'imgs/default-scratch-thumb.png'; this.alt = 'Thumbnail indisponível';};
            imgLink.appendChild(img);
            
            const title = document.createElement('p');
            title.textContent = project.customTitle;
            imgLink.appendChild(title); 

            const authorInfo = document.createElement('p');
            authorInfo.className = 'project-author-search';
            authorInfo.innerHTML = `Por: <a href="public-profile.html?uid=${project.ownerUid}" title="Ver perfil de ${project.ownerDisplayName || 'Autor'}">${project.ownerDisplayName || 'Autor Desconhecido'}</a>`;

            li.append(imgLink, authorInfo);
            ul.appendChild(li);
        });
        resultsContainer.appendChild(ul);
    }
    
    function showProjectDetailsPopup(project) { 
        if (!popupContent || !popupOverlay) return;
        popupContent.innerHTML = `
            <h3>${project.customTitle}</h3>
            <a href="${project.projectUrl}" target="_blank" rel="noopener noreferrer" title="Ver projeto no Scratch">
                <img src="${project.thumbnailUrl}" 
                     alt="Thumbnail de ${project.customTitle}" 
                     onerror="this.src='imgs/default-scratch-thumb.png'; this.alt='Thumbnail indisponível'"
                     style="max-width: 100%; max-height: 240px; object-fit: contain; border-radius: 6px; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto; background-color: #222;">
            </a>
            <p style="text-align:center; font-size:0.9em; margin-bottom:15px;">Por: <a href="public-profile.html?uid=${project.ownerUid}" style="color:#00bfff; text-decoration:none;">${project.ownerDisplayName}</a></p>
            <h4>Descrição Personalizada:</h4>
            <p style="white-space: pre-wrap; max-height: 150px; overflow-y: auto; background: rgba(0,0,0,0.1); padding: 10px; border-radius: 4px; border: 1px solid #444;">
                ${project.customDescription || "Nenhuma descrição fornecida."}
            </p>
            <div class="popup-actions" style="margin-top: 20px; text-align: center; display: flex; justify-content: center; gap: 10px;">
                 <a href="${project.projectUrl}" target="_blank" rel="noopener noreferrer" class="popup-action-button scratch" style="text-decoration:none;">
                    <i class="fas fa-external-link-alt"></i> Ver no Scratch
                 </a>
                 <button id="play-scratch-project-popup-btn" data-projectid="${project.projectId}" class="popup-action-button play">
                    <i class="fas fa-play"></i> Jogue Aqui
                 </button>
            </div>
        `;
        const playButton = popupContent.querySelector('#play-scratch-project-popup-btn');
        if (playButton) {
            playButton.addEventListener('click', () => {
                window.location.href = `play.html?id=${project.projectId}`;
            });
        }
        openPopup();
    }

    if (searchTerm && category) {
        performSearch();
    } else {
        if(loadingDiv) loadingDiv.style.display = 'none';
        noResultsMessage.textContent = "Use a barra de pesquisa na página inicial para buscar.";
        noResultsMessage.style.display = 'block';
    }

    console.log("David's Farm Search Results Script (vCom Busca Otimizada de Pessoas) Carregado!");
});