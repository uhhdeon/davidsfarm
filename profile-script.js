// profile-script.js
import { auth, db } from './firebase-config.js';
import {
    onAuthStateChanged,
    updateProfile as updateAuthProfile,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    verifyBeforeUpdateEmail,
    signOut,
    deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, setDoc, deleteDoc as deleteFirestoreDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores DOM (COMPLETOS) ---
    const userAuthSection = document.querySelector('.user-auth-section');
    const currentYearSpan = document.getElementById('currentYear');
    const siteContent = document.getElementById('site-content');
    const tabPerfil = document.getElementById('tab-perfil');
    const tabSeguranca = document.getElementById('tab-seguranca');
    const tabTema = document.getElementById('tab-tema');
    const sectionPerfil = document.getElementById('section-perfil');
    const sectionSeguranca = document.getElementById('section-seguranca');
    const sectionTema = document.getElementById('section-tema');
    const profileForm = document.getElementById('profile-form');
    const profileUsernameInput = document.getElementById('profile-username');
    const profilePhotoUrlInput = document.getElementById('profile-photo-url-input');
    const profilePhotoPreviewImg = document.getElementById('profile-photo-preview-img');
    const profileMessageDiv = document.getElementById('profile-message');
    const profileScratchUsernameInput = document.getElementById('profile-scratch-username');
    const profilePronounsInput = document.getElementById('profile-pronouns');
    const profileDescriptionInput = document.getElementById('profile-description');
    const viewPublicProfileButton = document.getElementById('view-public-profile-button');
    const changePasswordForm = document.getElementById('change-password-form');
    const currentPasswordGroup = document.getElementById('current-password-group');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
    const passwordMessageDiv = document.getElementById('password-message');
    const passwordFormTitle = document.getElementById('password-form-title');
    const newPasswordLabel = document.getElementById('new-password-label');
    const passwordSubmitButton = document.getElementById('password-submit-button');
    const changeEmailForm = document.getElementById('change-email-form');
    const currentEmailDisplay = document.getElementById('current-email-display');
    const emailCurrentPasswordInput = document.getElementById('email-current-password');
    const newEmailInput = document.getElementById('new-email');
    const emailMessageDiv = document.getElementById('email-message');
    const logoutButtonProfilePage = document.getElementById('logout-button-profile-page');
    const deleteAccountButton = document.getElementById('delete-account-button');
    const accountActionMessageDiv = document.getElementById('account-action-message');
    const btnThemeProfile = document.getElementById('btn-theme-profile');
    const btnThemeSite = document.getElementById('btn-theme-site');
    const themeMessageDiv = document.getElementById('theme-message');
    const profileThemePreview = document.getElementById('profile-theme-preview');
    const profilePreviewPhoto = document.getElementById('profile-preview-photo');
    const profilePreviewDisplayName = document.getElementById('profile-preview-displayName');
    const profilePreviewPronouns = document.getElementById('profile-preview-pronouns');
    const profilePreviewDescription = document.getElementById('profile-preview-description');
    const popupOverlay = document.getElementById('custom-popup-overlay');
    const popupCloseButton = document.getElementById('custom-popup-close');
    const popupContent = document.getElementById('custom-popup-content');

    let currentUserForProfile = null; 
    let currentUserData = null;     

    const defaultPaletteColors = [
        '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#8B00FF', '#FF00FF',
        '#DC143C', '#FF8C00', '#FFD700', '#32CD32', '#00CED1', '#1E90FF', '#9932CC', '#FF1493',
        '#F08080', '#FFA07A', '#FFFACD', '#90EE90', '#ADD8E6', '#DDA0DD', '#DB7093', '#A9A9A9',
        '#FFFFFF', '#C0C0C0', '#808080', '#000000', '#2F4F4F', '#556B2F', '#800000', '#4B0082'
    ];

    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (siteContent) setTimeout(() => siteContent.classList.add('visible'), 100);

    const showMessage = (element, message, type = 'error', duration = 7000) => {
        if (!element) { console.warn("Elemento de mensagem não encontrado para exibir:", message); return; }
        element.textContent = message;
        element.className = 'form-message ' + (type === 'success' ? 'success' : 'error');
        element.style.display = 'block';
        setTimeout(() => { if (element) { element.style.display = 'none'; element.textContent = ''; }}, duration);
    };
    const switchTab = (activeTabButton, activeSection) => {
        [tabPerfil, tabSeguranca, tabTema].forEach(btn => btn?.classList.remove('active'));
        [sectionPerfil, sectionSeguranca, sectionTema].forEach(sec => sec?.classList.remove('active'));
        activeTabButton?.classList.add('active'); activeSection?.classList.add('active');
    };
    const hasPasswordProvider = (user) => {
        if (!user || !user.providerData) return false;
        return user.providerData.some(provider => provider.providerId === 'password');
    };
    const setupPasswordSectionUI = (userHasPw) => {
        if (currentPasswordGroup) currentPasswordGroup.style.display = userHasPw ? 'block' : 'none';
        if (passwordFormTitle) passwordFormTitle.textContent = userHasPw ? 'Alterar Senha' : 'Definir Nova Senha';
        if (newPasswordLabel) newPasswordLabel.textContent = userHasPw ? 'Nova Senha:' : 'Defina sua Senha:';
        if (passwordSubmitButton) passwordSubmitButton.textContent = userHasPw ? 'Alterar Senha' : 'Definir Senha';
        if (currentPasswordInput) currentPasswordInput.required = userHasPw;
    };
    const hexToRgbString = (hex) => {
        let r = 0, g = 0, b = 0;
        if (hex.length == 4) { r = "0x" + hex[1] + hex[1]; g = "0x" + hex[2] + hex[2]; b = "0x" + hex[3] + hex[3]; }
        else if (hex.length == 7) { r = "0x" + hex[1] + hex[2]; g = "0x" + hex[3] + hex[4]; b = "0x" + hex[5] + hex[6]; }
        return `rgb(${+r},${+g},${+b})`;
    };
    const rgbStringToHex = (rgb) => {
        if (!rgb || !rgb.startsWith('rgb')) return '#000000';
        const result = rgb.match(/\d+/g);
        if (!result || result.length !== 3) return '#000000';
        return "#" + result.map(x => { const h = parseInt(x).toString(16); return h.length === 1 ? "0" + h : h; }).join('');
    };
    function rgbStringToComponents(rgbString) {
        if (!rgbString || !rgbString.startsWith('rgb')) return { r: 37, g: 37, b: 37 };
        const result = rgbString.match(/\d+/g);
        if (result && result.length === 3) return { r: parseInt(result[0]), g: parseInt(result[1]), b: parseInt(result[2]) };
        return { r: 37, g: 37, b: 37 };
    }
    function calculateLuminance(colorObj) {
        const r = colorObj.r / 255, g = colorObj.g / 255, b = colorObj.b / 255;
        const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function lightenDarkenColor(colorObj, percent) {
        const newR = Math.max(0, Math.min(255, Math.round(colorObj.r * (1 + percent))));
        const newG = Math.max(0, Math.min(255, Math.round(colorObj.g * (1 + percent))));
        const newB = Math.max(0, Math.min(255, Math.round(colorObj.b * (1 + percent))));
        return `rgb(${newR},${newG},${newB})`;
    }
    function getDynamicAccentColor(baseAccentRgbString, mainBgRgbString) {
        const baseAccentObj = rgbStringToComponents(baseAccentRgbString);
        const mainBgLuminance = calculateLuminance(rgbStringToComponents(mainBgRgbString));
        const accentLuminance = calculateLuminance(baseAccentObj);
        if (mainBgLuminance > 0.6) { if (accentLuminance > 0.5) return lightenDarkenColor(baseAccentObj, -0.4); return `rgb(${baseAccentObj.r},${baseAccentObj.g},${baseAccentObj.b})`; }
        else { if (accentLuminance < 0.3) return lightenDarkenColor(baseAccentObj, 0.5); return `rgb(${baseAccentObj.r},${baseAccentObj.g},${baseAccentObj.b})`; }
    }
    const applyProfileThemeToPreview = (theme) => {
        if (!profileThemePreview) return;
        let primaryBgColorForContrast = 'rgb(37,37,37)'; let accentColor = '#00bfff'; 
        if (!theme) {
            profileThemePreview.style.background = ''; profileThemePreview.style.backgroundImage = '';
            profileThemePreview.classList.remove('text-theme-dark-preview'); profileThemePreview.classList.add('text-theme-light-preview'); 
        } else {
            if (theme.type === 'solid') { profileThemePreview.style.backgroundImage = 'none'; profileThemePreview.style.backgroundColor = theme.color; primaryBgColorForContrast = theme.color; accentColor = theme.color; }
            else if (theme.type === 'gradient') { profileThemePreview.style.backgroundColor = 'transparent'; profileThemePreview.style.backgroundImage = `linear-gradient(to bottom, ${theme.color1}, ${theme.color2})`; primaryBgColorForContrast = theme.color1; accentColor = theme.color1; }
            const bgColorObj = rgbStringToComponents(primaryBgColorForContrast); const luminance = calculateLuminance(bgColorObj); 
            if (luminance > 0.45) { profileThemePreview.classList.remove('text-theme-light-preview'); profileThemePreview.classList.add('text-theme-dark-preview'); }
            else { profileThemePreview.classList.remove('text-theme-dark-preview'); profileThemePreview.classList.add('text-theme-light-preview'); }
        }
        if (profilePreviewPhoto) profilePreviewPhoto.style.borderColor = getDynamicAccentColor(accentColor, primaryBgColorForContrast);
    };
    const openPopup = () => { if (popupOverlay) popupOverlay.classList.add('visible'); };
    const closePopup = () => { if (popupOverlay) popupOverlay.classList.remove('visible'); if (popupContent) popupContent.innerHTML = ''; };
    if (popupCloseButton) popupCloseButton.addEventListener('click', closePopup);
    if (popupOverlay) popupOverlay.addEventListener('click', (e) => { if (e.target === popupOverlay) closePopup(); });

    const createColorPickerUI_Native = (initialColorRgb, onColorChangeCallback) => {
        const container = document.createElement('div'); container.className = 'color-selector-container-native';
        let selectedColor = initialColorRgb || 'rgb(50,50,50)';
        const updateColor = (newRgbColor) => { selectedColor = newRgbColor; if (colorInput) colorInput.value = rgbStringToHex(selectedColor); if (colorRgbDisplay) colorRgbDisplay.textContent = selectedColor; onColorChangeCallback(selectedColor); };
        const paletteTitle = document.createElement('p'); paletteTitle.textContent="Cores Padrão:"; paletteTitle.style.color="#bdc3c7"; paletteTitle.style.marginBottom="8px"; container.appendChild(paletteTitle);
        const palette = document.createElement('div'); palette.className = 'color-palette';
        defaultPaletteColors.forEach(colorHex => { const div = document.createElement('div'); div.className = 'palette-color'; div.style.backgroundColor = colorHex; div.addEventListener('click', () => updateColor(hexToRgbString(colorHex))); palette.appendChild(div); });
        container.appendChild(palette);
        const nativePickerTitle = document.createElement('p'); nativePickerTitle.textContent="Ou escolha uma cor customizada:"; nativePickerTitle.style.color="#bdc3c7"; nativePickerTitle.style.marginTop="15px"; nativePickerTitle.style.marginBottom="8px"; container.appendChild(nativePickerTitle);
        const inputContainer = document.createElement('div'); inputContainer.style.display='flex'; inputContainer.style.alignItems='center'; inputContainer.style.gap='10px';
        const colorInput = document.createElement('input'); colorInput.type = 'color'; colorInput.value = rgbStringToHex(selectedColor); colorInput.style.width='80px'; colorInput.style.height='40px'; colorInput.style.border='none'; colorInput.style.padding='0'; colorInput.style.cursor='pointer';
        const colorRgbDisplay = document.createElement('span'); colorRgbDisplay.textContent = selectedColor; colorRgbDisplay.style.fontFamily='monospace'; colorRgbDisplay.style.color='#ccc';
        colorInput.addEventListener('input', (event) => updateColor(hexToRgbString(event.target.value)));
        inputContainer.append(colorInput, colorRgbDisplay); container.appendChild(inputContainer);
        return container;
    };
    const showSolidColorPicker = () => {
        const currentSolidColor = currentUserData?.profileTheme?.color || (currentUserData?.profileTheme?.type === 'solid' ? currentUserData.profileTheme.color : 'rgb(40,40,40)');
        let chosenColor = currentSolidColor;
        if (!popupContent) return; popupContent.innerHTML = '<h3>Escolha uma Cor Sólida</h3>';
        const colorPicker = createColorPickerUI_Native(currentSolidColor, (newColor) => { chosenColor = newColor; });
        popupContent.appendChild(colorPicker);
        const actionsDiv = document.createElement('div'); actionsDiv.className = 'popup-actions';
        const applyButton = document.createElement('button'); applyButton.textContent = 'Aplicar Cor'; applyButton.className = 'popup-apply-button';
        applyButton.addEventListener('click', async () => { const theme = { type: 'solid', color: chosenColor, siteBaseColor: chosenColor }; await saveProfileTheme(theme); closePopup(); });
        actionsDiv.appendChild(applyButton); popupContent.appendChild(actionsDiv);
    };
    const showGradientColorPicker = () => {
        const currentTheme = currentUserData?.profileTheme;
        let color1 = (currentTheme?.type === 'gradient' && currentTheme.color1) ? currentTheme.color1 : 'rgb(52, 73, 94)';
        let color2 = (currentTheme?.type === 'gradient' && currentTheme.color2) ? currentTheme.color2 : 'rgb(44, 62, 80)';
        if (!popupContent) return;
        popupContent.innerHTML = `<h3>Escolha as Cores do Gradiente</h3><div id="gradient-live-preview" style="width:100%; height:60px; border-radius:6px; border:1px solid #566573; margin-bottom:15px;"></div><div class="gradient-picker-area"><div class="gradient-color-control"><button id="pick-color-1" class="color-pick-trigger" style="background-color: ${color1};"></button><span>Cor de Cima</span></div><div class="gradient-color-control"><button id="pick-color-2" class="color-pick-trigger" style="background-color: ${color2};"></button><span>Cor de Baixo</span></div></div><div id="gradient-color-picker-slot"></div><div class="popup-actions"><button id="apply-gradient-button" class="popup-apply-button">Aplicar Gradiente</button></div>`;
        const gradientPreview = popupContent.querySelector('#gradient-live-preview'); const updateGradientPreview = () => { if(gradientPreview) gradientPreview.style.background = `linear-gradient(to bottom, ${color1}, ${color2})`; }; updateGradientPreview();
        const colorPickerSlot = popupContent.querySelector('#gradient-color-picker-slot');
        const createIndividualColorPicker_Native = (targetColorButtonId, initialColor, callback) => { if(!colorPickerSlot) return; colorPickerSlot.innerHTML = ''; const pTitle = document.createElement('h4'); pTitle.textContent = targetColorButtonId==='pick-color-1'?"Cor de Cima":"Cor de Baixo"; pTitle.style.color="#ecf0f1";pTitle.style.marginBottom="10px"; colorPickerSlot.appendChild(pTitle); const iPicker = createColorPickerUI_Native(initialColor, (nColor) => { callback(nColor); document.getElementById(targetColorButtonId).style.backgroundColor = nColor; updateGradientPreview(); }); colorPickerSlot.appendChild(iPicker); };
        const pColor1Btn = popupContent.querySelector('#pick-color-1'); const pColor2Btn = popupContent.querySelector('#pick-color-2');
        if(pColor1Btn) pColor1Btn.addEventListener('click', () => createIndividualColorPicker_Native('pick-color-1', color1, (newColor) => { color1 = newColor; }));
        if(pColor2Btn) pColor2Btn.addEventListener('click', () => createIndividualColorPicker_Native('pick-color-2', color2, (newColor) => { color2 = newColor; }));
        const applyGradBtn = popupContent.querySelector('#apply-gradient-button');
        if(applyGradBtn) applyGradBtn.addEventListener('click', async () => { const theme = { type: 'gradient', color1: color1, color2: color2, siteBaseColor: color1 }; await saveProfileTheme(theme); closePopup(); });
    };
    
    const saveProfileTheme = async (themeData) => { 
        if (!currentUserForProfile) { showMessage(themeMessageDiv, 'Usuário não logado.', 'error'); return; }
        
        const userDocRef = doc(db, "users", currentUserForProfile.uid);
        const dataToUpdate = { 
            profileTheme: {
                type: themeData.type,
                color: themeData.color || null, 
                color1: themeData.color1 || null,
                color2: themeData.color2 || null,
                siteBaseColor: themeData.siteBaseColor 
            }
        };

        console.log("--- LOG: Tentando salvar tema ---");
        console.log("UID do Usuário (currentUserForProfile.uid):", currentUserForProfile.uid);
        console.log("Caminho do Documento (userDocRef.path):", userDocRef.path);
        console.log("Dados para 'updateDoc':", JSON.stringify(dataToUpdate, null, 2));
        console.log("Objeto currentUserData ANTES da tentativa de salvar:", JSON.stringify(currentUserData, null, 2));


        try {
            await updateDoc(userDocRef, dataToUpdate); 
            console.log("--- LOG: Tema salvo com sucesso no Firestore. ---");

            if(currentUserData) currentUserData.profileTheme = dataToUpdate.profileTheme; 
            applyProfileThemeToPreview(dataToUpdate.profileTheme);
            if (dataToUpdate.profileTheme.siteBaseColor) {
                const siteBgColorObj = rgbStringToComponents(dataToUpdate.profileTheme.siteBaseColor);
                document.body.style.backgroundColor = lightenDarkenColor(siteBgColorObj, -0.3);
            }
            showMessage(themeMessageDiv, 'Tema do perfil salvo com sucesso!', 'success');
        } catch (error) { 
            console.error("Erro ao salvar tema (linha JS ~218):", error); 
            console.error("Detalhes do erro Firestore:", error.code, error.message, error.details); 
            showMessage(themeMessageDiv, `Erro ao salvar tema: ${error.message}`); 
        }
    };
    
    if (btnThemeProfile) {
        btnThemeProfile.addEventListener('click', () => {
            if (!popupContent) return;
            popupContent.innerHTML = `<h3>Escolha o tipo de tema para o perfil</h3><div class="theme-type-selection"><button class="theme-type-button" data-type="solid"><img src="imgs/solidcolor.png" alt="Cor Sólida"><span>Cor Sólida</span></button><button class="theme-type-button" data-type="gradient"><img src="imgs/gradient.png" alt="Gradiente"><span>Gradiente</span></button></div>`;
            openPopup();
            popupContent.querySelectorAll('.theme-type-button').forEach(button => {
                button.addEventListener('click', (e) => {
                    const type = e.currentTarget.dataset.type;
                    if (type === 'solid') showSolidColorPicker(); else if (type === 'gradient') showGradientColorPicker();
                });
            });
        });
    }
    const themeProfileBtnImg = document.querySelector('#btn-theme-profile img'); if (themeProfileBtnImg) themeProfileBtnImg.src = 'imgs/temadoperfil.png';
    const themeSiteBtnImg = document.querySelector('#btn-theme-site img'); if (themeSiteBtnImg) themeSiteBtnImg.src = 'imgs/temadosite.png';

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUserForProfile = user;
            console.log("--- LOG: onAuthStateChanged ---");
            console.log("Usuário autenticado (user.uid):", user.uid);
            console.log("Email do usuário:", user.email);

            if (userAuthSection) {
                const displayName = user.displayName || user.email.split('@')[0];
                const photoURL = user.photoURL || 'imgs/default-avatar.png';
                userAuthSection.innerHTML = `<a href="profile.html" class="user-info-link"><div class="user-info"><img id="user-photo" src="${photoURL}" alt="Foto"><span id="user-name">${displayName}</span></div></a>`;
            }
            const userDocRef = doc(db, "users", user.uid);
            console.log("Tentando carregar dados do Firestore para o caminho:", userDocRef.path);
            try {
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    console.log("Documento do usuário encontrado. Dados:", JSON.stringify(userDocSnap.data(), null, 2));
                    currentUserData = userDocSnap.data();
                    currentUserData.friendsCount = currentUserData.friendsCount || 0;
                    currentUserData.followersCount = currentUserData.followersCount || 0;
                    currentUserData.followingCount = currentUserData.followingCount || 0;
                    if (profileUsernameInput) profileUsernameInput.value = currentUserData.displayName || user.displayName || '';
                    if (profilePhotoUrlInput) profilePhotoUrlInput.value = currentUserData.photoURL || user.photoURL || '';
                    if (profilePhotoPreviewImg) profilePhotoPreviewImg.src = currentUserData.photoURL || user.photoURL || 'imgs/default-avatar.png';
                    if (profileScratchUsernameInput) profileScratchUsernameInput.value = currentUserData.scratchUsername || '';
                    if (profilePronounsInput) profilePronounsInput.value = currentUserData.pronouns || '';
                    if (profileDescriptionInput) profileDescriptionInput.value = currentUserData.profileDescription || '';
                    if(profilePreviewPhoto) profilePreviewPhoto.src = currentUserData.photoURL || user.photoURL || 'imgs/default-avatar.png';
                    if(profilePreviewDisplayName) profilePreviewDisplayName.textContent = currentUserData.displayName || user.displayName || 'Seu Nome Aqui';
                    if(profilePreviewPronouns) profilePreviewPronouns.textContent = currentUserData.pronouns || 'Seus Pronomes';
                    if(profilePreviewDescription) profilePreviewDescription.textContent = currentUserData.profileDescription || 'Sua bio apareceria aqui...';
                    if (currentUserData.profileTheme) {
                        applyProfileThemeToPreview(currentUserData.profileTheme);
                        if (currentUserData.profileTheme.siteBaseColor) {
                            const siteBgColorObj = rgbStringToComponents(currentUserData.profileTheme.siteBaseColor);
                            document.body.style.backgroundColor = lightenDarkenColor(siteBgColorObj, -0.3);
                        }
                    } else { applyProfileThemeToPreview(null); document.body.style.backgroundColor = ''; }
                } else { 
                    console.warn("Documento do usuário NÃO encontrado no Firestore para UID:", user.uid, ". Tentando criar um novo documento.");
                    currentUserData = {
                        uid: user.uid, email: user.email, // ADICIONADO EMAIL AQUI
                        displayName: user.displayName || user.email.split('@')[0],
                        photoURL: user.photoURL || null,
                        friendsCount: 0, followersCount: 0, followingCount: 0,
                        scratchUsername: "", pronouns: "", profileDescription: "",
                        profileTheme: null,
                        createdAt: serverTimestamp() // Precisa importar serverTimestamp
                    };
                    try {
                        console.log("Tentando CRIAR novo documento para usuário:", user.uid, " com dados:", JSON.stringify(currentUserData, null, 2));
                        await setDoc(userDocRef, currentUserData); 
                        console.log("Novo perfil de usuário criado no Firestore.");
                    } catch (creationError) {
                        console.error("Falha ao criar novo perfil de usuário no Firestore:", creationError);
                        showMessage(profileMessageDiv, "Erro crítico: Não foi possível criar o perfil no banco de dados.");
                    }
                    if (profileUsernameInput) profileUsernameInput.value = currentUserData.displayName;
                    applyProfileThemeToPreview(null); document.body.style.backgroundColor = '';
                }
            } catch (error) { console.error("Erro ao carregar dados do usuário do Firestore em onAuthStateChanged:", error); showMessage(profileMessageDiv, "Erro crítico ao carregar dados do perfil.", "error");}
            if (currentEmailDisplay) currentEmailDisplay.textContent = user.email;
            setupPasswordSectionUI(hasPasswordProvider(user));
            const hash = window.location.hash; 
            if (hash === '#security') switchTab(tabSeguranca, sectionSeguranca);
            else if (hash === '#tema') switchTab(tabTema, sectionTema);
            else switchTab(tabPerfil, sectionPerfil);
            if (hash) window.location.hash = '';
        } else { window.location.href = 'login.html'; }
    });

    if (tabPerfil) tabPerfil.addEventListener('click', () => switchTab(tabPerfil, sectionPerfil));
    if (tabSeguranca) tabSeguranca.addEventListener('click', () => switchTab(tabSeguranca, sectionSeguranca));
    if (tabTema) tabTema.addEventListener('click', () => switchTab(tabTema, sectionTema));

    if (profilePhotoUrlInput && profilePhotoPreviewImg) {
        profilePhotoUrlInput.addEventListener('input', () => { profilePhotoPreviewImg.src = profilePhotoUrlInput.value.trim() || 'imgs/default-avatar.png'; });
        profilePhotoPreviewImg.onerror = () => { profilePhotoPreviewImg.src = 'imgs/default-avatar.png'; };
    }

    if (viewPublicProfileButton) {
        viewPublicProfileButton.addEventListener('click', () => {
            if (currentUserForProfile) window.location.href = `public-profile.html?uid=${currentUserForProfile.uid}`;
            else showMessage(profileMessageDiv, 'Usuário não carregado.');
        });
    }

    if (profileForm) { 
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUserForProfile) { showMessage(profileMessageDiv, "Não autenticado.", "error"); return; }

            const newUsername = profileUsernameInput.value.trim();
            const newPhotoURL = profilePhotoUrlInput.value.trim() || null;
            const newScratchUsername = profileScratchUsernameInput.value.trim();
            const newPronouns = profilePronounsInput.value.trim();
            const newDescription = profileDescriptionInput.value.trim();

            let isValidUrl = true;
            if (newPhotoURL) { try { new URL(newPhotoURL); } catch (_) { isValidUrl = false; } }
            if (newPhotoURL && !isValidUrl) { showMessage(profileMessageDiv, 'URL da foto inválido.'); return; }

            const authProfileUpdates = {};
            if (newUsername !== (currentUserForProfile.displayName || '')) authProfileUpdates.displayName = newUsername;
            if (newPhotoURL !== (currentUserForProfile.photoURL || null)) authProfileUpdates.photoURL = newPhotoURL;
            
            const firestoreProfileFieldsToUpdate = {
                displayName: newUsername, photoURL: newPhotoURL,
                scratchUsername: newScratchUsername, pronouns: newPronouns,
                profileDescription: newDescription,
            };
            
            showMessage(profileMessageDiv, 'Salvando perfil...', 'success');
            const userDocRef = doc(db, "users", currentUserForProfile.uid);
            console.log("--- LOG: Tentando atualizar perfil ---");
            console.log("UID do Usuário (currentUserForProfile.uid):", currentUserForProfile.uid);
            console.log("Caminho do Documento (userDocRef.path):", userDocRef.path);
            console.log("Dados para 'updateDoc':", JSON.stringify(firestoreProfileFieldsToUpdate, null, 2));
            console.log("Objeto currentUserData ANTES da tentativa de salvar:", JSON.stringify(currentUserData, null, 2));
            
            try {
                if (Object.keys(authProfileUpdates).length > 0) {
                    await updateAuthProfile(currentUserForProfile, authProfileUpdates);
                }
                await updateDoc(userDocRef, firestoreProfileFieldsToUpdate); 
                console.log("--- LOG: Perfil do Firestore atualizado com sucesso. ---");

                if(currentUserData) { Object.assign(currentUserData, firestoreProfileFieldsToUpdate); }
                showMessage(profileMessageDiv, 'Perfil atualizado!', 'success');
                if(document.getElementById('user-name')) document.getElementById('user-name').textContent = newUsername || currentUserForProfile.email.split('@')[0];
                if(document.getElementById('user-photo')) document.getElementById('user-photo').src = newPhotoURL || 'imgs/default-avatar.png';
                if(profilePreviewPhoto) profilePreviewPhoto.src = newPhotoURL || 'imgs/default-avatar.png';
                if(profilePreviewDisplayName) profilePreviewDisplayName.textContent = newUsername || 'Seu Nome Aqui';
                if(profilePreviewPronouns) profilePreviewPronouns.textContent = newPronouns || 'Seus Pronomes';
                if(profilePreviewDescription) profilePreviewDescription.textContent = newDescription || 'Sua bio apareceria aqui...';
            } catch (error) { 
                console.error("Erro ao atualizar perfil (linha JS ~386):", error);
                console.error("Detalhes do erro Firestore:", error.code, error.message, error.details);
                showMessage(profileMessageDiv, `Erro ao atualizar perfil: ${error.message}`);
            }
        });
    }
    
    const reauthenticateUser = (currentPassword) => {
        const user = currentUserForProfile; 
        if (!user || !user.email) {
            const msgDiv = passwordMessageDiv.style.display !== 'none' ? passwordMessageDiv : (emailMessageDiv.style.display !== 'none' ? emailMessageDiv : accountActionMessageDiv);
            if (msgDiv) showMessage(msgDiv, 'Erro: Usuário não encontrado.'); return Promise.reject(new Error('Usuário não encontrado.'));
        }
        return reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
    };

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault(); if (!currentUserForProfile) { showMessage(passwordMessageDiv, "Não autenticado.", "error"); return; }
            const newP = newPasswordInput.value, confirmP = confirmNewPasswordInput.value;
            if (newP.length < 6) { showMessage(passwordMessageDiv, 'Senha muito curta (mín. 6).'); return; }
            if (newP !== confirmP) { showMessage(passwordMessageDiv, 'Senhas não coincidem.'); return; }
            showMessage(passwordMessageDiv, 'Processando...', 'success');
            try {
                if (hasPasswordProvider(currentUserForProfile)) {
                    const currentP = currentPasswordInput.value; if (!currentP) { showMessage(passwordMessageDiv, 'Senha atual necessária.'); return; }
                    await reauthenticateUser(currentP);
                }
                await updatePassword(currentUserForProfile, newP);
                showMessage(passwordMessageDiv, 'Senha alterada/definida com sucesso!', 'success'); changePasswordForm.reset(); setupPasswordSectionUI(true); localStorage.removeItem(`declinedSetPassword_${currentUserForProfile.uid}`);
            } catch (error) { 
                console.error("Erro ao alterar senha:", error); 
                let msg = `Erro: ${error.message || 'Falha ao alterar senha.'}`;
                if (error.code === 'auth/wrong-password') msg = 'Senha atual incorreta.';
                else if (error.code === 'auth/requires-recent-login') msg = 'Login recente necessário. Faça login novamente.';
                showMessage(passwordMessageDiv, msg); 
            }
        });
    }

    if (changeEmailForm) {
        changeEmailForm.addEventListener('submit', async (e) => {
            e.preventDefault(); if (!currentUserForProfile) { showMessage(emailMessageDiv, "Não autenticado.", "error"); return; }
            const currentP = emailCurrentPasswordInput.value, newE = newEmailInput.value.trim();
            if (!currentP) { showMessage(emailMessageDiv, 'Senha atual necessária.'); return; }
            if (!newE) { showMessage(emailMessageDiv, 'Novo email necessário.'); return; }
            if (newE === currentUserForProfile.email) { showMessage(emailMessageDiv, 'Email igual ao atual.'); return; }
            showMessage(emailMessageDiv, 'Processando...', 'success');
            try {
                await reauthenticateUser(currentP); await verifyBeforeUpdateEmail(currentUserForProfile, newE);
                showMessage(emailMessageDiv, 'Email de verificação enviado para o novo endereço! Confirme para concluir.', 'success'); changeEmailForm.reset();
            } catch (error) { 
                console.error("Erro ao alterar email:", error); 
                let msg = `Erro: ${error.message || 'Falha ao alterar email.'}`;
                if (error.code === 'auth/wrong-password') msg = 'Senha atual incorreta.';
                else if (error.code === 'auth/email-already-in-use') msg = 'Email já em uso.';
                else if (error.code === 'auth/invalid-email') msg = 'Novo email inválido.';
                else if (error.code === 'auth/requires-recent-login') msg = 'Login recente necessário. Faça login novamente.';
                showMessage(emailMessageDiv, msg); 
            }
        });
    }
    
    if (logoutButtonProfilePage) {
        logoutButtonProfilePage.addEventListener('click', () => {
            signOut(auth).then(() => { window.location.href = 'index.html'; }).catch((error) => { console.error("Erro sair:", error); showMessage(accountActionMessageDiv, `Erro ao sair: ${error.message}`); });
        });
    }

    if (deleteAccountButton) {
        deleteAccountButton.addEventListener('click', async () => {
            if (!currentUserForProfile) { showMessage(accountActionMessageDiv, "Não autenticado.", "error"); return; }
            const pass = prompt("ATENÇÃO! Para DELETAR sua conta PERMANENTEMENTE, insira sua senha atual. Esta ação NÃO PODE SER DESFEITA.");
            if (pass === null) { showMessage(accountActionMessageDiv, "Exclusão de conta cancelada.", "success"); return; }
            if (!pass && hasPasswordProvider(currentUserForProfile)) { showMessage(accountActionMessageDiv, "Senha atual é obrigatória para deletar a conta."); return; }
            showMessage(accountActionMessageDiv, "Processando exclusão de conta...", "success");
            try {
                if (hasPasswordProvider(currentUserForProfile)) await reauthenticateUser(pass);
                const uid = currentUserForProfile.uid;
                const userFirestoreDataForDelete = currentUserData || (await getDoc(doc(db, "users", uid))).data(); 
                if (userFirestoreDataForDelete && userFirestoreDataForDelete.friendId) {
                    try { await deleteFirestoreDoc(doc(db, "friendIdMappings", userFirestoreDataForDelete.friendId)); console.log("Mapeamento Friend ID deletado."); }
                    catch (mapError) { console.error("Erro ao deletar mapeamento Friend ID:", mapError); }
                }
                await deleteFirestoreDoc(doc(db, "users", uid)); console.log("Documento do usuário no Firestore deletado.");
                await deleteUser(currentUserForProfile);
                showMessage(accountActionMessageDiv, "Conta deletada com sucesso. Você será redirecionado.", "success");
                setTimeout(() => { window.location.href = 'index.html'; }, 3500);
            } catch (error) { 
                console.error("Erro ao deletar conta:", error); 
                let msg = `Erro: ${error.message || 'Falha ao deletar conta.'}`;
                if (error.code === 'auth/wrong-password') msg = 'Senha atual incorreta. Exclusão falhou.';
                else if (error.code === 'auth/requires-recent-login') msg = 'Login recente necessário. Faça login novamente.';
                showMessage(accountActionMessageDiv, msg); 
            }
        });
    }
    
    console.log("David's Farm profile script (vCOM LOGS DE DEPURAÇÃO DETALHADOS) carregado!");
});