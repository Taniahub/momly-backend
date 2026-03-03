const express = require('express');
const router = express.Router();
const { registro, registroCompleto, login, getGuias } = require('../controllers/authController');

// POST /api/auth/registro
router.post('/registro', registro);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/registro-completo
router.post('/registro-completo', registroCompleto);

// POST /api/auth/guias
router.get('/guias', getGuias);

module.exports = router;