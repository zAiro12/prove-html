const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const otplib = require('otplib');
const qrcode = require('qrcode');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// In-memory user store (solo per demo, NON usare in produzione)
const users = {};

// Documentazione API - Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MFA Demo API',
      version: '1.0.0',
      description: 'API demo per login, registrazione e MFA'
    },
    servers: [
      { url: 'http://localhost:3000' }
    ]
  },
  apis: [__filename],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Registrazione
/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Registra un nuovo utente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *             required:
 *               - username
 *               - password
 *               - email
 *     responses:
 *       200:
 *         description: Registrazione avvenuta con successo
 *       400:
 *         description: Dati mancanti
 *       409:
 *         description: Utente già registrato
 */
app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password || !email) {
        return res.status(400).json({ message: 'Dati mancanti' });
    }
    if (users[username]) {
        return res.status(409).json({ message: 'Utente già registrato' });
    }
    // Genera secret TOTP per Google Authenticator
    const secret = otplib.authenticator.generateSecret();
    users[username] = { password, email, secret };
    // Genera otpauth URL e QR code
    const otpauth = otplib.authenticator.keyuri(username, 'MFA-Demo', secret);
    const qr = await qrcode.toDataURL(otpauth);
    res.json({ message: 'Registrazione avvenuta con successo', qr, otpauth });
});

// Login
/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Login utente e invio codice MFA
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - username
 *               - password
 *     responses:
 *       200:
 *         description: Login corretto, codice MFA inviato
 *       401:
 *         description: Username o password errati
 */
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users[username];
    if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Username o password errati' });
    }
    // Login corretto, ora serve MFA TOTP
    res.json({ message: 'Login corretto, inserisci il codice MFA generato da Google Authenticator', mfa: true });
});

// Verifica MFA
/**
 * @swagger
 * /api/verify-mfa:
 *   post:
 *     summary: Verifica codice MFA
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               code:
 *                 type: string
 *             required:
 *               - username
 *               - code
 *     responses:
 *       200:
 *         description: Accesso completato!
 *       401:
 *         description: Codice MFA errato!
 */
app.post('/api/verify-mfa', (req, res) => {
    const { username, code } = req.body;
    const user = users[username];
    if (!user || !user.secret) {
        return res.status(401).json({ message: 'Utente non trovato o MFA non configurato' });
    }
    const isValid = otplib.authenticator.check(code, user.secret);
    if (isValid) {
        return res.json({ message: 'Accesso completato!' });
    }
    res.status(401).json({ message: 'Codice MFA errato!' });
});

app.listen(port, () => {
    console.log(`Backend API in ascolto su http://localhost:${port}`);
});
