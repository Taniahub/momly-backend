const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.get("/", (req, res) => {
  res.status(200).send("MOMLY backend OK ✅");
});

// Middlewares
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Rutas
app.use('/api/auth', authRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ ok: true, mensaje: '🌸 MOMLY API funcionando' });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      ok: false,
      mensaje: '📸 La imagen es demasiado grande. Máximo permitido: 20MB'
    });
  }

  console.error(err);
  res.status(500).json({
    ok: false,
    mensaje: 'Error interno del servidor'
  });
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