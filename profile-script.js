// profile-script.js
// ETAPA 11.1: Rate Limiting EXTENSIVO para todas as ações de atualização de perfil.
// ETAPA ATUAL: Adicionada funcionalidade de Upload de Foto de Perfil
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
import {
    doc, getDoc, updateDoc, setDoc, deleteDoc as deleteFirestoreDoc, serverTimestamp,
    collection, addDoc, getDocs, query, orderBy, where, limit,
    onSnapshot, writeBatch, Timestamp, deleteField
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// NOVA IMPORTAÇÃO PARA FIREBASE STORAGE
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores DOM (todos os anteriores) ---
    const userAuthSection = document.querySelector('.user-auth-section');
    const currentYearSpan = document.getElementById('currentYear');
    const siteContent = document.getElementById('site-content');
    const tabPerfil = document.getElementById('tab-perfil');
    const tabSeguranca = document.getElementById('tab-seguranca');
    const tabTema = document.getElementById('tab-tema');
    const tabJogos = document.getElementById('tab-jogos');
    const sectionPerfil = document.getElementById('section-perfil');
    const sectionSeguranca = document.getElementById('section-seguranca');
    const sectionTema = document.getElementById('section-tema');
    const sectionJogos = document.getElementById('section-jogos');
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
    const scratchProjectLinkInput = document.getElementById('scratch-project-link-input');
    const scratchProjectTitleInput = document.getElementById('scratch-project-title-input');
    const scratchProjectDescInput = document.getElementById('scratch-project-desc-input');
    const addScratchProjectButton = document.getElementById('add-scratch-project-button');
    const scratchProjectMessageDiv = document.getElementById('scratch-project-message');
    const scratchProjectsLoadingDiv = document.getElementById('scratch-projects-loading');
    const scratchProjectsListUl = document.getElementById('scratch-projects-list');
    const scratchProjectsEmptyMessageP = document.getElementById('scratch-projects-empty-message');

    // NOVOS Seletores DOM para Upload de Foto
    const profilePhotoUploadInput = document.getElementById('profile-photo-upload-input');
    const triggerPhotoUploadButton = document.getElementById('trigger-photo-upload-button');
    const photoUploadProgressTextDiv = document.getElementById('photo-upload-progresstext'); // Corrigido para o ID do HTML
    const photoUploadMessageDiv = document.getElementById('photo-upload-message');

    let currentUserForProfile = null;
    let currentUserData = null;
    let userScratchProjects = [];
    let projectsListenerUnsubscribe = null;
    let editingScratchProjectDocId = null;

    // NOVA INICIALIZAÇÃO DO STORAGE
    const storage = getStorage(auth.app); // auth.app para pegar a instância do app Firebase

    // Constantes para Rate Limiting GERAL
    const ACTION_LIMIT = 5;
    const ACTION_WINDOW_MS = 5 * 60 * 1000; // 5 minutos
    const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutos

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
        element.className = 'form-message ' + (type === 'success' ? 'success' : (type === 'info' ? 'info' : 'error'));
        element.style.display = 'block';
        if (duration > 0) {
            setTimeout(() => { if (element) { element.style.display = 'none'; element.textContent = ''; }}, duration);
        }
    };

    const switchTab = (activeTabButton, activeSection) => {
        [tabPerfil, tabSeguranca, tabTema, tabJogos].forEach(btn => btn?.classList.remove('active'));
        [sectionPerfil, sectionSeguranca, sectionTema, sectionJogos].forEach(sec => sec?.classList.remove('active'));

        activeTabButton?.classList.add('active');
        activeSection?.classList.add('active');

        if (activeSection === sectionJogos && currentUserForProfile) {
            if (projectsListenerUnsubscribe) projectsListenerUnsubscribe();
            listenToUserScratchProjects();
        } else {
            if (projectsListenerUnsubscribe) {
                projectsListenerUnsubscribe();
                projectsListenerUnsubscribe = null;
            }
        }
        if (activeSection !== sectionJogos && editingScratchProjectDocId) {
            cancelEditScratchProject();
        }
    };

    // --- LÓGICA DE RATE LIMITING GENÉRICA ---
    async function checkActionRateLimit(actionType, messageElement) {
        if (!currentUserForProfile || !currentUserData) {
            showMessage(messageElement, "Dados do usuário não carregados para verificar limite.");
            return false;
        }
        const now = Date.now();
        const userDocRef = doc(db, "users", currentUserForProfile.uid);
        const timestampsField = `${actionType}Timestamps`;
        const cooldownField = `${actionType}CooldownUntil`;

        currentUserData[timestampsField] = currentUserData[timestampsField] || [];
        currentUserData[cooldownField] = currentUserData[cooldownField] || null;

        if (currentUserData[cooldownField]) {
            const cooldownEndTime = currentUserData[cooldownField] instanceof Timestamp ?
                                    currentUserData[cooldownField].toDate().getTime() :
                                    new Date(currentUserData[cooldownField]).getTime(); // Compatibilidade se não for Timestamp
            if (now < cooldownEndTime) {
                const timeLeftMs = cooldownEndTime - now;
                const minutesLeft = Math.ceil(timeLeftMs / (60 * 1000));
                showMessage(messageElement, `Você realizou esta ação recentemente. Tente novamente em ${minutesLeft} minuto(s).`, "error", COOLDOWN_MS);
                return false;
            }
        }

        const timestamps = (currentUserData[timestampsField] || []).map(ts =>
            ts instanceof Timestamp ? ts.toDate().getTime() : new Date(ts).getTime() // Compatibilidade
        );
        const recentActions = timestamps.filter(tsMillis => (now - tsMillis) < ACTION_WINDOW_MS);

        if (recentActions.length >= ACTION_LIMIT) {
            const newCooldownUntil = Timestamp.fromMillis(now + COOLDOWN_MS);
            try {
                await updateDoc(userDocRef, { [cooldownField]: newCooldownUntil });
                currentUserData[cooldownField] = newCooldownUntil;
                showMessage(messageElement, `Você atingiu o limite para esta ação. Tente novamente em ${Math.ceil(COOLDOWN_MS / (60 * 1000))} minutos.`, "error", COOLDOWN_MS);
            } catch (err) {
                console.error(`Erro ao definir cooldown para ${actionType}:`, err);
                showMessage(messageElement, "Erro ao processar limite de ações. Tente mais tarde.");
            }
            return false;
        }
        return true;
    }

    async function recordActionTimestamp(actionType, userDocRef) {
        if (!currentUserData) return;
        const now = Date.now();
        const timestampsField = `${actionType}Timestamps`;
        const cooldownField = `${actionType}CooldownUntil`;

        const currentTimestamps = (currentUserData[timestampsField] || []).map(ts =>
            ts instanceof Timestamp ? ts.toDate().getTime() : new Date(ts).getTime()
        );
        const recentTimestampsMs = currentTimestamps.filter(tsMillis => (now - tsMillis) < ACTION_WINDOW_MS);

        const newTimestampsForFirestore = [...recentTimestampsMs.map(ms => Timestamp.fromMillis(ms)), Timestamp.now()].slice(-ACTION_LIMIT * 2); // Mantém um buffer maior
        try {
            await updateDoc(userDocRef, {
                [timestampsField]: newTimestampsForFirestore,
                [cooldownField]: null
            });
            currentUserData[timestampsField] = newTimestampsForFirestore;
            currentUserData[cooldownField] = null;
        } catch (error) {
            console.error(`Erro ao registrar timestamp para ${actionType}:`, error);
        }
    }

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
            profileThemePreview.style.background = '';
            profileThemePreview.style.backgroundImage = '';
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
        const container = document.createElement('div');
        container.className = 'color-selector-container-native';
        let selectedColor = initialColorRgb || 'rgb(50,50,50)';
        const updateColor = (newRgbColor) => { selectedColor = newRgbColor; if (colorInput) colorInput.value = rgbStringToHex(selectedColor); if (colorRgbDisplay) colorRgbDisplay.textContent = selectedColor; onColorChangeCallback(selectedColor); };
        const paletteTitle = document.createElement('p'); paletteTitle.textContent="Cores Padrão:"; paletteTitle.style.color="#bdc3c7"; paletteTitle.style.marginBottom="8px";
        container.appendChild(paletteTitle);
        const palette = document.createElement('div'); palette.className = 'color-palette';
        defaultPaletteColors.forEach(colorHex => { const div = document.createElement('div'); div.className = 'palette-color'; div.style.backgroundColor = colorHex; div.addEventListener('click', () => updateColor(hexToRgbString(colorHex))); palette.appendChild(div); });
        container.appendChild(palette);
        const nativePickerTitle = document.createElement('p'); nativePickerTitle.textContent="Ou escolha uma cor customizada:"; nativePickerTitle.style.color="#bdc3c7"; nativePickerTitle.style.marginTop="15px"; nativePickerTitle.style.marginBottom="8px"; container.appendChild(nativePickerTitle);
        const inputContainer = document.createElement('div'); inputContainer.style.display='flex'; inputContainer.style.alignItems='center';
        inputContainer.style.gap='10px';
        const colorInput = document.createElement('input'); colorInput.type = 'color'; colorInput.value = rgbStringToHex(selectedColor); colorInput.style.width='80px'; colorInput.style.height='40px'; colorInput.style.border='none'; colorInput.style.padding='0'; colorInput.style.cursor='pointer';
        const colorRgbDisplay = document.createElement('span');
        colorRgbDisplay.textContent = selectedColor; colorRgbDisplay.style.fontFamily='monospace'; colorRgbDisplay.style.color='#ccc';
        colorInput.addEventListener('input', (event) => updateColor(hexToRgbString(event.target.value)));
        inputContainer.append(colorInput, colorRgbDisplay); container.appendChild(inputContainer);
        return container;
    };

    const showSolidColorPicker = async () => {
        if (!await checkActionRateLimit('themeUpdate', themeMessageDiv)) return;
        const currentSolidColor = currentUserData?.profileTheme?.color || (currentUserData?.profileTheme?.type === 'solid' ? currentUserData.profileTheme.color : 'rgb(40,40,40)');
        let chosenColor = currentSolidColor;
        if (!popupContent) return;
        popupContent.innerHTML = '<h3>Escolha uma Cor Sólida</h3>';
        const colorPicker = createColorPickerUI_Native(currentSolidColor, (newColor) => { chosenColor = newColor; });
        popupContent.appendChild(colorPicker);
        const actionsDiv = document.createElement('div'); actionsDiv.className = 'popup-actions';
        const applyButton = document.createElement('button'); applyButton.textContent = 'Aplicar Cor'; applyButton.className = 'popup-apply-button';
        applyButton.addEventListener('click', async () => {
            const theme = { type: 'solid', color: chosenColor, siteBaseColor: chosenColor };
            await saveProfileTheme(theme);
            closePopup();
        });
        actionsDiv.appendChild(applyButton); popupContent.appendChild(actionsDiv);
        openPopup();
    };

    const showGradientColorPicker = async () => {
        if (!await checkActionRateLimit('themeUpdate', themeMessageDiv)) return;
        const currentTheme = currentUserData?.profileTheme;
        let color1 = (currentTheme?.type === 'gradient' && currentTheme.color1) ? currentTheme.color1 : 'rgb(52, 73, 94)';
        let color2 = (currentTheme?.type === 'gradient' && currentTheme.color2) ? currentTheme.color2 : 'rgb(44, 62, 80)';
        if (!popupContent) return;
        popupContent.innerHTML = `<h3>Escolha as Cores do Gradiente</h3><div id="gradient-live-preview" style="width:100%; height:60px; border-radius:6px; border:1px solid #566573; margin-bottom:15px;"></div><div class="gradient-picker-area"><div class="gradient-color-control"><button id="pick-color-1" class="color-pick-trigger" style="background-color: ${color1};"></button><span>Cor de Cima</span></div><div class="gradient-color-control"><button id="pick-color-2" class="color-pick-trigger" style="background-color: ${color2};"></button><span>Cor de Baixo</span></div></div><div id="gradient-color-picker-slot"></div><div class="popup-actions"><button id="apply-gradient-button" class="popup-apply-button">Aplicar Gradiente</button></div>`;
        const gradientPreview = popupContent.querySelector('#gradient-live-preview'); const updateGradientPreview = () => { if(gradientPreview) gradientPreview.style.background = `linear-gradient(to bottom, ${color1}, ${color2})`; }; updateGradientPreview();
        const colorPickerSlot = popupContent.querySelector('#gradient-color-picker-slot');
        const createIndividualColorPicker_Native = (targetColorButtonId, initialColor, callback) => { if(!colorPickerSlot) return; colorPickerSlot.innerHTML = ''; const pTitle = document.createElement('h4'); pTitle.textContent = targetColorButtonId==='pick-color-1'?"Cor de Cima":"Cor de Baixo"; pTitle.style.color="#ecf0f1";pTitle.style.marginBottom="10px"; colorPickerSlot.appendChild(pTitle); const iPicker = createColorPickerUI_Native(initialColor, (nColor) => { callback(nColor); document.getElementById(targetColorButtonId).style.backgroundColor = nColor; updateGradientPreview(); }); colorPickerSlot.appendChild(iPicker); };
        const pColor1Btn = popupContent.querySelector('#pick-color-1');
        const pColor2Btn = popupContent.querySelector('#pick-color-2');
        if(pColor1Btn) pColor1Btn.addEventListener('click', () => createIndividualColorPicker_Native('pick-color-1', color1, (newColor) => { color1 = newColor; }));
        if(pColor2Btn) pColor2Btn.addEventListener('click', () => createIndividualColorPicker_Native('pick-color-2', color2, (newColor) => { color2 = newColor; }));
        const applyGradBtn = popupContent.querySelector('#apply-gradient-button');
        if(applyGradBtn) applyGradBtn.addEventListener('click', async () => {
            const theme = { type: 'gradient', color1: color1, color2: color2, siteBaseColor: color1 };
            await saveProfileTheme(theme);
            closePopup();
        });
        openPopup();
    };

    const saveProfileTheme = async (themeData) => {
        if (!currentUserForProfile) { showMessage(themeMessageDiv, 'Usuário não logado.', 'error'); return; }
        // O check de rate limit já foi feito antes de abrir o picker

        const userDocRef = doc(db, "users", currentUserForProfile.uid);
        const dataToUpdate = {
            profileTheme: { type: themeData.type, color: themeData.color || null, color1: themeData.color1 || null, color2: themeData.color2 || null, siteBaseColor: themeData.siteBaseColor }
        };
        try {
            await updateDoc(userDocRef, dataToUpdate);
            await recordActionTimestamp('themeUpdate', userDocRef);
            if(currentUserData) currentUserData.profileTheme = dataToUpdate.profileTheme;
            applyProfileThemeToPreview(dataToUpdate.profileTheme);
            if (dataToUpdate.profileTheme.siteBaseColor) {
                const siteBgColorObj = rgbStringToComponents(dataToUpdate.profileTheme.siteBaseColor);
                document.body.style.backgroundColor = lightenDarkenColor(siteBgColorObj, -0.3);
            }
            showMessage(themeMessageDiv, 'Tema do perfil salvo com sucesso!', 'success');
        } catch (error) {
            console.error("Erro ao salvar tema:", error);
            showMessage(themeMessageDiv, `Erro ao salvar tema: ${error.message}`);
        }
    };

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUserForProfile = user;
            if (currentEmailDisplay) currentEmailDisplay.textContent = user.email || 'Email não disponível';

            const userDocRef = doc(db, "users", user.uid);
            try {
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    currentUserData = userDocSnap.data();
                    currentUserData.uid = user.uid;
                    currentUserData.friendsCount = currentUserData.friendsCount || 0;
                    currentUserData.followersCount = currentUserData.followersCount || 0;
                    currentUserData.followingCount = currentUserData.followingCount || 0;
                    currentUserData.profileUpdateTimestamps = currentUserData.profileUpdateTimestamps || [];
                    currentUserData.profileUpdateCooldownUntil = currentUserData.profileUpdateCooldownUntil || null;
                    currentUserData.projectActionTimestamps = currentUserData.projectActionTimestamps || [];
                    currentUserData.projectActionCooldownUntil = currentUserData.projectActionCooldownUntil || null;
                    currentUserData.themeUpdateTimestamps = currentUserData.themeUpdateTimestamps || [];
                    currentUserData.themeUpdateCooldownUntil = currentUserData.themeUpdateCooldownUntil || null;
                    currentUserData.passwordChangeTimestamps = currentUserData.passwordChangeTimestamps || [];
                    currentUserData.passwordChangeCooldownUntil = currentUserData.passwordChangeCooldownUntil || null;
                    currentUserData.emailChangeTimestamps = currentUserData.emailChangeTimestamps || [];
                    currentUserData.emailChangeCooldownUntil = currentUserData.emailChangeCooldownUntil || null;
                    // NOVA INICIALIZAÇÃO PARA RATE LIMIT DE UPLOAD DE FOTO (SE DESEJADO SEPARADAMENTE)
                    // Por enquanto, o upload de foto usará o rate limit de 'profileUpdate' implicitamente.
                    // currentUserData.photoUploadTimestamps = currentUserData.photoUploadTimestamps || [];
                    // currentUserData.photoUploadCooldownUntil = currentUserData.photoUploadCooldownUntil || null;


                    if (userAuthSection) {
                        const displayName = currentUserData.displayName || user.displayName || user.email?.split('@')[0] || "Usuário";
                        const photoURL = currentUserData.photoURL || user.photoURL || 'imgs/default-avatar.png';
                        userAuthSection.innerHTML = `<a href="profile.html" class="user-info-link"><div class="user-info"><img id="user-photo" src="${photoURL}" alt="Foto"><span id="user-name">${displayName}</span></div></a>`;
                    }
                    if (profileUsernameInput) profileUsernameInput.value = currentUserData.displayName || '';
                    if (profilePhotoUrlInput) profilePhotoUrlInput.value = currentUserData.photoURL || '';
                    if (profilePhotoPreviewImg) profilePhotoPreviewImg.src = currentUserData.photoURL || 'imgs/default-avatar.png';
                    if (profileScratchUsernameInput) profileScratchUsernameInput.value = currentUserData.scratchUsername || '';
                    if (profilePronounsInput) profilePronounsInput.value = currentUserData.pronouns || '';
                    if (profileDescriptionInput) profileDescriptionInput.value = currentUserData.profileDescription || '';
                    if(profilePreviewPhoto) profilePreviewPhoto.src = currentUserData.photoURL || 'imgs/default-avatar.png';
                    if(profilePreviewDisplayName) profilePreviewDisplayName.textContent = currentUserData.displayName || 'Seu Nome Aqui';
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
                    console.warn("Documento do usuário NÃO encontrado no Firestore para UID:", user.uid);
                    currentUserData = {
                        uid: user.uid,
                        displayName: user.displayName || user.email?.split('@')[0] || "Usuário",
                        photoURL: user.photoURL || null,
                        friendsCount: 0, followersCount: 0, followingCount: 0,
                        scratchUsername: "", pronouns: "", profileDescription: "",
                        profileTheme: null,
                        profileUpdateTimestamps: [], profileUpdateCooldownUntil: null,
                        projectActionTimestamps: [], projectActionCooldownUntil: null,
                        themeUpdateTimestamps: [], themeUpdateCooldownUntil: null,
                        passwordChangeTimestamps: [], passwordChangeCooldownUntil: null,
                        emailChangeTimestamps: [], emailChangeCooldownUntil: null
                    };
                    applyProfileThemeToPreview(null);
                    document.body.style.backgroundColor = '';
                    if (profileUsernameInput) profileUsernameInput.value = currentUserData.displayName;
                     if (userAuthSection) { // Atualiza header mesmo se não houver doc no Firestore
                        const displayName = currentUserData.displayName;
                        const photoURL = currentUserData.photoURL || 'imgs/default-avatar.png';
                        userAuthSection.innerHTML = `<a href="profile.html" class="user-info-link"><div class="user-info"><img id="user-photo" src="${photoURL}" alt="Foto"><span id="user-name">${displayName}</span></div></a>`;
                    }
                }
            } catch (error) {
                console.error("Erro ao carregar dados do usuário do Firestore:", error);
                showMessage(profileMessageDiv, "Erro crítico ao carregar dados do perfil.", "error");
                currentUserData = { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL, profileUpdateTimestamps: [], profileUpdateCooldownUntil: null, projectActionTimestamps: [], projectActionCooldownUntil: null, themeUpdateTimestamps: [], themeUpdateCooldownUntil: null, passwordChangeTimestamps: [], passwordChangeCooldownUntil: null, emailChangeTimestamps: [], emailChangeCooldownUntil: null };
            }
            setupPasswordSectionUI(hasPasswordProvider(user));
            const hash = window.location.hash;
            if (hash === '#security') switchTab(tabSeguranca, sectionSeguranca);
            else if (hash === '#tema') switchTab(tabTema, sectionTema);
            else if (hash === '#jogos') switchTab(tabJogos, sectionJogos);
            else switchTab(tabPerfil, sectionPerfil);
            if (hash) window.location.hash = '';
        } else {
            window.location.href = 'login.html';
        }
    });

    if (tabPerfil) tabPerfil.addEventListener('click', () => switchTab(tabPerfil, sectionPerfil));
    if (tabSeguranca) tabSeguranca.addEventListener('click', () => switchTab(tabSeguranca, sectionSeguranca));
    if (tabTema) tabTema.addEventListener('click', () => switchTab(tabTema, sectionTema));
    if (tabJogos) tabJogos.addEventListener('click', () => switchTab(tabJogos, sectionJogos));

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

    // --- LÓGICA DE UPLOAD DE FOTO DE PERFIL ---
    if (triggerPhotoUploadButton && profilePhotoUploadInput) {
        triggerPhotoUploadButton.addEventListener('click', () => {
            profilePhotoUploadInput.click();
        });

        profilePhotoUploadInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            if (!currentUserForProfile || !currentUserData) {
                showMessage(photoUploadMessageDiv, "Usuário não autenticado.", "error");
                return;
            }

            // Checar rate limit para 'profileUpdate' (upload de foto é uma forma de update de perfil)
            // Poderia ter um rate limit específico para 'photoUpload' se desejado.
            if (!await checkActionRateLimit('profileUpdate', photoUploadMessageDiv)) {
                profilePhotoUploadInput.value = ''; // Limpa o input para permitir nova seleção após cooldown
                return;
            }

            // Validar tipo de arquivo
            if (!file.type.startsWith('image/')) {
                showMessage(photoUploadMessageDiv, 'Tipo de arquivo inválido. Por favor, selecione uma imagem.', 'error');
                profilePhotoUploadInput.value = '';
                return;
            }

            // Validar tamanho do arquivo (200KB)
            const maxSizeInBytes = 200 * 1024;
            if (file.size > maxSizeInBytes) {
                showMessage(photoUploadMessageDiv, `Arquivo muito grande (max. 200KB). Tamanho: ${(file.size / 1024).toFixed(1)}KB`, 'error');
                profilePhotoUploadInput.value = '';
                return;
            }

            showMessage(photoUploadMessageDiv, '', 'info'); // Limpa mensagem anterior
            if(photoUploadProgressTextDiv) {
                photoUploadProgressTextDiv.textContent = 'Enviando 0%...';
                photoUploadProgressTextDiv.style.display = 'block';
            }
            triggerPhotoUploadButton.disabled = true;

            // Criar referência no Firebase Storage. Usando um nome fixo para sobrescrever.
            // A extensão do arquivo original não é mantida aqui para simplificar a referência,
            // o Storage infere o contentType no upload.
            const storagePath = `profile_photos/${currentUserForProfile.uid}/profilePicture`;
            const storageRef = ref(storage, storagePath);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if(photoUploadProgressTextDiv) photoUploadProgressTextDiv.textContent = `Enviando ${Math.round(progress)}%...`;
                },
                (error) => {
                    console.error("Erro no upload da foto:", error);
                    let errorMessage = "Erro ao enviar imagem.";
                    switch (error.code) {
                        case 'storage/unauthorized':
                            errorMessage = "Você não tem permissão para enviar esta imagem.";
                            break;
                        case 'storage/canceled':
                            errorMessage = "Upload cancelado.";
                            break;
                        case 'storage/unknown':
                            errorMessage = "Ocorreu um erro desconhecido no servidor.";
                            break;
                        case 'storage/object-not-found':
                             errorMessage = "Arquivo de destino não encontrado (erro interno, avise o suporte).";
                            break;
                        case 'storage/quota-exceeded':
                            errorMessage = "Cota de armazenamento excedida.";
                            break;
                        case 'storage/unauthenticated':
                            errorMessage = "Usuário não autenticado para o upload.";
                            break;
                        // Adicione mais casos conforme necessário
                    }
                    showMessage(photoUploadMessageDiv, errorMessage, 'error');
                    if(photoUploadProgressTextDiv) photoUploadProgressTextDiv.style.display = 'none';
                    triggerPhotoUploadButton.disabled = false;
                    profilePhotoUploadInput.value = ''; // Limpa o input
                },
                async () => { // Upload completo
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        const userDocRef = doc(db, "users", currentUserForProfile.uid);

                        // Atualizar Firestore e Auth
                        await updateDoc(userDocRef, { photoURL: downloadURL });
                        await updateAuthProfile(currentUserForProfile, { photoURL: downloadURL });

                        // Atualizar dados locais e UI
                        if (currentUserData) currentUserData.photoURL = downloadURL;
                        if (profilePhotoPreviewImg) profilePhotoPreviewImg.src = downloadURL;
                        if (profilePhotoUrlInput) profilePhotoUrlInput.value = downloadURL; // Atualiza o campo de URL também
                        if (profilePreviewPhoto) profilePreviewPhoto.src = downloadURL;
                        const headerUserPhoto = document.getElementById('user-photo');
                        if (headerUserPhoto) headerUserPhoto.src = downloadURL;

                        await recordActionTimestamp('profileUpdate', userDocRef); // Registra a ação de profileUpdate

                        showMessage(photoUploadMessageDiv, 'Foto de perfil atualizada com sucesso!', 'success');
                        if(photoUploadProgressTextDiv) photoUploadProgressTextDiv.style.display = 'none';

                    } catch (updateError) {
                        console.error("Erro ao atualizar URL da foto no perfil:", updateError);
                        showMessage(photoUploadMessageDiv, 'Erro ao salvar a nova foto de perfil.', 'error');
                        if(photoUploadProgressTextDiv) photoUploadProgressTextDiv.style.display = 'none';
                    } finally {
                        triggerPhotoUploadButton.disabled = false;
                        profilePhotoUploadInput.value = '';
                    }
                }
            );
        });
    }
    // --- FIM DA LÓGICA DE UPLOAD DE FOTO DE PERFIL ---


    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUserForProfile || !currentUserData) {
                showMessage(profileMessageDiv, "Não autenticado ou dados não carregados.", "error"); return;
            }
            if (!await checkActionRateLimit('profileUpdate', profileMessageDiv)) return;

            const newUsername = profileUsernameInput.value.trim();
            const newPhotoURLFromInput = profilePhotoUrlInput.value.trim() || null; // Pode ter sido atualizado pelo upload
            const newScratchUsername = profileScratchUsernameInput.value.trim();
            const newPronouns = profilePronounsInput.value.trim();
            const newDescription = profileDescriptionInput.value.trim();
            let isValidUrl = true;
            if (newPhotoURLFromInput) { try { new URL(newPhotoURLFromInput); } catch (_) { isValidUrl = false; } }
            if (newPhotoURLFromInput && !isValidUrl) { showMessage(profileMessageDiv, 'URL da foto inválido.'); return; }

            // Se uma nova foto foi uploadada, currentUserData.photoURL já está atualizado.
            // Se o usuário editou a URL manualmente, usamos newPhotoURLFromInput.
            // Priorizamos a URL vinda do input manual se ela for diferente da que está em currentUserData (que pode ter vindo do upload recente).
            let finalPhotoURL = currentUserData.photoURL; // Assume a foto atual (pode ser do upload)
            if (newPhotoURLFromInput !== currentUserData.photoURL) { // Se a URL do input manual é diferente
                finalPhotoURL = newPhotoURLFromInput; // Usa a do input manual
            }


            const authProfileUpdates = {};
            if (newUsername !== (currentUserData.displayName || currentUserForProfile.displayName || '')) authProfileUpdates.displayName = newUsername;
            // A foto no Auth é atualizada pelo upload ou aqui se a URL manual for diferente
            if (finalPhotoURL !== (currentUserData.photoURL || currentUserForProfile.photoURL || "")) {
                 authProfileUpdates.photoURL = finalPhotoURL;
            }


            const firestoreProfileFieldsToUpdate = {
                displayName: newUsername,
                displayName_lowercase: newUsername.toLowerCase(),
                photoURL: finalPhotoURL, // Usa a URL final decidida
                scratchUsername: newScratchUsername,
                pronouns: newPronouns,
                profileDescription: newDescription,
            };

            showMessage(profileMessageDiv, 'Salvando perfil...', 'info');
            const userDocRef = doc(db, "users", currentUserForProfile.uid);
            try {
                await updateDoc(userDocRef, firestoreProfileFieldsToUpdate);
                if (Object.keys(authProfileUpdates).length > 0) {
                    await updateAuthProfile(currentUserForProfile, authProfileUpdates);
                }
                await recordActionTimestamp('profileUpdate', userDocRef);

                Object.assign(currentUserData, firestoreProfileFieldsToUpdate); // Atualiza localmente
                // Atualiza UI
                const finalDisplayNameForUI = newUsername || currentUserForProfile.email.split('@')[0];
                const finalPhotoURLForUI = finalPhotoURL || 'imgs/default-avatar.png';
                if(document.getElementById('user-name')) document.getElementById('user-name').textContent = finalDisplayNameForUI;
                if(document.getElementById('user-photo')) document.getElementById('user-photo').src = finalPhotoURLForUI;
                if(profilePhotoPreviewImg) profilePhotoPreviewImg.src = finalPhotoURLForUI; // Pré-visualização do formulário
                if(profilePreviewPhoto) profilePreviewPhoto.src = finalPhotoURLForUI; // Pré-visualização do tema
                if(profilePreviewDisplayName) profilePreviewDisplayName.textContent = newUsername || 'Seu Nome Aqui';
                if(profilePreviewPronouns) profilePreviewPronouns.textContent = newPronouns || 'Seus Pronomes';
                if(profilePreviewDescription) profilePreviewDescription.textContent = newDescription || 'Sua bio apareceria aqui...';

                showMessage(profileMessageDiv, 'Perfil atualizado!', 'success');
            } catch (error) {
                console.error("Erro ao atualizar perfil:", error);
                showMessage(profileMessageDiv, `Erro ao atualizar perfil: ${error.message}`);
            }
        });
    }

    async function reauthenticateUser(currentPassword) {
        if (!currentUserForProfile.email) {
            throw new Error("Email do usuário não disponível para reautenticação.");
        }
        const credential = EmailAuthProvider.credential(currentUserForProfile.email, currentPassword);
        await reauthenticateWithCredential(currentUserForProfile, credential);
    }

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUserForProfile || !currentUserData) { showMessage(passwordMessageDiv, "Não autenticado.", "error"); return; }
            if (!await checkActionRateLimit('passwordChange', passwordMessageDiv)) return;

            const newP = newPasswordInput.value, confirmP = confirmNewPasswordInput.value;
            if (newP.length < 6) { showMessage(passwordMessageDiv, 'Senha muito curta (mín. 6).'); return; }
            if (newP !== confirmP) { showMessage(passwordMessageDiv, 'Senhas não coincidem.'); return; }
            showMessage(passwordMessageDiv, 'Processando...', 'info', 0); // 0 para não sumir

            try {
                if (hasPasswordProvider(currentUserForProfile)) {
                    const currentP = currentPasswordInput.value;
                    if (!currentP) { showMessage(passwordMessageDiv, 'Senha atual necessária.'); return; }
                    await reauthenticateUser(currentP);
                }
                await updatePassword(currentUserForProfile, newP);
                await recordActionTimestamp('passwordChange', doc(db, "users", currentUserForProfile.uid));
                showMessage(passwordMessageDiv, 'Senha alterada/definida com sucesso!', 'success');
                changePasswordForm.reset();
                setupPasswordSectionUI(true);
                localStorage.removeItem(`declinedSetPassword_${currentUserForProfile.uid}`);
            } catch (error) {
                console.error("Erro ao alterar senha:", error);
                let msg = `Erro: ${error.message || 'Falha ao alterar senha.'}`;
                if (error.code === 'auth/wrong-password') msg = 'Senha atual incorreta.';
                else if (error.code === 'auth/requires-recent-login') msg = 'Login recente necessário. Faça login novamente e tente de novo.';
                showMessage(passwordMessageDiv, msg);
            }
        });
    }

    if (changeEmailForm) {
        changeEmailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUserForProfile || !currentUserData) { showMessage(emailMessageDiv, "Não autenticado.", "error"); return; }
            if (!await checkActionRateLimit('emailChange', emailMessageDiv)) return;

            if (!currentUserForProfile.email) {
                showMessage(emailMessageDiv, "Email do usuário atual não encontrado para reautenticação.");
                return;
            }
            const currentP = emailCurrentPasswordInput.value;
            const newE = newEmailInput.value.trim();
            if (!currentP) { showMessage(emailMessageDiv, 'Senha atual necessária.'); return; }
            if (!newE) { showMessage(emailMessageDiv, 'Novo email necessário.'); return; }
            if (newE === currentUserForProfile.email) { showMessage(emailMessageDiv, 'Email igual ao atual.'); return; }
            showMessage(emailMessageDiv, 'Processando...', 'info', 0); // 0 para não sumir

            try {
                await reauthenticateUser(currentP); // Reautentica com a senha atual
                await verifyBeforeUpdateEmail(currentUserForProfile, newE); // Envia email de verificação para o NOVO email
                await recordActionTimestamp('emailChange', doc(db, "users", currentUserForProfile.uid));
                showMessage(emailMessageDiv, 'Email de verificação enviado para o novo endereço! Confirme para concluir a alteração.', 'success', 15000);
                changeEmailForm.reset();
            } catch (error) {
                console.error("Erro ao alterar email:", error);
                let msg = `Erro: ${error.message || 'Falha ao alterar email.'}`;
                if (error.code === 'auth/wrong-password') msg = 'Senha atual incorreta.';
                else if (error.code === 'auth/email-already-in-use') msg = 'Este novo email já está em uso por outra conta.';
                else if (error.code === 'auth/invalid-email') msg = 'Novo email inválido.';
                else if (error.code === 'auth/requires-recent-login') msg = 'Login recente necessário. Faça login novamente e tente de novo.';
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
            if (!currentUserForProfile || !currentUserData) { showMessage(accountActionMessageDiv, "Não autenticado ou dados do usuário não carregados.", "error"); return; }
            let passwordPromptMessage = "ATENÇÃO! Para DELETAR sua conta PERMANENTEMENTE, insira sua senha atual. Esta ação NÃO PODE SER DESFEITA.";
            if (!hasPasswordProvider(currentUserForProfile)) {
                passwordPromptMessage = "ATENÇÃO! Você está logado com um provedor externo (ex: Google) e não definiu uma senha para esta conta. DELETAR sua conta é PERMANENTE e NÃO PODE SER DESFEITO. Digite 'DELETAR' para confirmar.";
            }
            const confirmationInput = prompt(passwordPromptMessage);
            if (confirmationInput === null) { showMessage(accountActionMessageDiv, "Exclusão de conta cancelada.", "info"); return; }
            showMessage(accountActionMessageDiv, "Processando exclusão de conta...", "info", 0);
            try {
                if (hasPasswordProvider(currentUserForProfile)) {
                    if (!confirmationInput) { showMessage(accountActionMessageDiv, "Senha atual é obrigatória para deletar a conta."); return; }
                     await reauthenticateUser(confirmationInput);
                } else {
                    if (confirmationInput.toUpperCase() !== 'DELETAR') {
                        showMessage(accountActionMessageDiv, "Confirmação incorreta. Exclusão cancelada."); return;
                    }
                }
                const uid = currentUserForProfile.uid;
                const userFirestoreDataForDelete = currentUserData;
                if (userFirestoreDataForDelete && userFirestoreDataForDelete.friendId) {
                    try {
                        await deleteFirestoreDoc(doc(db, "friendIdMappings", userFirestoreDataForDelete.friendId));
                        console.log("Mapeamento Friend ID deletado.");
                    }
                    catch (mapError) { console.error("Erro ao deletar mapeamento Friend ID:", mapError); }
                }
                // Excluir subcoleções como projects, friends, followers, etc.
                const subcollectionsToDelete = ['scratchProjects', 'friends', 'followers', 'following', 'friendRequestsSent', 'friendRequestsReceived'];
                for (const subcoll of subcollectionsToDelete) {
                    const subcollRef = collection(db, `users/${uid}/${subcoll}`);
                    const subcollSnap = await getDocs(subcollRef);
                    const deleteSubcollBatch = writeBatch(db);
                    subcollSnap.docs.forEach(docItem => deleteSubcollBatch.delete(docItem.ref));
                    await deleteSubcollBatch.commit();
                    console.log(`Subcoleção ${subcoll} de ${uid} deletada.`);
                }
                 // Excluir foto do Storage, se houver
                if (currentUserData.photoURL && currentUserData.photoURL.includes('firebasestorage.googleapis.com')) {
                    try {
                        // O caminho usado para o upload foi `profile_photos/${uid}/profilePicture`
                        const photoPath = `profile_photos/${uid}/profilePicture`;
                        const photoStorageRef = ref(storage, photoPath);
                        await deleteObject(photoStorageRef);
                        console.log("Foto de perfil do Storage deletada.");
                    } catch (storageError) {
                        if (storageError.code !== 'storage/object-not-found') { // Ignora se o arquivo não existe
                           console.error("Erro ao deletar foto de perfil do Storage:", storageError);
                        }
                    }
                }

                await deleteFirestoreDoc(doc(db, "users", uid));
                console.log("Documento do usuário no Firestore deletado.");
                await deleteUser(currentUserForProfile);
                showMessage(accountActionMessageDiv, "Conta deletada com sucesso. Você será redirecionado.", "success", 0);
                setTimeout(() => { window.location.href = 'index.html'; }, 3500);
            } catch (error) {
                console.error("Erro ao deletar conta:", error);
                let msg = `Erro: ${error.message || 'Falha ao deletar conta.'}`;
                if (error.code === 'auth/wrong-password') msg = 'Senha atual incorreta. Exclusão falhou.';
                else if (error.code === 'auth/requires-recent-login') msg = 'Login recente necessário. Faça login novamente e tente de novo.';
                showMessage(accountActionMessageDiv, msg);
            }
        });
    }


    async function handleSaveScratchProject() {
        if (!currentUserForProfile || !currentUserData) {
            showMessage(scratchProjectMessageDiv, "Você precisa estar logado."); return;
        }
        if (!await checkActionRateLimit('projectAction', scratchProjectMessageDiv)) return;
        const projectLink = scratchProjectLinkInput.value.trim();
        const customTitle = scratchProjectTitleInput.value.trim();
        const customDescription = scratchProjectDescInput.value.trim();
        if (!projectLink && !editingScratchProjectDocId) {
            showMessage(scratchProjectMessageDiv, "Por favor, insira o link do projeto Scratch."); return;
        }
        if (!customTitle) {
            showMessage(scratchProjectMessageDiv, "Por favor, defina um título para o projeto."); return;
        }
        if (!customDescription) {
            showMessage(scratchProjectMessageDiv, "Por favor, adicione uma descrição para o projeto."); return;
        }
        const projectIdFromLink = extractScratchProjectId(projectLink);
        addScratchProjectButton.disabled = true;
        const actionVerb = editingScratchProjectDocId ? "Salvando alterações" : "Adicionando projeto";
        showMessage(scratchProjectMessageDiv, `${actionVerb}...`, "info", 0);
        try {
            const projectsRef = collection(db, `users/${currentUserForProfile.uid}/scratchProjects`);
            const userDocRef = doc(db, "users", currentUserForProfile.uid);

            if (editingScratchProjectDocId) {
                const projectDocRef = doc(db, `users/${currentUserForProfile.uid}/scratchProjects`, editingScratchProjectDocId);
                const projectToUpdateData = { customTitle: customTitle, customDescription: customDescription };
                await updateDoc(projectDocRef, projectToUpdateData);
                await recordActionTimestamp('projectAction', userDocRef);
                showMessage(scratchProjectMessageDiv, `Projeto "${customTitle}" atualizado!`, "success");
                resetScratchProjectForm();
            } else {
                if (!projectIdFromLink) {
                    showMessage(scratchProjectMessageDiv, "Link inválido ou ID do projeto não encontrado.");
                    addScratchProjectButton.disabled = false; return;
                }
                const qExisting = query(projectsRef, where("projectId", "==", projectIdFromLink));
                const existingSnap = await getDocs(qExisting);
                if (!existingSnap.empty) {
                    showMessage(scratchProjectMessageDiv, "Este projeto Scratch já foi adicionado.", "error");
                    addScratchProjectButton.disabled = false; return;
                }
                const thumbnailUrl = `https://uploads.scratch.mit.edu/projects/thumbnails/${projectIdFromLink}.png`;
                const projectUrl = `https://scratch.mit.edu/projects/${projectIdFromLink}/`;
                const currentProjectsSnap = await getDocs(query(projectsRef, orderBy("orderIndex", "desc"), limit(1)));
                let nextOrderIndex = 0;
                if (!currentProjectsSnap.empty) {
                    const lastProject = currentProjectsSnap.docs[0].data();
                    nextOrderIndex = (lastProject.orderIndex || 0) + 1;
                }
                const newProjectEntryUser = {
                    projectId: projectIdFromLink, customTitle: customTitle, customDescription: customDescription,
                    thumbnailUrl: thumbnailUrl, projectUrl: projectUrl,
                    addedAt: serverTimestamp(), orderIndex: nextOrderIndex
                };
                await addDoc(projectsRef, newProjectEntryUser);
                await recordActionTimestamp('projectAction', userDocRef);
                showMessage(scratchProjectMessageDiv, `Projeto "${customTitle}" adicionado!`, "success");
                resetScratchProjectForm();
            }
        } catch (error) {
            console.error(`Erro ao ${actionVerb.toLowerCase()} projeto Scratch:`, error);
            showMessage(scratchProjectMessageDiv, `Erro ao ${actionVerb.toLowerCase()} projeto: ${error.message}`);
        } finally {
            addScratchProjectButton.disabled = false;
        }
    }

    async function handleDeleteScratchProject(docId, projectTitle) {
        if (!currentUserForProfile || !docId || !currentUserData) return;
        if (!await checkActionRateLimit('projectAction', scratchProjectMessageDiv)) return;

        if (confirm(`Tem certeza que deseja remover o projeto "${projectTitle}" da sua lista?`)) {
            showMessage(scratchProjectMessageDiv, "Removendo projeto...", "info", 0);
            try {
                const projectDocRefUser = doc(db, `users/${currentUserForProfile.uid}/scratchProjects`, docId);
                await deleteFirestoreDoc(projectDocRefUser);
                await recordActionTimestamp('projectAction', doc(db, "users", currentUserForProfile.uid));
                showMessage(scratchProjectMessageDiv, `Projeto "${projectTitle}" removido.`, "success");
                if (editingScratchProjectDocId === docId) {
                    cancelEditScratchProject();
                }
            } catch (error) {
                console.error("Erro ao remover projeto:", error);
                showMessage(scratchProjectMessageDiv, "Erro ao remover projeto.", "error");
            }
        }
    }

    async function handleMoveProject(docIdToMove, direction) {
        if (!currentUserForProfile || !docIdToMove || userScratchProjects.length < 2 || !currentUserData) return;
        if (!await checkActionRateLimit('projectAction', scratchProjectMessageDiv)) return;
        const projectIndex = userScratchProjects.findIndex(p => p.docId === docIdToMove);
        if (projectIndex === -1) return;
        let otherProjectIndex;
        if (direction === 'up' && projectIndex > 0) {
            otherProjectIndex = projectIndex - 1;
        } else if (direction === 'down' && projectIndex < userScratchProjects.length - 1) {
            otherProjectIndex = projectIndex + 1;
        } else { return; }
        const projectToMove = userScratchProjects[projectIndex];
        const otherProject = userScratchProjects[otherProjectIndex];
        const orderIndexToMove = projectToMove.orderIndex === undefined ? projectIndex : projectToMove.orderIndex;
        const orderIndexOfOther = otherProject.orderIndex === undefined ? otherProjectIndex : otherProject.orderIndex;
        const batch = writeBatch(db);
        const projectToMoveRef = doc(db, `users/${currentUserForProfile.uid}/scratchProjects`, projectToMove.docId);
        const otherProjectRef = doc(db, `users/${currentUserForProfile.uid}/scratchProjects`, otherProject.docId);
        batch.update(projectToMoveRef, { orderIndex: orderIndexOfOther });
        batch.update(otherProjectRef, { orderIndex: orderIndexToMove });
        try {
            await batch.commit();
            await recordActionTimestamp('projectAction', doc(db, "users", currentUserForProfile.uid));
            showMessage(scratchProjectMessageDiv, `Projeto "${projectToMove.customTitle}" movido.`, "info", 3000);
        } catch (error) {
            console.error("Erro ao mover projeto:", error);
            showMessage(scratchProjectMessageDiv, "Erro ao mover projeto.", "error");
        }
    }

    function extractScratchProjectId(url) {
        if (!url) return null;
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname === 'scratch.mit.edu' && urlObj.pathname.startsWith('/projects/')) {
                const parts = urlObj.pathname.split('/');
                const projectId = parts[2];
                if (projectId && /^\d+$/.test(projectId)) {
                    return projectId;
                }
            }
        } catch (e) {
            console.error("URL inválida:", e.message);
            return null;
        }
        return null;
    }

    function resetScratchProjectForm() {
        if(scratchProjectLinkInput) scratchProjectLinkInput.value = '';
        if(scratchProjectTitleInput) scratchProjectTitleInput.value = '';
        if(scratchProjectDescInput) scratchProjectDescInput.value = '';
        if(addScratchProjectButton) {
            addScratchProjectButton.textContent = 'Adicionar Projeto';
            addScratchProjectButton.disabled = false;
        }
        if(scratchProjectLinkInput) scratchProjectLinkInput.disabled = false;
        editingScratchProjectDocId = null;

        const cancelButton = document.getElementById('cancel-edit-scratch-project-button');
        if (cancelButton) {
            cancelButton.remove();
        }
    }

    function handleEditScratchProject(project) {
        if (!project || !scratchProjectLinkInput || !scratchProjectTitleInput || !scratchProjectDescInput || !addScratchProjectButton) return;
        editingScratchProjectDocId = project.docId;
        scratchProjectLinkInput.value = project.projectUrl || `https://scratch.mit.edu/projects/${project.projectId}/`;
        scratchProjectLinkInput.disabled = true;
        scratchProjectTitleInput.value = project.customTitle || '';
        scratchProjectDescInput.value = project.customDescription || '';
        addScratchProjectButton.textContent = 'Salvar Alterações';
        if (!document.getElementById('cancel-edit-scratch-project-button')) {
            const cancelButton = document.createElement('button');
            cancelButton.id = 'cancel-edit-scratch-project-button';
            cancelButton.textContent = 'Cancelar Edição';
            cancelButton.type = 'button'; // importante para não submeter o form
            cancelButton.classList.add('action-button', 'secondary'); // Classes para estilo
            cancelButton.style.marginLeft = '10px';
            cancelButton.addEventListener('click', cancelEditScratchProject);
            addScratchProjectButton.parentNode.insertBefore(cancelButton, addScratchProjectButton.nextSibling);
        }
        scratchProjectTitleInput.focus();
    }

    function cancelEditScratchProject() {
        resetScratchProjectForm();
        showMessage(scratchProjectMessageDiv, "Edição cancelada.", "info", 3000);
    }

    function renderUserScratchProjects(projects) {
        if (!scratchProjectsListUl || !scratchProjectsEmptyMessageP) return;
        scratchProjectsListUl.innerHTML = '';
        if (projects.length === 0) {
            scratchProjectsEmptyMessageP.style.display = 'block';
            return;
        }
        scratchProjectsEmptyMessageP.style.display = 'none';
        projects.forEach((project, index) => {
            const li = document.createElement('li');
            li.className = 'scratch-project-item';
            li.dataset.docId = project.docId;
            li.dataset.projectId = project.projectId;
            li.dataset.orderIndex = project.orderIndex || 0;
            const imgLink = document.createElement('a');
            imgLink.href = project.projectUrl;
            imgLink.target = "_blank";
            imgLink.rel = "noopener noreferrer";
            const img = document.createElement('img');
            img.src = project.thumbnailUrl;
            img.alt = `Thumbnail de ${project.customTitle}`;
            img.onerror = function() {
                this.src = 'imgs/default-scratch-thumb.png';
                this.alt = 'Thumbnail indisponível';
            };
            imgLink.appendChild(img);
            const title = document.createElement('p');
            title.textContent = project.customTitle;
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'project-actions';
            const upButton = document.createElement('button');
            upButton.innerHTML = '&#9650;';
            upButton.className = 'action-button reorder-button up';
            upButton.title = "Mover para Cima";
            upButton.disabled = (index === 0);
            upButton.addEventListener('click', (e) => {
                e.stopPropagation();
                handleMoveProject(project.docId, 'up');
            });
            const downButton = document.createElement('button');
            downButton.innerHTML = '&#9660;';
            downButton.className = 'action-button reorder-button down';
            downButton.title = "Mover para Baixo";
            downButton.disabled = (index === projects.length - 1);
            downButton.addEventListener('click', (e) => {
                e.stopPropagation();
                handleMoveProject(project.docId, 'down');
            });
            const editButton = document.createElement('button');
            editButton.className = 'action-button edit-button';
            editButton.title = "Editar Projeto";
            const editIcon = document.createElement('img');
            editIcon.src = 'imgs/edit.svg';
            editIcon.alt = 'Editar';
            editButton.appendChild(editIcon);
            editButton.addEventListener('click', (e) => {
                e.stopPropagation();
                handleEditScratchProject(project);
            });
            const deleteButton = document.createElement('button');
            deleteButton.className = 'action-button danger'; // Removido textContent para usar ícone
            deleteButton.title = "Remover Projeto";
            const deleteIcon = document.createElement('img'); // Usar ícone de lixeira
            deleteIcon.src = 'imgs/trashbin.png';
            deleteIcon.alt = 'Remover';
            deleteIcon.className = 'btn-icon-small';
            deleteButton.appendChild(deleteIcon);
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                handleDeleteScratchProject(project.docId, project.customTitle);
            });
            actionsDiv.append(upButton, downButton, editButton, deleteButton);
            li.append(imgLink, title, actionsDiv);
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
                    <h4>Descrição Personalizada:</h4>
                    <p style="white-space: pre-wrap; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.1); padding: 10px; border-radius: 4px; border: 1px solid #444;">
                        ${project.customDescription || "Nenhuma descrição fornecida."}
                    </p>
                    <div class="popup-actions" style="margin-top: 20px; text-align: center;">
                         <a href="${project.projectUrl}" target="_blank" rel="noopener noreferrer" class="popup-apply-button" style="background-color: #007bff; color: white; text-decoration:none; padding: 10px 15px; border-radius: 5px;">
                            Ver no Scratch
                         </a>
                    </div>
                `;
                openPopup();
            });
            scratchProjectsListUl.appendChild(li);
        });
    }

    async function listenToUserScratchProjects() {
        if (!currentUserForProfile) return;
        if (scratchProjectsLoadingDiv) scratchProjectsLoadingDiv.style.display = 'block';
        if (scratchProjectsEmptyMessageP) scratchProjectsEmptyMessageP.style.display = 'none';
        const projectsRef = collection(db, `users/${currentUserForProfile.uid}/scratchProjects`);
        const qProjects = query(projectsRef, orderBy("orderIndex", "asc"), orderBy("addedAt", "desc"));
        if (projectsListenerUnsubscribe) {
            projectsListenerUnsubscribe();
        }
        projectsListenerUnsubscribe = onSnapshot(qProjects, (snapshot) => {
            userScratchProjects = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
            renderUserScratchProjects(userScratchProjects);
            if (scratchProjectsLoadingDiv) scratchProjectsLoadingDiv.style.display = 'none';
        }, (error) => {
            console.error("Erro ao carregar projetos Scratch:", error);
            showMessage(scratchProjectMessageDiv, "Erro ao carregar seus projetos Scratch.");
            if (scratchProjectsLoadingDiv) scratchProjectsLoadingDiv.style.display = 'none';
            if (scratchProjectsListUl) scratchProjectsListUl.innerHTML = `<li class="list-placeholder error">Falha ao carregar projetos.</li>`;
        });
    }

    if (addScratchProjectButton) {
        addScratchProjectButton.addEventListener('click', handleSaveScratchProject);
    }

    if (btnThemeProfile) {
        btnThemeProfile.addEventListener('click', async () => {
            if (!await checkActionRateLimit('themeUpdate', themeMessageDiv)) return;

            if (!popupContent) return;
            popupContent.innerHTML = `<h3>Escolha o tipo de tema para o perfil</h3><div class="theme-type-selection"><button class="theme-type-button" data-type="solid"><img src="imgs/solidcolor.png" alt="Cor Sólida"><span>Cor Sólida</span></button><button class="theme-type-button" data-type="gradient"><img src="imgs/gradient.png" alt="Gradiente"><span>Gradiente</span></button></div>`;
            openPopup();
            popupContent.querySelectorAll('.theme-type-button').forEach(button => {
                button.addEventListener('click', (e) => {
                    const type = e.currentTarget.dataset.type;
                    if (type === 'solid') showSolidColorPicker();
                    else if (type === 'gradient') showGradientColorPicker();
                });
            });
        });
    }

    console.log("David's Farm profile script (vCom Upload de Foto e Rate Limit Extensivo) carregado!");
});