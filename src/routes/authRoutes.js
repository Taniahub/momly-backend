const express = require('express');
const router = express.Router();
const { registro, registroCompleto, login, getGuias, registrarBienestar, getBienestar } = require('../controllers/authController');

router.post('/registro', registro);
router.post('/login', login);
router.post('/registro-completo', registroCompleto);
router.get('/guias', getGuias);
router.post('/bienestar', registrarBienestar);
router.get('/bienestar/:id_usuario', getBienestar);

module.exports = router;