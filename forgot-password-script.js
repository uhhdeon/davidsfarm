// forgot-password-script.js
import { auth } from './firebase-config.js';
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const emailInputForgot = document.getElementById('email-input-forgot');
    const resetPasswordButton = document.getElementById('reset-password-button');
    const authStatusDiv = document.getElementById('auth-status');

    if (resetPasswordButton) {
        resetPasswordButton.addEventListener('click', () => {
            const email = emailInputForgot.value.trim();
            authStatusDiv.textContent = ''; // Limpa mensagens anteriores
            authStatusDiv.className = 'auth-status';


            if (!email) {
                authStatusDiv.textContent = 'Por favor, insira seu endereço de email.';
                return;
            }

            sendPasswordResetEmail(auth, email)
                .then(() => {
                    authStatusDiv.textContent = 'Email de redefinição enviado! Verifique sua caixa de entrada (e spam).';
                    authStatusDiv.className = 'success auth-status';
                })
                .catch((error) => {
                    console.error("Erro ao enviar email de redefinição:", error);
                    authStatusDiv.textContent = `Erro: ${mapFirebaseAuthError(error.code)}`;
                });
        });
    }
    function mapFirebaseAuthError(errorCode) {
        // ... (função mapFirebaseAuthError, pode ser mais genérica ou específica)
        switch (errorCode) {
            case 'auth/invalid-email': return 'Formato de email inválido.';
            case 'auth/user-not-found': return 'Nenhum usuário encontrado com este email.';
            default: return `Erro desconhecido (${errorCode})`;
        }
    }
});