const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const otplib = require('otplib');
const qrcode = require('qrcode');
require('dotenv').config();
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Connessione a MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
    console.log('Connesso a MongoDB');
}).catch((err) => {
    console.error('Errore connessione MongoDB:', err);
});

// Modello utente
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    secret: { type: String, required: true }
}));

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
    if (await User.findOne({ username })) {
        return res.status(409).json({ message: 'Utente già registrato' });
    }
    // Genera secret TOTP per Google Authenticator
    const secret = otplib.authenticator.generateSecret();
    const user = new User({ username, password, email, secret });
    await user.save();
    // Genera otpauth URL e QR code
    const otpauth = otplib.authenticator.keyuri(username, 'MFA-Demo', secret);
    const qr = await qrcode.toDataURL(otpauth);
    res.json({ message: 'Registrazione avvenuta con successo', qr: qr, otpauth: otpauth });
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
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
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
app.post('/api/verify-mfa', async (req, res) => {
    const { username, code } = req.body;
    const user = await User.findOne({ username });
    if (!user || !user.secret) {
        return res.status(401).json({ message: 'Utente non trovato o MFA non configurato' });
    }
    const isValid = otplib.authenticator.check(code, user.secret);
    if (isValid) {
        return res.json({ message: 'Accesso completato!' });
    }
    res.status(401).json({ message: 'Codice MFA errato!' });
});

// Cancella utente
/**
 * @swagger
 * /api/delete-user:
 *   delete:
 *     summary: Cancella un utente tramite username o email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Utente cancellato con successo
 *       400:
 *         description: Username o email richiesto
 *       404:
 *         description: Utente non trovato
 */
app.delete('/api/delete-user', async (req, res) => {
    const { username, email } = req.body;
    if (!username && !email) {
        return res.status(400).json({ message: 'Username o email richiesto' });
    }
    const query = username ? { username } : { email };
    const result = await User.deleteOne(query);
    if (result.deletedCount === 1) {
        return res.json({ message: 'Utente cancellato con successo' });
    } else {
        return res.status(404).json({ message: 'Utente non trovato' });
    }
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Ottieni la lista di tutti gli utenti
 *     responses:
 *       200:
 *         description: Lista utenti
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   username:
 *                     type: string
 *                   email:
 *                     type: string
 */
app.get('/api/users', async (req, res) => {
    const users = await User.find({}, { username: 1, email: 1, _id: 0 });
    res.json(users);
});

// Configura express-session
app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecret',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Serializzazione utente per sessione
passport.serializeUser((user, done) => {
    done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// GOOGLE STRATEGY
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ email: profile.emails[0].value });
        if (!user) {
            user = await User.create({
                username: profile.displayName,
                password: '',
                email: profile.emails[0].value,
                secret: 'social'
            });
        }
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

// FACEBOOK STRATEGY
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: '/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'emails']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let email = (profile.emails && profile.emails[0]) ? profile.emails[0].value : `${profile.id}@facebook.com`;
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({
                username: profile.displayName,
                password: '',
                email,
                secret: 'social'
            });
        }
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

// GITHUB STRATEGY
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: '/auth/github/callback',
    scope: ['user:email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let email = (profile.emails && profile.emails[0]) ? profile.emails[0].value : `${profile.username}@github.com`;
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({
                username: profile.username,
                password: '',
                email,
                secret: 'social'
            });
        }
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

// Serve file statici per social login (per redirect post-login)
app.use('/social', express.static(__dirname + '/../social'));

// ROUTE SOCIAL LOGIN
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/social/social.html',
    session: true
}), function(req, res) {
    res.redirect('/social/social.html?login=success&user=' + encodeURIComponent(req.user.username));
});

app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
app.get('/auth/facebook/callback', passport.authenticate('facebook', {
    failureRedirect: '/social/social.html',
    session: true
}), function(req, res) {
    res.redirect('/social/social.html?login=success&user=' + encodeURIComponent(req.user.username));
});

app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
app.get('/auth/github/callback', passport.authenticate('github', {
    failureRedirect: '/social/social.html',
    session: true
}), function(req, res) {
    res.redirect('/social/social.html?login=success&user=' + encodeURIComponent(req.user.username));
});

app.listen(port, () => {
    console.log(`Backend API in ascolto su http://localhost:${port}`);
});
