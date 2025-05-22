// Base URL centralizzato per tutte le chiamate API
const API_BASE_URL = 'http://localhost:3000';
// const API_BASE_URL = 'https://l6n7dj74-3000.euw.devtunnels.ms';

// Gestione login e registrazione demo

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const messageDiv = document.getElementById('message');

    // Registrazione
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        const email = document.getElementById('registerEmail').value;
        const registerResult = document.getElementById('registerResult');
        const qrContainer = document.getElementById('qrContainer');
        try {
            const res = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, email })
            });
            const data = await res.json();
            if (res.ok) {
                registerResult.textContent = data.message;
                registerResult.style.color = 'green';
                // Mostra QR code per Google Authenticator e campo verifica codice
                if (data.qr) {
                    qrContainer.innerHTML = `
                        <p>Scansiona questo QR code con Google Authenticator:</p>
                        <img src='${data.qr}' alt='QR Google Authenticator' style='width:200px'>
                        <p>Se non puoi scansionare, usa questo codice manuale:<br>
                        <a href='${data.otpauth}' target='_blank'><b>Apri App</b></a></p>
                        <div id="verifyAfterRegister">
                            <label for="registerMfaCode">Inserisci il codice MFA generato dall'app:</label><br>
                            <input type="text" id="registerMfaCode" placeholder="Codice MFA"><br>
                            <button id="verifyRegisterMfaBtn">Verifica Codice</button>
                            <div id="registerMfaMsg"></div>
                        </div>
                    `;
                    document.getElementById('verifyRegisterMfaBtn').onclick = async function() {
                        const mfaCode = document.getElementById('registerMfaCode').value;
                        const mfaMsg = document.getElementById('registerMfaMsg');
                        try {
                            const res = await fetch(`${API_BASE_URL}/api/verify-mfa`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username, code: mfaCode })
                            });
                            const data = await res.json();
                            if (res.ok) {
                                mfaMsg.textContent = data.message + ' (Registrazione e MFA completati!)';
                                mfaMsg.style.color = 'green';
                            } else {
                                mfaMsg.textContent = data.message;
                                mfaMsg.style.color = 'red';
                            }
                        } catch (err) {
                            mfaMsg.textContent = 'Errore di rete!';
                            mfaMsg.style.color = 'red';
                        }
                    };
                } else {
                    qrContainer.innerHTML = '';
                }
            } else {
                registerResult.textContent = data.message;
                registerResult.style.color = 'red';
                qrContainer.innerHTML = '';
            }
        } catch (err) {
            registerResult.textContent = 'Errore di rete!';
            registerResult.style.color = 'red';
            qrContainer.innerHTML = '';
        }
    });

    // Login
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const { ok, data } = await safeFetchJson(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (ok && data.mfa) {
            document.getElementById('mfaSection').style.display = 'block';
            showMessage('Login corretto! Controlla la console del backend per il codice MFA.', 'blue');
            sessionStorage.setItem('mfa_user', username);
        } else {
            showMessage(data.message, 'red');
        }
    });

    // MFA verifica
    document.getElementById('verifyMfaBtn').addEventListener('click', async function() {
        const inputCode = document.getElementById('mfaCodeInput').value;
        const username = sessionStorage.getItem('mfa_user');
        const mfaMsg = document.getElementById('mfaMessage');
        const { ok, data } = await safeFetchJson(`${API_BASE_URL}/api/verify-mfa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, code: inputCode })
        });
        if (ok) {
            mfaMsg.textContent = data.message;
            mfaMsg.style.color = 'green';
            // Mostra area riservata
            setTimeout(() => {
                document.querySelector('.container').innerHTML = `
                    <h2>Area Riservata</h2>
                    <p>Benvenuto, <b>${username}</b>! Hai effettuato l'accesso con successo tramite MFA.</p>
                    <button id="logoutBtn">Logout</button>
                `;
                document.getElementById('logoutBtn').onclick = function() {
                    window.location.reload();
                };
            }, 1000);
        } else {
            mfaMsg.textContent = data.message;
            mfaMsg.style.color = 'red';
        }
    });

    function showMessage(msg, color) {
        messageDiv.textContent = msg;
        messageDiv.style.color = color;
    }
});
