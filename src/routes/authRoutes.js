const express = require('express');
const router = express.Router();
const { registro, registroCompleto, login, getGuias, registrarBienestar, getBienestar, verificarCorreo, crearCita, getCitas, eliminarCita } = require('../controllers/authController');

router.post('/registro', registro);
router.post('/login', login);
router.post('/registro-completo', registroCompleto);
router.get('/guias', getGuias);
router.post('/bienestar', registrarBienestar);
router.get('/bienestar/:id_usuario', getBienestar);
router.post('/verificar-correo', verificarCorreo);
router.post('/citas', crearCita);
router.get('/citas/:id_usuario', getCitas);
router.delete('/citas/:id_cita', eliminarCita);

module.exports = router;