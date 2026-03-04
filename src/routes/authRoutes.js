const express = require('express');
const router = express.Router();
const { registro, registroCompleto, login, getGuias } = require('../controllers/authController');
const express = require('express');
const { registro, registroCompleto, login, getGuias, registrarBienestar, getBienestar } = require('../controllers/authController');

// POST /api/auth/registro
router.post('/registro', registro);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/registro-completo
router.post('/registro-completo', registroCompleto);

// GET /api/auth/guias
router.get('/guias', getGuias);

// POST /api/auth/bienestar
router.post('/bienestar', registrarBienestar);

// GET /api/auth/bienestar/:id
router.get('/bienestar/:id_usuario', getBienestar);

module.exports = router;
// POST /api/auth/registro
router.post('/registro', registro);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/registro-completo
router.post('/registro-completo', registroCompleto);

// POST /api/auth/guias
router.get('/guias', getGuias);

module.exports = router;