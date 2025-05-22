// social.js - login/registrazione usando le API esistenti
const API_BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', function() {
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');
    const welcomeSection = document.getElementById('welcomeSection');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginMessage = document.getElementById('loginMessage');
    const registerMessage = document.getElementById('registerMessage');
    const welcomeUser = document.getElementById('welcomeUser');

    document.getElementById('showRegister').onclick = function(e) {
        e.preventDefault();
        loginSection.style.display = 'none';
        registerSection.style.display = 'block';
    };
    document.getElementById('showLogin').onclick = function(e) {
        e.preventDefault();
        registerSection.style.display = 'none';
        loginSection.style.display = 'block';
    };

    loginForm.onsubmit = async function(e) {
        e.preventDefault();
        loginMessage.textContent = '';
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        try {
            const res = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok && data.mfa) {
                // Login ok, mostra area riservata (senza MFA per demo social)
                loginSection.style.display = 'none';
                welcomeSection.style.display = 'block';
                welcomeUser.textContent = username;
            } else {
                loginMessage.textContent = data.message || 'Login fallito';
                loginMessage.style.color = 'red';
            }
        } catch (err) {
            loginMessage.textContent = 'Errore di rete!';
            loginMessage.style.color = 'red';
        }
    };

    registerForm.onsubmit = async function(e) {
        e.preventDefault();
        registerMessage.textContent = '';
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        const email = document.getElementById('registerEmail').value;
        try {
            const res = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, email })
            });
            const data = await res.json();
            if (res.ok) {
                registerMessage.textContent = 'Registrazione completata! Ora puoi accedere.';
                registerMessage.style.color = 'green';
                setTimeout(() => {
                    registerSection.style.display = 'none';
                    loginSection.style.display = 'block';
                }, 1200);
            } else {
                registerMessage.textContent = data.message || 'Registrazione fallita';
                registerMessage.style.color = 'red';
            }
        } catch (err) {
            registerMessage.textContent = 'Errore di rete!';
            registerMessage.style.color = 'red';
        }
    };

    // SOCIAL LOGIN
    document.getElementById('googleLogin').onclick = function() {
        window.location.href = `${API_BASE_URL}/auth/google`;
    };
    document.getElementById('facebookLogin').onclick = function() {
        window.location.href = `${API_BASE_URL}/auth/facebook`;
    };
    document.getElementById('githubLogin').onclick = function() {
        window.location.href = `${API_BASE_URL}/auth/github`;
    };

    document.getElementById('logoutBtn').onclick = function() {
        welcomeSection.style.display = 'none';
        loginSection.style.display = 'block';
        loginForm.reset();
    };

    // Se login social: leggi parametri da URL e mostra area riservata
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'success' && urlParams.get('user')) {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('registerSection').style.display = 'none';
        document.getElementById('welcomeSection').style.display = 'block';
        document.getElementById('welcomeUser').textContent = urlParams.get('user');
        // Pulisci la query string per evitare ripetizioni
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});
