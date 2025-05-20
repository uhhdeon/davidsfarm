// gallery-script.js
// VERSÃO ATUAL: Inclui lógica de header e funcionalidade da galeria.
import { auth, db, ensureUserProfileAndFriendId } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    console.log("gallery-script.js: DOMContentLoaded disparado. Iniciando seletores...");

    const siteContent = document.getElementById('site-content');
    const userAuthSection = document.querySelector('.user-auth-section'); // Para o header

    // Seletores da Galeria
    const categorySelectionSection = document.getElementById('category-selection-section');
    const galleryViewSection = document.getElementById('gallery-view-section');
    const btnCatDavidsFarm = document.getElementById('btn-cat-davidsfarm');
    const btnCatPollutionZero = document.getElementById('btn-cat-pollutionzero');
    const galleryCategoryTitle = document.getElementById('gallery-category-title');
    const galleryLoadingDiv = document.getElementById('gallery-loading');
    const galleryErrorDiv = document.getElementById('gallery-error');
    const galleryEmptyDiv = document.getElementById('gallery-empty');
    const galleryCarouselContainer = document.querySelector('.gallery-carousel-container');
    const galleryCounterDiv = document.getElementById('gallery-counter');
    const prevImageBtn = document.getElementById('prev-image-btn');
    const nextImageBtn = document.getElementById('next-image-btn');
    const currentGalleryImage = document.getElementById('current-gallery-image');
    const galleryImageName = document.getElementById('gallery-image-name');
    const galleryImageDescription = document.getElementById('gallery-image-description');
    const galleryImageDate = document.getElementById('gallery-image-date');
    const currentImageIndexSpan = document.getElementById('current-image-index');
    const totalImagesCountSpan = document.getElementById('total-images-count');

    // Estado
    let viewer = null;
    let viewerData = null;
    let currentCategory = null;
    let galleryItems = [];
    let currentIndex = 0;

    // Lógica de animação de entrada da página
    if (siteContent) {
        setTimeout(() => {
            siteContent.classList.add('visible');
            console.log("gallery-script.js: #site-content agora tem a classe .visible");
        }, 100);
    } else {
        console.error("gallery-script.js: ERRO CRÍTICO - #site-content não encontrado!");
    }

    // Lógica de Autenticação e Header
    if (!userAuthSection) {
        console.error("gallery-script.js: ERRO CRÍTICO - .user-auth-section não encontrado no header!");
    }

    onAuthStateChanged(auth, async (user) => {
        viewer = user;
        if (userAuthSection) {
            userAuthSection.innerHTML = ''; // Limpa
            if (user) {
                console.log("gallery-script.js: Usuário logado detectado para o header:", user.uid);
                try {
                    const profileData = await ensureUserProfileAndFriendId(user);
                    if (profileData) {
                        viewerData = profileData;
                        console.log("gallery-script.js: Dados do perfil do Firestore para o header:", viewerData);
                    } else {
                        console.warn("gallery-script.js: ensureUserProfileAndFriendId retornou null. Usando dados do Auth para o header.");
                        viewerData = { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL, email: user.email };
                    }
                    const displayName = viewerData?.displayName || user.displayName || user.email?.split('@')[0] || "Usuário";
                    const photoURL = viewerData?.photoURL || user.photoURL || 'imgs/default-avatar.png';
                    userAuthSection.innerHTML = `
                        <a href="profile.html" class="user-info-link">
                            <div class="user-info">
                                <img id="user-photo" src="${photoURL}" alt="Foto de ${displayName}">
                                <span id="user-name">${displayName}</span>
                            </div>
                        </a>`;
                } catch (error) {
                    console.error("gallery-script.js: Erro ao buscar/processar dados do perfil para o header:", error);
                    const displayName = user.displayName || user.email?.split('@')[0] || "Usuário";
                    const photoURL = user.photoURL || 'imgs/default-avatar.png';
                    userAuthSection.innerHTML = `
                        <a href="profile.html" class="user-info-link">
                            <div class="user-info">
                                <img id="user-photo" src="${photoURL}" alt="Foto de ${displayName}">
                                <span id="user-name">${displayName} (Erro)</span>
                            </div>
                        </a>`;
                    viewerData = { uid: user.uid, displayName: displayName, photoURL: photoURL, email: user.email };
                }
            } else {
                console.log("gallery-script.js: Nenhum usuário logado. Exibindo botão de Login no header.");
                userAuthSection.innerHTML = `<a href="login.html" class="login-button">Login</a>`;
                viewerData = null;
            }
        }
    });
    // Fim da Lógica de Autenticação e Header

    if (!categorySelectionSection) console.error("gallery-script.js: ERRO - #category-selection-section não encontrado!");
    if (!currentGalleryImage) console.error("gallery-script.js: ERRO CRÍTICO - #current-gallery-image não encontrado!");

    function showLoading(isLoading) {
        if (galleryLoadingDiv) galleryLoadingDiv.style.display = isLoading ? 'block' : 'none';
    }

    function showError(message) {
        console.error("Gallery Error:", message);
        hideMessages();
        if (galleryErrorDiv) {
            galleryErrorDiv.textContent = message;
            galleryErrorDiv.style.display = 'block';
        }
        if (galleryCarouselContainer) galleryCarouselContainer.style.display = 'none';
        if (galleryCounterDiv) galleryCounterDiv.style.display = 'none';
        if (galleryViewSection) galleryViewSection.style.display = 'block';
    }

    function showEmptyMessage(categoryNameText) { // Renomeado parâmetro para clareza
        hideMessages();
        if (galleryEmptyDiv) {
            galleryEmptyDiv.textContent = `Nenhuma imagem encontrada para a categoria "${categoryNameText}".`;
            galleryEmptyDiv.style.display = 'block';
        }
        if (galleryCarouselContainer) galleryCarouselContainer.style.display = 'none';
        if (galleryCounterDiv) galleryCounterDiv.style.display = 'none';
        if (galleryViewSection) galleryViewSection.style.display = 'block';
    }

    function hideMessages() {
        if (galleryLoadingDiv) galleryLoadingDiv.style.display = 'none';
        if (galleryErrorDiv) galleryErrorDiv.style.display = 'none';
        if (galleryEmptyDiv) galleryEmptyDiv.style.display = 'none';
    }

    function showGalleryControls(shouldShow) {
        if (galleryCarouselContainer) galleryCarouselContainer.style.display = shouldShow ? 'flex' : 'none';
        if (galleryCounterDiv) galleryCounterDiv.style.display = shouldShow ? 'block' : 'none';
    }

    async function loadGalleryData(category) {
        console.log("gallery-script.js: loadGalleryData para categoria:", category);
        currentCategory = category;
        galleryItems = [];
        currentIndex = 0;

        hideMessages();
        showGalleryControls(false);
        showLoading(true);

        if (categorySelectionSection) categorySelectionSection.style.display = 'none';
        if (galleryViewSection) galleryViewSection.style.display = 'block';

        const categoryNameText = category === 'davidsfarm' ? "David's Farm" : "Pollution Zero";
        if (galleryCategoryTitle) galleryCategoryTitle.textContent = `${categoryNameText}`;

        try {
            const response = await fetch(`./gallery-${category}.json?v=${new Date().getTime()}`);
            if (!response.ok) {
                throw new Error(`Falha ao carregar gallery-${category}.json (Status: ${response.status})`);
            }
            galleryItems = await response.json();
            showLoading(false);

            if (galleryItems.length > 0) {
                showGalleryControls(true);
                displayImage(currentIndex);
            } else {
                showEmptyMessage(categoryNameText);
            }
        } catch (error) {
            console.error("gallery-script.js: Erro ao carregar dados da galeria:", error);
            showLoading(false);
            showError(error.message || "Erro desconhecido ao carregar a galeria.");
        }
    }

    function displayImage(index) {
        if (!galleryItems || galleryItems.length === 0 || index < 0 || index >= galleryItems.length) {
            if (currentCategory) {
                showEmptyMessage(currentCategory === 'davidsfarm' ? "David's Farm" : "Pollution Zero");
            } else {
                showError("Nenhum item para exibir.");
            }
            showGalleryControls(false);
            return;
        }

        hideMessages();
        showGalleryControls(true);
        const item = galleryItems[index];

        if (currentGalleryImage) {
            currentGalleryImage.style.opacity = '0';
            currentGalleryImage.src = `imgs/gallery/${item.arquivoImagem}`;
            currentGalleryImage.alt = item.nome || "Imagem da Galeria";
            currentGalleryImage.onerror = () => {
                showError(`Erro ao carregar: ${item.arquivoImagem}`);
                showGalleryControls(false);
            };
            currentGalleryImage.onload = () => {
                currentGalleryImage.style.opacity = '1';
                currentGalleryImage.classList.remove('image-fade-in'); // Para reiniciar animação CSS
                void currentGalleryImage.offsetWidth; // Trigger reflow
                currentGalleryImage.classList.add('image-fade-in'); // Aplica classe para animar
            };
        } else { return; }

        if (galleryImageName) galleryImageName.textContent = item.nome;
        if (galleryImageDescription) galleryImageDescription.textContent = item.descricao;
        if (galleryImageDate) {
            try {
                const dateObj = new Date(item.data + "T00:00:00Z"); // Tratar como UTC
                galleryImageDate.textContent = dateObj.toLocaleDateString('pt-BR', {
                    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
                });
            } catch (e) { galleryImageDate.textContent = item.data; }
        }

        if (currentImageIndexSpan) currentImageIndexSpan.textContent = index + 1;
        if (totalImagesCountSpan) totalImagesCountSpan.textContent = galleryItems.length;
        if (prevImageBtn) prevImageBtn.disabled = index === 0;
        if (nextImageBtn) nextImageBtn.disabled = index === galleryItems.length - 1;
    }

    if (btnCatDavidsFarm) btnCatDavidsFarm.addEventListener('click', () => loadGalleryData('davidsfarm'));
    if (btnCatPollutionZero) btnCatPollutionZero.addEventListener('click', () => loadGalleryData('pollutionzero'));
    if (prevImageBtn) prevImageBtn.addEventListener('click', () => { if (currentIndex > 0) displayImage(--currentIndex); });
    if (nextImageBtn) nextImageBtn.addEventListener('click', () => { if (currentIndex < galleryItems.length - 1) displayImage(++currentIndex); });

    document.addEventListener('keydown', (event) => {
        if (galleryViewSection && galleryViewSection.style.display !== 'none' && galleryItems && galleryItems.length > 0) {
            if (event.key === 'ArrowLeft' && prevImageBtn && !prevImageBtn.disabled) prevImageBtn.click();
            else if (event.key === 'ArrowRight' && nextImageBtn && !nextImageBtn.disabled) nextImageBtn.click();
        }
    });

    function initializePage() {
        console.log("gallery-script.js: Inicializando página da galeria...");
        if (categorySelectionSection) {
            categorySelectionSection.style.display = 'block';
        } else {
            document.body.innerHTML = '<p style="color:white; text-align:center; padding-top: 50px;">Erro: #category-selection-section não encontrada.</p>';
            return;
        }
        if (galleryViewSection) galleryViewSection.style.display = 'none';
        hideMessages();
        showGalleryControls(false);
        if (galleryCategoryTitle) galleryCategoryTitle.textContent = '';
        if (currentGalleryImage) currentGalleryImage.src = "";
        if (galleryImageName) galleryImageName.textContent = "";
        if (galleryImageDescription) galleryImageDescription.textContent = "";
        if (galleryImageDate) galleryImageDate.textContent = "";
        if (currentImageIndexSpan) currentImageIndexSpan.textContent = "0";
        if (totalImagesCountSpan) totalImagesCountSpan.textContent = "0";
        console.log("gallery-script.js: Página da galeria inicializada.");
    }

    initializePage();
    console.log("gallery-script.js: Script carregado e finalizado.");
});