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
            const res = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, email })
            });
            const data = await res.json();
            if (res.ok) {
                registerResult.textContent = data.message;
                registerResult.style.color = 'green';
                // Mostra QR code per Google Authenticator
                if (data.qr) {
                    qrContainer.innerHTML = `<p>Scansiona questo QR code con Google Authenticator:</p><img src='${data.qr}' alt='QR Google Authenticator' style='width:200px'><p>Se non puoi scansionare, usa questo codice manuale:<br><b>${data.otpauth}</b></p>`;
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
        try {
            const res = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok && data.mfa) {
                document.getElementById('mfaSection').style.display = 'block';
                showMessage('Login corretto! Controlla la console del backend per il codice MFA.', 'blue');
                sessionStorage.setItem('mfa_user', username);
            } else {
                showMessage(data.message, 'red');
            }
        } catch (err) {
            showMessage('Errore di rete!', 'red');
        }
    });

    // MFA verifica
    document.getElementById('verifyMfaBtn').addEventListener('click', async function() {
        const inputCode = document.getElementById('mfaCodeInput').value;
        const username = sessionStorage.getItem('mfa_user');
        const mfaMsg = document.getElementById('mfaMessage');
        try {
            const res = await fetch('http://localhost:3000/api/verify-mfa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, code: inputCode })
            });
            const data = await res.json();
            if (res.ok) {
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
        } catch (err) {
            mfaMsg.textContent = 'Errore di rete!';
            mfaMsg.style.color = 'red';
        }
    });

    function showMessage(msg, color) {
        messageDiv.textContent = msg;
        messageDiv.style.color = color;
    }
});
