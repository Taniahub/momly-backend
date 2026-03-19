const express = require('express');
const router = express.Router();
const { registro, registroCompleto, login, getGuias, registrarBienestar, getBienestar, 
    verificarCorreo, crearCita, getCitas, eliminarCita, getVacunas, marcarVacuna, 
    desmarcarVacuna, getBebe, getBiblioteca,getEsNormal, getAcompanamiento, 
    getSugerencias} = require('../controllers/authController');

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
router.get('/vacunas/:id_bebe', getVacunas);
router.post('/vacunas', marcarVacuna);
router.delete('/vacunas/:id_vacuna_bebe', desmarcarVacuna);
router.get('/bebe/:id_usuario', getBebe);
router.get('/biblioteca', getBiblioteca);
router.get('/es-normal', getEsNormal);
router.get('/acompanamiento/:estado', getAcompanamiento);
router.get('/sugerencias/:meses', getSugerencias);

module.exports = router;