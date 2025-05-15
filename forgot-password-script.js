// forgot-password-script.js
import { auth } from './firebase-config.js';
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const emailInputForgot = document.getElementById('email-input-forgot');
    const resetPasswordButton = document.getElementById('reset-password-button');
    const authStatusDiv = document.getElementById('auth-status');

    const showMessage = (message, type = 'error') => {
        authStatusDiv.textContent = message;
        authStatusDiv.className = 'auth-status ' + (type === 'success' ? 'success' : '');
    };

    if (resetPasswordButton) {
        resetPasswordButton.addEventListener('click', () => {
            const email = emailInputForgot.value.trim();
            showMessage('');

            if (!email) {
                showMessage('Por favor, insira seu endereço de email.');
                return;
            }

            sendPasswordResetEmail(auth, email)
                .then(() => {
                    showMessage('Email de redefinição enviado! Verifique sua caixa de entrada (e spam).', 'success');
                })
                .catch((error) => showMessage(`Erro: ${mapFirebaseAuthError(error.code)}`));
        });
    }

    function mapFirebaseAuthError(errorCode) {
        switch (errorCode) {
            case 'auth/invalid-email': return 'Formato de email inválido.';
            case 'auth/user-not-found': return 'Nenhum usuário encontrado com este email.';
            default: return `Erro desconhecido (${errorCode})`;
        }
    }
});