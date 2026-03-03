const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/auth', authRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ ok: true, mensaje: '🌸 MOMLY API funcionando' });
});

// Puerto
const PORT = process.env.PORT || 3000;

// Iniciar servidor
const iniciarServidor = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🌸 Servidor corriendo en el puerto ${PORT}`);
  });
};

iniciarServidor();