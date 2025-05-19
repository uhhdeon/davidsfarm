// public-profile-script.js
// ETAPA 6: Adicionando botão "Jogue Aqui" ao pop-up de detalhes do projeto.

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc, getDoc, setDoc, deleteDoc, updateDoc, runTransaction, serverTimestamp, writeBatch, increment,
    collection, getDocs, query, orderBy, getCountFromServer 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores DOM (todos os anteriores) ---
    const userAuthSection = document.querySelector('.user-auth-section');
    const currentYearSpan = document.getElementById('currentYear');
    const siteContent = document.getElementById('site-content');
    const profileLoadingDiv = document.getElementById('public-profile-loading');
    const publicProfileMainElement = document.querySelector('main.public-profile-main');
    const profileContentDiv = document.getElementById('public-profile-content');
    const profileErrorDiv = document.getElementById('public-profile-error');
    const profilePagePhoto = document.getElementById('profile-page-photo');
    const profilePageDisplayName = document.getElementById('profile-page-displayName');
    const profilePageScratchLink = document.getElementById('profile-page-scratch-link');
    const profilePageScratchUsername = document.getElementById('profile-page-scratchUsername');
    const profilePagePronouns = document.getElementById('profile-page-pronouns');
    const profilePageDescriptionText = document.getElementById('profile-page-description');
    const friendActionButtonContainer = document.getElementById('profile-friend-action-button-container');
    const friendActionMessage = document.getElementById('friend-action-message');
    const profileDescriptionSection = document.querySelector('.profile-description-section');
    const profileDescriptionSectionTitle = profileDescriptionSection?.querySelector('h3');
    const friendsCountSpan = document.getElementById('friends-count');
    const followersCountSpan = document.getElementById('followers-count');
    const followingCountSpan = document.getElementById('following-count');
    const statsFriendsLink = document.getElementById('stats-friends-link');
    const statsFollowersLink = document.getElementById('stats-followers-link');
    const statsFollowingLink = document.getElementById('stats-following-link');
    const moreOptionsButton = document.getElementById('profile-more-options-btn');
    const optionsPopup = document.getElementById('profile-options-popup');
    const publicScratchProjectsLoadingDiv = document.getElementById('public-scratch-projects-loading');
    const publicScratchProjectsListUl = document.getElementById('public-scratch-projects-list');
    const publicScratchProjectsEmptyMessageP = document.getElementById('public-scratch-projects-empty-message');
    const popupOverlay = document.getElementById('custom-popup-overlay');
    const popupCloseButton = document.getElementById('custom-popup-close');
    const popupContent = document.getElementById('custom-popup-content');

    let viewer = null;
    let viewedUserUid = null;
    let viewedUserData = null; 
    let viewerData = null;
    let isFollowingViewedUser = false;
    let soundwaveParticlesInterval = null;

    // ... (Funções utilitárias como showMessage, rgbStringToComponents, etc., são as mesmas) ...
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (siteContent) setTimeout(() => siteContent.classList.add('visible'), 100);

    const showMessage = (element, message, type = 'error', duration = 5000) => {
        if (!element) return; element.textContent = message;
        element.className = 'form-message ' + (type === 'success' ? 'success' : 'error');
        element.style.display = 'block';
        setTimeout(() => { if (element) { element.style.display = 'none'; element.textContent = ''; }}, duration);
    };
    function rgbStringToComponents(rgbString) {
        if (!rgbString || !rgbString.startsWith('rgb')) return { r: 26, g: 26, b: 26 };
        const result = rgbString.match(/\d+/g);
        if (result && result.length === 3) return { r: parseInt(result[0]), g: parseInt(result[1]), b: parseInt(result[2]) };
        return { r: 26, g: 26, b: 26 };
    }
    function lightenDarkenColor(colorObj, percent) {
        const newR = Math.max(0, Math.min(255, Math.round(colorObj.r * (1 + percent))));
        const newG = Math.max(0, Math.min(255, Math.round(colorObj.g * (1 + percent))));
        const newB = Math.max(0, Math.min(255, Math.round(colorObj.b * (1 + percent))));
        return `rgb(${newR},${newG},${newB})`;
    }
    function calculateLuminance(colorObj) {
        const r = colorObj.r / 255, g = colorObj.g / 255, b = colorObj.b / 255;
        const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function getDynamicAccentColor(baseAccentRgbString, mainBgRgbString) {
        const baseAccentObj = rgbStringToComponents(baseAccentRgbString);
        const mainBgLuminance = calculateLuminance(rgbStringToComponents(mainBgRgbString));
        const accentLuminance = calculateLuminance(baseAccentObj);
        if (mainBgLuminance > 0.6) { if (accentLuminance > 0.5) return lightenDarkenColor(baseAccentObj, -0.45); return `rgb(${baseAccentObj.r},${baseAccentObj.g},${baseAccentObj.b})`; }
        else { if (accentLuminance < 0.35) return lightenDarkenColor(baseAccentObj, 0.6); return `rgb(${baseAccentObj.r},${baseAccentObj.g},${baseAccentObj.b})`; }
    }
    function setTextContrastAndAccents(primaryBgColorString, accentBaseColorString) {
        if (!publicProfileMainElement) return;
        const bgColorObj = rgbStringToComponents(primaryBgColorString); const luminance = calculateLuminance(bgColorObj);
        const dynamicAccent = getDynamicAccentColor(accentBaseColorString, primaryBgColorString);
        if (luminance > 0.5) { publicProfileMainElement.classList.remove('text-theme-light'); publicProfileMainElement.classList.add('text-theme-dark'); }
        else { publicProfileMainElement.classList.remove('text-theme-dark'); publicProfileMainElement.classList.add('text-theme-light'); }
        if (profilePagePhoto) profilePagePhoto.style.borderColor = dynamicAccent;
        if (profilePageScratchLink) profilePageScratchLink.style.color = dynamicAccent;
        if (profileDescriptionSectionTitle) { if (luminance > 0.5) profileDescriptionSectionTitle.style.color = '#1f2328'; else profileDescriptionSectionTitle.style.color = '#FFFFFF'; }
    }
    function createSoundwaveParticle() {
        let particlesContainer = document.getElementById('background-soundwave-particles');
        if (!particlesContainer) {
            particlesContainer = document.createElement('div');
            particlesContainer.id = 'background-soundwave-particles';
            particlesContainer.style.position = 'fixed'; particlesContainer.style.top = '0'; particlesContainer.style.left = '0';
            particlesContainer.style.width = '100%'; particlesContainer.style.height = '100%';
            particlesContainer.style.zIndex = '-2'; particlesContainer.style.overflow = 'hidden';
            document.body.prepend(particlesContainer);
        }
        const particle = document.createElement('div'); particle.className = 'soundwave-particle';
        particle.style.position = 'absolute'; particle.style.left = `${Math.random() * 100}%`; particle.style.bottom = '-50px';
        particle.style.width = `${Math.random() * 3 + 1}px`; particle.style.height = `${Math.random() * 60 + 20}px`;
        particle.style.backgroundColor = `rgba(200, 200, 200, ${Math.random() * 0.1 + 0.02})`;
        particle.style.animationName = 'soundwaveRise'; particle.style.animationDuration = `${Math.random() * 8 + 5}s`;
        particle.style.animationTimingFunction = 'linear'; particle.style.animationIterationCount = '1';
        particle.style.animationDelay = `${Math.random() * 2}s`;
        particlesContainer.appendChild(particle);
        particle.addEventListener('animationend', () => particle.remove());
    }
    function startSoundwaveParticles(intervalMs = 300) { if (soundwaveParticlesInterval) clearInterval(soundwaveParticlesInterval); soundwaveParticlesInterval = setInterval(createSoundwaveParticle, intervalMs); }
    function stopSoundwaveParticles() { if (soundwaveParticlesInterval) clearInterval(soundwaveParticlesInterval); const container = document.getElementById('background-soundwave-particles'); if(container) container.innerHTML = '';}
    const applyPageBackgroundAndParticles = (baseColorRgbString) => {
        const body = document.body; if (baseColorRgbString) { const bgColorObj = rgbStringToComponents(baseColorRgbString); body.style.backgroundColor = lightenDarkenColor(bgColorObj, -0.55); startSoundwaveParticles(); }
        else { body.style.backgroundColor = ''; stopSoundwaveParticles(); }
    };
    const applyPublicProfileTheme = (theme) => {
        if (!publicProfileMainElement) return; let primaryBgColorForContrast = 'rgb(37,37,37)'; let accentBaseColor = 'rgb(0, 191, 255)';
        let siteBaseColorForPageBg = viewedUserData?.profileTheme?.siteBaseColor || null;
        if (!theme) {
            publicProfileMainElement.style.background = ''; publicProfileMainElement.style.backgroundImage = '';
            if (profileDescriptionSection) { profileDescriptionSection.style.background = ''; profileDescriptionSection.style.backgroundImage = '';}
            siteBaseColorForPageBg = 'rgb(26, 26, 26)';
        } else {
            siteBaseColorForPageBg = theme.siteBaseColor || (theme.type === 'solid' ? theme.color : theme.color1);
            if (theme.type === 'solid') {
                publicProfileMainElement.style.backgroundImage = 'none'; publicProfileMainElement.style.backgroundColor = theme.color;
                primaryBgColorForContrast = theme.color; accentBaseColor = theme.color;
                if (profileDescriptionSection) { const lighterColor = lightenDarkenColor(rgbStringToComponents(theme.color), 0.12); profileDescriptionSection.style.backgroundImage = 'none'; profileDescriptionSection.style.backgroundColor = lighterColor;}
            } else if (theme.type === 'gradient') {
                publicProfileMainElement.style.backgroundColor = 'transparent'; publicProfileMainElement.style.backgroundImage = `linear-gradient(to bottom, ${theme.color1}, ${theme.color2})`;
                primaryBgColorForContrast = theme.color1; accentBaseColor = theme.color1;
                if (profileDescriptionSection) { const lighterC1 = lightenDarkenColor(rgbStringToComponents(theme.color1), 0.15); const lighterC2 = lightenDarkenColor(rgbStringToComponents(theme.color2), 0.10); profileDescriptionSection.style.backgroundColor = 'transparent'; profileDescriptionSection.style.backgroundImage = `linear-gradient(to bottom, ${lighterC1}, ${lighterC2})`;}
            }
        }
        setTextContrastAndAccents(primaryBgColorForContrast, accentBaseColor);
        applyPageBackgroundAndParticles(siteBaseColorForPageBg);
    };
    const openPopup = () => { if (popupOverlay) popupOverlay.classList.add('visible'); };
    const closePopup = () => { if (popupOverlay) popupOverlay.classList.remove('visible'); if (popupContent) popupContent.innerHTML = ''; };
    if (popupCloseButton) popupCloseButton.addEventListener('click', closePopup);
    if (popupOverlay) popupOverlay.addEventListener('click', (e) => { if (e.target === popupOverlay) closePopup(); });

    async function getSubcollectionCount(userUid, subcollectionName) {
        if (!userUid || !subcollectionName) return 0;
        try {
            const subcollectionRef = collection(db, `users/${userUid}/${subcollectionName}`);
            const snapshot = await getCountFromServer(query(subcollectionRef));
            return snapshot.data().count;
        } catch (error) {
            console.error(`Erro ao contar ${subcollectionName} para ${userUid}:`, error);
            return 0;
        }
    }

    onAuthStateChanged(auth, async (loggedInUser) => {
        viewer = loggedInUser;
        if (viewer) {
            try {
                const viewerDocSnap = await getDoc(doc(db, "users", viewer.uid));
                if (viewerDocSnap.exists()) {
                    viewerData = viewerDocSnap.data();
                    viewerData.uid = viewer.uid; 
                    viewerData.friendsCount = viewerData.friendsCount || 0;
                    viewerData.followersCount = viewerData.followersCount || 0;
                    viewerData.followingCount = viewerData.followingCount || 0;
                } else { 
                    console.warn(`Documento do visualizador ${viewer.uid} não encontrado no Firestore.`);
                    viewerData = {
                        uid: viewer.uid,
                        displayName: viewer.displayName || viewer.email?.split('@')[0] || "Usuário",
                        photoURL: viewer.photoURL || 'imgs/default-avatar.png',
                        email: viewer.email, 
                        friendsCount: 0, followersCount: 0, followingCount: 0 
                    };
                }
            } catch (error) {
                console.error("Erro ao buscar dados do visualizador:", error);
                viewerData = null; 
            }
        } else {
            viewerData = null;
        }

        if (userAuthSection) {
            if (viewer && viewerData) {
                const dName = (viewerData.displayName || viewer.displayName || viewer.email?.split('@')[0]) ?? "Usuário";
                const pUrl = (viewerData.photoURL || viewer.photoURL) ?? 'imgs/default-avatar.png';
                userAuthSection.innerHTML = `<a href="profile.html" class="user-info-link"><div class="user-info"><img id="user-photo" src="${pUrl}" alt="Foto"><span id="user-name">${dName}</span></div></a>`;
            } else if (viewer) { 
                 const dName = (viewer.displayName || viewer.email?.split('@')[0]) ?? "Usuário";
                 const pUrl = viewer.photoURL ?? 'imgs/default-avatar.png';
                 userAuthSection.innerHTML = `<a href="profile.html" class="user-info-link"><div class="user-info"><img id="user-photo" src="${pUrl}" alt="Foto"><span id="user-name">${dName}</span></div></a>`;
            } else {
                userAuthSection.innerHTML = `<a href="login.html" class="login-button">Login</a>`;
            }
        }
        await loadPublicProfile();
    });

    async function loadPublicProfile() {
        const params = new URLSearchParams(window.location.search); viewedUserUid = params.get('uid');
        if (!viewedUserUid) {
            if(profileLoadingDiv) profileLoadingDiv.style.display = 'none';
            showMessage(profileErrorDiv, 'Perfil não especificado.');
            applyPageBackgroundAndParticles(null);
            return;
        }

        if(profileLoadingDiv) profileLoadingDiv.style.display = 'block';
        if(profileContentDiv) profileContentDiv.style.display = 'none';
        if(profileErrorDiv) profileErrorDiv.style.display = 'none';
        if(publicScratchProjectsLoadingDiv) publicScratchProjectsLoadingDiv.style.display = 'block'; 
        if(publicScratchProjectsListUl) publicScratchProjectsListUl.innerHTML = '';
        if(publicScratchProjectsEmptyMessageP) publicScratchProjectsEmptyMessageP.style.display = 'none';

        try {
            const userDocSnap = await getDoc(doc(db, "users", viewedUserUid));
            if (userDocSnap.exists()) {
                viewedUserData = userDocSnap.data();
                viewedUserData.uid = viewedUserUid; 

                if(profilePagePhoto) profilePagePhoto.src = viewedUserData.photoURL || 'imgs/default-avatar.png';
                if(profilePageDisplayName) profilePageDisplayName.textContent = viewedUserData.displayName || 'Usuário Anônimo';
                if (viewedUserData.scratchUsername && profilePageScratchLink && profilePageScratchUsername) {
                    profilePageScratchUsername.textContent = `@${viewedUserData.scratchUsername}`;
                    profilePageScratchLink.href = `https://scratch.mit.edu/users/${viewedUserData.scratchUsername}/`;
                    profilePageScratchLink.style.display = 'inline';
                } else if (profilePageScratchLink) {
                    profilePageScratchLink.style.display = 'none';
                }
                if(profilePagePronouns) profilePagePronouns.textContent = viewedUserData.pronouns || '';
                if(profilePageDescriptionText) profilePageDescriptionText.textContent = viewedUserData.profileDescription || 'Nenhuma descrição.';

                const [actualFriendsCount, actualFollowersCount, actualFollowingCount] = await Promise.all([
                    getSubcollectionCount(viewedUserUid, 'friends'),
                    getSubcollectionCount(viewedUserUid, 'followers'),
                    getSubcollectionCount(viewedUserUid, 'following')
                ]);

                if(friendsCountSpan) friendsCountSpan.textContent = actualFriendsCount;
                if(followersCountSpan) followersCountSpan.textContent = actualFollowersCount;
                if(followingCountSpan) followingCountSpan.textContent = actualFollowingCount;

                viewedUserData.friendsCount = actualFriendsCount;
                viewedUserData.followersCount = actualFollowersCount;
                viewedUserData.followingCount = actualFollowingCount;

                if(statsFriendsLink) statsFriendsLink.href = `connections.html?uid=${viewedUserUid}&tab=friends`;
                if(statsFollowersLink) statsFollowersLink.href = `connections.html?uid=${viewedUserUid}&tab=followers`;
                if(statsFollowingLink) statsFollowingLink.href = `connections.html?uid=${viewedUserUid}&tab=following`;

                applyPublicProfileTheme(viewedUserData.profileTheme || null);
                if(profileLoadingDiv) profileLoadingDiv.style.display = 'none';
                if(profileContentDiv) profileContentDiv.style.display = 'block';

                await loadAndRenderPublicScratchProjects(viewedUserUid);

                if (viewer && viewedUserUid && viewer.uid !== viewedUserUid) {
                    await checkFollowingStatus();
                }
                populateOptionsPopup();
                updateFriendActionButton();

            } else {
                if(profileLoadingDiv) profileLoadingDiv.style.display = 'none';
                showMessage(profileErrorDiv, 'Perfil não encontrado.');
                applyPageBackgroundAndParticles(null);
                if(publicScratchProjectsLoadingDiv) publicScratchProjectsLoadingDiv.style.display = 'none';
            }
        } catch (error) {
            console.error("Erro ao carregar perfil público:", error);
            if(profileLoadingDiv) profileLoadingDiv.style.display = 'none';
            showMessage(profileErrorDiv, 'Erro ao carregar o perfil.');
            applyPageBackgroundAndParticles(null);
            if(publicScratchProjectsLoadingDiv) publicScratchProjectsLoadingDiv.style.display = 'none';
        }
    }

    async function loadAndRenderPublicScratchProjects(targetUserUid) {
        if (!targetUserUid) return;
        if (publicScratchProjectsLoadingDiv) publicScratchProjectsLoadingDiv.style.display = 'block';
        if (publicScratchProjectsEmptyMessageP) publicScratchProjectsEmptyMessageP.style.display = 'none';
        if (publicScratchProjectsListUl) publicScratchProjectsListUl.innerHTML = '';

        try {
            const projectsRef = collection(db, `users/${targetUserUid}/scratchProjects`);
            const qProjects = query(projectsRef, orderBy("orderIndex", "asc"), orderBy("addedAt", "desc"));
            const snapshot = await getDocs(qProjects);
            
            const projects = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
            renderPublicScratchProjects(projects);

        } catch (error) {
            console.error("Erro ao carregar projetos Scratch do perfil público:", error);
            if (publicScratchProjectsListUl) publicScratchProjectsListUl.innerHTML = `<li class="list-placeholder error">Falha ao carregar projetos.</li>`;
        } finally {
            if (publicScratchProjectsLoadingDiv) publicScratchProjectsLoadingDiv.style.display = 'none';
        }
    }

    function renderPublicScratchProjects(projects) {
        if (!publicScratchProjectsListUl || !publicScratchProjectsEmptyMessageP) return;
        publicScratchProjectsListUl.innerHTML = '';

        if (projects.length === 0) {
            publicScratchProjectsEmptyMessageP.style.display = 'block';
            return;
        }
        publicScratchProjectsEmptyMessageP.style.display = 'none';

        projects.forEach(project => {
            const li = document.createElement('li');
            li.className = 'scratch-project-item';
            li.dataset.projectId = project.projectId;

            const imgLink = document.createElement('a');
            imgLink.href = project.projectUrl;
            imgLink.target = "_blank";
            imgLink.rel = "noopener noreferrer";
            imgLink.title = `Ver "${project.customTitle}" no Scratch`;

            const img = document.createElement('img');
            img.src = project.thumbnailUrl;
            img.alt = `Thumbnail de ${project.customTitle}`;
            img.onerror = function() { this.src = 'imgs/default-scratch-thumb.png'; this.alt = 'Thumbnail indisponível';};
            imgLink.appendChild(img);
            
            const title = document.createElement('p');
            title.textContent = project.customTitle;

            li.append(imgLink, title);

            li.addEventListener('click', () => { 
                if (!popupContent) return;
                popupContent.innerHTML = `
                    <h3>${project.customTitle}</h3>
                    <a href="${project.projectUrl}" target="_blank" rel="noopener noreferrer" title="Ver projeto no Scratch">
                        <img src="${project.thumbnailUrl}" 
                             alt="Thumbnail de ${project.customTitle}" 
                             onerror="this.src='imgs/default-scratch-thumb.png'; this.alt='Thumbnail indisponível'"
                             style="max-width: 100%; max-height: 240px; object-fit: contain; border-radius: 6px; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto; background-color: #222;">
                    </a>
                    <h4>Descrição:</h4>
                    <p style="white-space: pre-wrap; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.1); padding: 10px; border-radius: 4px; border: 1px solid #444;">
                        ${project.customDescription || "Nenhuma descrição fornecida."}
                    </p>
                    <div class="popup-actions" style="margin-top: 20px; text-align: center; display: flex; justify-content: center; gap: 10px;">
                         <a href="${project.projectUrl}" target="_blank" rel="noopener noreferrer" class="popup-action-button scratch" style="text-decoration:none;">
                            <i class="fas fa-external-link-alt"></i> Ver no Scratch
                         </a>
                         <button id="play-scratch-project-popup-btn" class="popup-action-button play">
                            <i class="fas fa-play"></i> Jogue Aqui
                         </button>
                    </div>
                `;
                // Adiciona event listener para o novo botão "Jogue Aqui"
                const playButton = popupContent.querySelector('#play-scratch-project-popup-btn');
                if (playButton) {
                    playButton.addEventListener('click', () => {
                        window.location.href = `play.html?id=${project.projectId}`;
                    });
                }
                openPopup();
            });
            publicScratchProjectsListUl.appendChild(li);
        });
    }

    // ... (Funções populateOptionsPopup, checkFollowingStatus, handleFollowUnfollow e de amizade) ...
    function populateOptionsPopup() {
        if (!optionsPopup || !viewedUserData) return;
        optionsPopup.innerHTML = ''; 

        if (viewer && viewer.uid !== viewedUserUid) {
            const followBtn = document.createElement('button');
            followBtn.className = 'options-popup-item';
            followBtn.id = 'popup-follow-unfollow-btn';
            followBtn.innerHTML = `<i class="fas ${isFollowingViewedUser ? 'fa-user-minus' : 'fa-user-plus'}"></i> ${isFollowingViewedUser ? 'Deixar de Seguir' : 'Seguir'} ${viewedUserData.displayName || 'usuário'}`;
            followBtn.addEventListener('click', handleFollowUnfollow);
            optionsPopup.appendChild(followBtn);
        }

        if (viewedUserData.scratchUsername) {
            if (optionsPopup.children.length > 0) { 
                const sep = document.createElement('div'); sep.className = 'options-popup-separator'; optionsPopup.appendChild(sep);
            }
            const scratchL = document.createElement('a'); 
            scratchL.className = 'options-popup-item'; 
            scratchL.href = `https://scratch.mit.edu/users/${viewedUserData.scratchUsername}/`;
            scratchL.target = '_blank';
            scratchL.rel = 'noopener noreferrer';
            scratchL.innerHTML = `<i class="fas fa-external-link-alt"></i> Ver perfil no Scratch`;
            optionsPopup.appendChild(scratchL);
        }

        if (optionsPopup.children.length === 0) {
            const noOpt = document.createElement('div');
            noOpt.className = 'options-popup-item';
            noOpt.textContent = 'Nenhuma ação disponível';
            noOpt.style.fontStyle = 'italic';
            noOpt.style.color = '#7f8c8d'; 
            optionsPopup.appendChild(noOpt);
        }
    }

    if (moreOptionsButton && optionsPopup) {
        moreOptionsButton.addEventListener('click', async (event) => { 
            event.stopPropagation();
            if (optionsPopup.classList.contains('visible')) {
                optionsPopup.classList.remove('visible');
            } else {
                if (viewer && viewedUserUid && viewer.uid !== viewedUserUid) {
                    await checkFollowingStatus(); 
                }
                populateOptionsPopup(); 
                optionsPopup.classList.add('visible');
            }
        });
        document.addEventListener('click', (event) => {
            if (optionsPopup.classList.contains('visible') &&
                !optionsPopup.contains(event.target) &&
                event.target !== moreOptionsButton &&
                !moreOptionsButton.contains(event.target) 
            ) {
                optionsPopup.classList.remove('visible');
            }
        });
    }

    async function checkFollowingStatus() {
        isFollowingViewedUser = false; 
        if (viewer && viewedUserUid && viewer.uid !== viewedUserUid) {
            const followingRef = doc(db, `users/${viewer.uid}/following/${viewedUserUid}`);
            try {
                const docSnap = await getDoc(followingRef);
                isFollowingViewedUser = docSnap.exists();
            } catch (e) {
                console.error("Erro ao verificar status de 'seguindo':", e);
                isFollowingViewedUser = false; 
            }
        }
    }

    async function handleFollowUnfollow() {
        if (!viewer || !viewer.uid || !viewerData || !viewerData.uid || !viewedUserUid || !viewedUserData || !viewedUserData.uid) {
            showMessage(friendActionMessage, "Ação inválida. Dados do usuário ou do perfil visualizado estão incompletos.", "error");
            console.error("handleFollowUnfollow: Dados incompletos", { viewer, viewerData, viewedUserUid, viewedUserData });
            return;
        }
        if (viewer.uid === viewedUserUid) {
            showMessage(friendActionMessage, "Você não pode seguir a si mesmo.", "error");
            return;
        }

        const actionText = isFollowingViewedUser ? "Deixar de seguir" : "Seguir";
        showMessage(friendActionMessage, `${actionText.replace('ar de s', 'ando').replace('ir', 'indo')}...`, "success", 3000);
        if(optionsPopup) optionsPopup.classList.remove('visible');

        const viewerFollowingRef = doc(db, `users/${viewer.uid}/following/${viewedUserData.uid}`); 
        const viewedUserFollowersRef = doc(db, `users/${viewedUserData.uid}/followers/${viewer.uid}`); 
        const viewerDocRef = doc(db, "users", viewer.uid);

        const wasFollowing = isFollowingViewedUser; 

        try {
            await runTransaction(db, async (transaction) => {
                const currentViewerDisplayName = viewerData.displayName || viewer.displayName || viewer.email?.split('@')[0] || "Usuário";
                const currentViewerPhotoURL = viewerData.photoURL || viewer.photoURL || 'imgs/default-avatar.png';

                if (wasFollowing) { 
                    transaction.delete(viewerFollowingRef);
                    transaction.delete(viewedUserFollowersRef);
                    transaction.update(viewerDocRef, { followingCount: increment(-1) });
                } else { 
                    transaction.set(viewerFollowingRef, {
                        timestamp: serverTimestamp(),
                        displayName: viewedUserData.displayName || "Usuário",
                        photoURL: viewedUserData.photoURL || 'imgs/default-avatar.png'
                    });
                    transaction.set(viewedUserFollowersRef, {
                        timestamp: serverTimestamp(),
                        displayName: currentViewerDisplayName,
                        photoURL: currentViewerPhotoURL
                    });
                    transaction.update(viewerDocRef, { followingCount: increment(1) });
                }
            });

            isFollowingViewedUser = !wasFollowing; 

            if (viewerData) {
                viewerData.followingCount = (viewerData.followingCount || 0) + (isFollowingViewedUser ? 1 : -1);
            }
            
            if (viewedUserData) {
                const newFollowersCount = await getSubcollectionCount(viewedUserData.uid, 'followers');
                viewedUserData.followersCount = newFollowersCount;
                if(followersCountSpan) followersCountSpan.textContent = newFollowersCount;
            }

            showMessage(friendActionMessage, isFollowingViewedUser ? `Agora você segue ${viewedUserData.displayName || 'este usuário'}!` : `Você deixou de seguir ${viewedUserData.displayName || 'este usuário'}.`, "success");
            populateOptionsPopup(); 
        } catch (error) {
            console.error("Erro ao seguir/deixar de seguir:", error);
            showMessage(friendActionMessage, `Erro: ${error.message || "Falha na operação."}. Verifique as permissões do Firestore.`, "error");
        }
    }
    
    async function updateFriendActionButton() {
        if (!friendActionButtonContainer) { console.warn("friendActionButtonContainer não encontrado"); return; }
        friendActionButtonContainer.innerHTML = ''; 

        if (!viewer || !viewer.uid || !viewedUserData || !viewedUserData.uid) {
            if (viewer && viewer.uid && viewedUserUid && viewer.uid === viewedUserUid) {
                friendActionButtonContainer.innerHTML = `<a href="profile.html" class="profile-action-button edit">Editar Meu Perfil</a>`;
            }
            return;
        }
        if (viewer.uid === viewedUserData.uid) {
            friendActionButtonContainer.innerHTML = `<a href="profile.html" class="profile-action-button edit">Editar Meu Perfil</a>`;
            return;
        }

        const currentViewerDataForAction = viewerData || {
            displayName: viewer.displayName || viewer.email?.split('@')[0] || "Usuário",
            photoURL: viewer.photoURL || 'imgs/default-avatar.png'
        };
        if (!viewerData) { 
            console.warn("updateFriendActionButton: viewerData não totalmente carregado, usando fallback do Auth.");
        }

        try {
            const friendRef = doc(db, `users/${viewer.uid}/friends/${viewedUserData.uid}`);
            const sentRequestRef = doc(db, `users/${viewer.uid}/friendRequestsSent/${viewedUserData.uid}`);
            const receivedRequestRef = doc(db, `users/${viewer.uid}/friendRequestsReceived/${viewedUserData.uid}`);

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
                friendActionButtonContainer.innerHTML = `<div class="profile-action-buttons-group"><button id="accept-request-public-btn" class="profile-action-button accept">Aceitar Pedido</button><button id="decline-request-public-btn" class="profile-action-button decline">Recusar Pedido</button></div>`;
                document.getElementById('accept-request-public-btn')?.addEventListener('click', () => handleAcceptRequest(currentViewerDataForAction));
                document.getElementById('decline-request-public-btn')?.addEventListener('click', handleDeclineRequest);
            } else {
                friendActionButtonContainer.innerHTML = `<button id="add-friend-public-btn" class="profile-action-button add">Adicionar Amigo</button>`;
                document.getElementById('add-friend-public-btn')?.addEventListener('click', () => handleAddFriend(currentViewerDataForAction));
            }
        } catch (error) {
            console.error("Erro ao verificar status de amizade:", error);
            showMessage(friendActionMessage, "Erro ao carregar ações de amizade.", "error");
        }
    }

    async function handleAddFriend(currentViewerDataForAction) {
        if (!viewer || !viewer.uid || !viewedUserData || !viewedUserData.uid || !currentViewerDataForAction) {
            showMessage(friendActionMessage, "Erro: Dados do usuário ou do perfil visualizado estão incompletos."); return;
        }
        showMessage(friendActionMessage, "Enviando pedido...", "success");
        const batch = writeBatch(db);
        try {
            const sentRef = doc(db, `users/${viewer.uid}/friendRequestsSent`, viewedUserData.uid);
            batch.set(sentRef, {
                timestamp: serverTimestamp(),
                receiverUid: viewedUserData.uid, 
                receiverName: viewedUserData.displayName || "Usuário", 
                receiverPhotoURL: viewedUserData.photoURL || 'imgs/default-avatar.png'
            });
            const receivedRef = doc(db, `users/${viewedUserData.uid}/friendRequestsReceived`, viewer.uid);
            batch.set(receivedRef, {
                timestamp: serverTimestamp(),
                senderUid: viewer.uid, 
                senderName: currentViewerDataForAction.displayName, 
                senderPhotoURL: currentViewerDataForAction.photoURL
            });
            await batch.commit();
            showMessage(friendActionMessage, "Pedido enviado!", "success");
            updateFriendActionButton();
        }
        catch (error) { console.error("Erro ao enviar pedido de amizade:", error); showMessage(friendActionMessage, `Erro ao enviar pedido: ${error.message}`); }
    }

    async function handleRemoveFriend() {
        if (!viewer || !viewer.uid || !viewedUserData || !viewedUserData.uid || !viewerData) {
            showMessage(friendActionMessage, "Erro: Dados do usuário ou do perfil visualizado estão incompletos."); return;
        }
        if (window.confirm(`Remover ${viewedUserData.displayName || 'este usuário'} dos amigos?`)) {
            showMessage(friendActionMessage, 'Removendo...', 'success');
            const batch = writeBatch(db);
            const viewerDocRef = doc(db, "users", viewer.uid);
            
            try {
                batch.delete(doc(db, `users/${viewer.uid}/friends/${viewedUserData.uid}`));
                batch.delete(doc(db, `users/${viewedUserData.uid}/friends/${viewer.uid}`));
                batch.update(viewerDocRef, { friendsCount: increment(-1) });
                
                await batch.commit();

                if(viewerData) { 
                    viewerData.friendsCount = Math.max(0, (viewerData.friendsCount || 1) - 1);
                }
                if (viewedUserData) {
                    const newFriendsCount = await getSubcollectionCount(viewedUserData.uid, 'friends');
                    viewedUserData.friendsCount = newFriendsCount;
                    if(friendsCountSpan) friendsCountSpan.textContent = newFriendsCount;
                }
                showMessage(friendActionMessage, 'Amigo removido.', 'success');
                updateFriendActionButton();
            } catch (e) { console.error("Erro ao remover amigo:", e); showMessage(friendActionMessage, `Erro ao remover amigo: ${e.message}`); }
        }
    }

    async function handleCancelRequest() {
        if (!viewer || !viewer.uid || !viewedUserData || !viewedUserData.uid) {
            showMessage(friendActionMessage, "Erro: Dados do usuário ou do perfil visualizado estão incompletos."); return;
        }
        showMessage(friendActionMessage, 'Cancelando pedido...', 'success');
        const batch = writeBatch(db);
        try {
            batch.delete(doc(db, `users/${viewer.uid}/friendRequestsSent/${viewedUserData.uid}`));
            batch.delete(doc(db, `users/${viewedUserData.uid}/friendRequestsReceived/${viewer.uid}`));
            await batch.commit();
            showMessage(friendActionMessage, 'Pedido cancelado.', 'success');
            updateFriendActionButton();
        } catch (e) { console.error("Erro ao cancelar pedido:", e); showMessage(friendActionMessage, `Erro ao cancelar pedido: ${e.message}`); }
    }

    async function handleAcceptRequest(currentViewerDataForAction) {
        if (!viewer || !viewer.uid || !viewedUserData || !viewedUserData.uid || !currentViewerDataForAction || !viewerData ) {
            showMessage(friendActionMessage, "Erro: Dados do usuário ou do perfil visualizado estão incompletos."); return;
        }
        showMessage(friendActionMessage, 'Aceitando...', 'success');
        const batch = writeBatch(db);
        const viewerDocRef = doc(db, "users", viewer.uid);
        
        try {
            const friendDataForViewer = { 
                timestamp: serverTimestamp(),
                displayName: viewedUserData.displayName || "Amigo", 
                photoURL: viewedUserData.photoURL || 'imgs/default-avatar.png'
            };
            const friendDataForViewed = { 
                timestamp: serverTimestamp(),
                displayName: currentViewerDataForAction.displayName, 
                photoURL: currentViewerDataForAction.photoURL
            };
            batch.set(doc(db, `users/${viewer.uid}/friends/${viewedUserData.uid}`), friendDataForViewer);
            batch.set(doc(db, `users/${viewedUserData.uid}/friends/${viewer.uid}`), friendDataForViewed);

            batch.delete(doc(db, `users/${viewer.uid}/friendRequestsReceived/${viewedUserData.uid}`));
            batch.delete(doc(db, `users/${viewedUserData.uid}/friendRequestsSent/${viewer.uid}`)); 

            batch.update(viewerDocRef, { friendsCount: increment(1) });
            
            await batch.commit();

            if(viewerData) { 
                 viewerData.friendsCount = (viewerData.friendsCount || 0) + 1;
            }
            if (viewedUserData) {
                const newFriendsCount = await getSubcollectionCount(viewedUserData.uid, 'friends');
                viewedUserData.friendsCount = newFriendsCount;
                if(friendsCountSpan) friendsCountSpan.textContent = newFriendsCount;
            }
            showMessage(friendActionMessage, 'Amigo adicionado!', 'success');
            updateFriendActionButton();
        } catch (e) { console.error("Erro ao aceitar pedido:", e); showMessage(friendActionMessage, `Erro ao aceitar pedido: ${e.message}`); }
    }

    async function handleDeclineRequest() {
        if (!viewer || !viewer.uid || !viewedUserData || !viewedUserData.uid) {
            showMessage(friendActionMessage, "Erro: Dados do usuário ou do perfil visualizado estão incompletos."); return;
        }
        showMessage(friendActionMessage, 'Recusando...', 'success');
        const batch = writeBatch(db);
        try {
            batch.delete(doc(db, `users/${viewer.uid}/friendRequestsReceived/${viewedUserData.uid}`));
            batch.delete(doc(db, `users/${viewedUserData.uid}/friendRequestsSent/${viewer.uid}`)); 
            await batch.commit();
            showMessage(friendActionMessage, 'Pedido recusado.', 'success');
            updateFriendActionButton();
        }
        catch (e) { console.error("Erro ao recusar pedido:", e); showMessage(friendActionMessage, `Erro ao recusar pedido: ${e.message}`); }
    }
    
    console.log("David's Farm public profile script (vCom Projetos e PopUp Jogue Aqui) carregado!");
});