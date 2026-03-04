const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// ─── REGISTRO SIMPLE ────────────────────────────────────────
const registro = async (req, res) => {
  try {
    const { nombre, correo, password } = req.body;
    if (!nombre || !correo || !password)
      return res.status(400).json({ ok: false, mensaje: 'Todos los campos son obligatorios' });

    const [usuarioExistente] = await pool.query('SELECT id_usuario FROM usuarios WHERE correo = ?', [correo]);
    if (usuarioExistente.length > 0)
      return res.status(409).json({ ok: false, mensaje: 'Este correo ya está registrado' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const [resultado] = await pool.query(
      'INSERT INTO usuarios (nombre, correo, password) VALUES (?, ?, ?)',
      [nombre, correo, passwordHash]
    );

    const token = jwt.sign({ id: resultado.insertId, correo }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    return res.status(201).json({
      ok: true, mensaje: 'Usuario registrado exitosamente', token,
      usuario: { id: resultado.insertId, nombre, correo, tipo_usuario: 'free' },
    });
  } catch (error) {
    console.error('Error en registro:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

// ─── REGISTRO COMPLETO (usuario + bebé) ─────────────────────
const registroCompleto = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { nombre, correo, password, bebe } = req.body;

    if (!nombre || !correo || !password)
      return res.status(400).json({ ok: false, mensaje: 'Todos los campos del usuario son obligatorios' });
    if (!bebe || !bebe.nombre || !bebe.fecha_nacimiento || !bebe.genero)
      return res.status(400).json({ ok: false, mensaje: 'Todos los campos del bebé son obligatorios' });

    const [usuarioExistente] = await connection.query('SELECT id_usuario FROM usuarios WHERE correo = ?', [correo]);
    if (usuarioExistente.length > 0)
      return res.status(409).json({ ok: false, mensaje: 'Este correo ya está registrado' });

    await connection.beginTransaction();

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const [resultadoUsuario] = await connection.query(
      'INSERT INTO usuarios (nombre, correo, password) VALUES (?, ?, ?)',
      [nombre, correo, passwordHash]
    );
    const idUsuario = resultadoUsuario.insertId;

    await connection.query(
      'INSERT INTO bebes (id_usuario, nombre, fecha_nacimiento, genero) VALUES (?, ?, ?, ?)',
      [idUsuario, bebe.nombre, bebe.fecha_nacimiento, bebe.genero]
    );

    await connection.commit();

    const token = jwt.sign({ id: idUsuario, correo }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    return res.status(201).json({
      ok: true, mensaje: 'Cuenta creada exitosamente', token,
      usuario: { id: idUsuario, nombre, correo, tipo_usuario: 'free' },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error en registroCompleto:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
};

// ─── LOGIN ──────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { correo, password } = req.body;
    if (!correo || !password)
      return res.status(400).json({ ok: false, mensaje: 'Correo y contraseña son obligatorios' });

    const [usuarios] = await pool.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
    if (usuarios.length === 0)
      return res.status(401).json({ ok: false, mensaje: 'Credenciales incorrectas' });

    const usuario = usuarios[0];
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida)
      return res.status(401).json({ ok: false, mensaje: 'Credenciales incorrectas' });

    const token = jwt.sign(
      { id: usuario.id_usuario, correo: usuario.correo },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    return res.status(200).json({
      ok: true, mensaje: 'Login exitoso', token,
      usuario: { id: usuario.id_usuario, nombre: usuario.nombre, correo: usuario.correo, tipo_usuario: usuario.tipo_usuario },
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

const getGuias = async (req, res) => {
  try {
    const [categorias] = await pool.query('SELECT * FROM categorias_contenido');
    const [contenidos] = await pool.query(
      "SELECT * FROM contenidos WHERE tipo = ? AND es_premium = ?",
      ["guia", 0]
    );
    const resultado = categorias.map(cat => ({
      ...cat,
      guias: contenidos.filter(c => c.id_categoria === cat.id_categoria)
    }));

    return res.status(200).json({ ok: true, data: resultado });
  } catch (error) {
    console.error('Error en getGuias:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

const registrarBienestar = async (req, res) => {
  try {
    const { id_usuario, estado_emocional, nivel_descanso, nivel_energia, nota } = req.body;

    if (!id_usuario || !estado_emocional || !nivel_descanso || !nivel_energia)
      return res.status(400).json({ ok: false, mensaje: 'Todos los campos son obligatorios' });

    await pool.query(
      'INSERT INTO registro_bienestar (id_usuario, estado_emocional, nivel_descanso, nivel_energia, nota) VALUES (?, ?, ?, ?, ?)',
      [id_usuario, estado_emocional, nivel_descanso, nivel_energia, nota || '']
    );

    return res.status(201).json({ ok: true, mensaje: 'Registro guardado exitosamente' });
  } catch (error) {
    console.error('Error en registrarBienestar:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

const getBienestar = async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const [registros] = await pool.query(
      'SELECT * FROM registro_bienestar WHERE id_usuario = ? ORDER BY fecha_registro DESC LIMIT 7',
      [id_usuario]
    );
    return res.status(200).json({ ok: true, data: registros });
  } catch (error) {
    console.error('Error en getBienestar:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }

};


module.exports = { registro, registroCompleto, login, getGuias, registrarBienestar, getBienestar };