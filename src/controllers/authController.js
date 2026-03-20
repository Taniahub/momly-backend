const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const nodemailer = require('nodemailer');


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

    // ✅ AGREGA ESTO AQUÍ
    const fechaNac = new Date(bebe.fecha_nacimiento);
    const hoy = new Date();
    const hace3anios = new Date();
    hace3anios.setFullYear(hoy.getFullYear() - 3);

    if (fechaNac > hoy)
      return res.status(400).json({ ok: false, mensaje: 'La fecha de nacimiento no puede ser futura' });
    if (fechaNac < hace3anios)
      return res.status(400).json({ ok: false, mensaje: 'MOMLY es para bebés de 0 a 3 años 💕' });

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
    const [categorias] = await pool.query(
      'SELECT * FROM categorias_contenido WHERE id_categoria IN (1, 2)'
    );
    const [contenidos] = await pool.query(
      'SELECT * FROM contenidos WHERE tipo = ? AND es_premium = ?',
      ['guia', 0]
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

const verificarCorreo = async (req, res) => {
  try {
    const { correo } = req.body;
    console.log('Verificando correo:', correo); 
    const [existe] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE correo = ?', [correo]
    );
    console.log('Resultado:', existe); 
    if (existe.length > 0)
      return res.status(409).json({ ok: false, mensaje: 'Este correo ya está registrado' });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error en verificarCorreo:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' }); // ← este es el que probablemente está llegando
  }
};

// ─── CITAS ──────────────────────────────────────────────────
const crearCita = async (req, res) => {
  try {
    const { id_usuario, titulo, descripcion, fecha_hora, recordatorio } = req.body;
    if (!id_usuario || !titulo || !fecha_hora)
      return res.status(400).json({ ok: false, mensaje: 'Título y fecha son obligatorios' });

    const [resultado] = await pool.query(
      'INSERT INTO citas (id_usuario, titulo, descripcion, fecha_hora, recordatorio) VALUES (?, ?, ?, ?, ?)',
      [id_usuario, titulo, descripcion || '', fecha_hora, recordatorio || 0]
    );
    return res.status(201).json({ ok: true, mensaje: 'Cita creada exitosamente', id: resultado.insertId });
  } catch (error) {
    console.error('Error en crearCita:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

const getCitas = async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const [citas] = await pool.query(
      'SELECT * FROM citas WHERE id_usuario = ? ORDER BY fecha_hora ASC',
      [id_usuario]
    );
    return res.status(200).json({ ok: true, data: citas });
  } catch (error) {
    console.error('Error en getCitas:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

const eliminarCita = async (req, res) => {
  try {
    const { id_cita } = req.params;
    await pool.query('DELETE FROM citas WHERE id_cita = ?', [id_cita]);
    return res.status(200).json({ ok: true, mensaje: 'Cita eliminada exitosamente' });
  } catch (error) {
    console.error('Error en eliminarCita:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

// ─── VACUNAS ─────────────────────────────────────────────────
const getVacunas = async (req, res) => {
  try {
    const { id_bebe } = req.params;
    const [vacunas] = await pool.query('SELECT * FROM vacunas ORDER BY edad_aplicacion_meses ASC');
    const [aplicadas] = await pool.query('SELECT * FROM vacunas_bebe WHERE id_bebe = ?', [id_bebe]);

    const resultado = vacunas.map(v => ({
      ...v,
      aplicada: aplicadas.some(a => a.id_vacuna === v.id_vacuna),
      fecha_aplicacion: aplicadas.find(a => a.id_vacuna === v.id_vacuna)?.fecha_aplicacion || null,
      observaciones: aplicadas.find(a => a.id_vacuna === v.id_vacuna)?.observaciones || null,
      id_vacuna_bebe: aplicadas.find(a => a.id_vacuna === v.id_vacuna)?.id_vacuna_bebe || null,
    }));

    return res.status(200).json({ ok: true, data: resultado });
  } catch (error) {
    console.error('Error en getVacunas:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

const marcarVacuna = async (req, res) => {
  try {
    const { id_bebe, id_vacuna, fecha_aplicacion, observaciones } = req.body;
    if (!id_bebe || !id_vacuna) return res.status(400).json({ ok: false, mensaje: 'Datos incompletos' });

    await pool.query(
      'INSERT INTO vacunas_bebe (id_bebe, id_vacuna, fecha_aplicacion, observaciones) VALUES (?, ?, ?, ?)',
      [id_bebe, id_vacuna, fecha_aplicacion || null, observaciones || null]
    );
    return res.status(201).json({ ok: true, mensaje: 'Vacuna registrada exitosamente' });
  } catch (error) {
    console.error('Error en marcarVacuna:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

const desmarcarVacuna = async (req, res) => {
  try {
    const { id_vacuna_bebe } = req.params;
    await pool.query('DELETE FROM vacunas_bebe WHERE id_vacuna_bebe = ?', [id_vacuna_bebe]);
    return res.status(200).json({ ok: true, mensaje: 'Vacuna desmarcada exitosamente' });
  } catch (error) {
    console.error('Error en desmarcarVacuna:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

const getBebe = async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const [bebes] = await pool.query('SELECT * FROM bebes WHERE id_usuario = ? LIMIT 1', [id_usuario]);
    if (bebes.length === 0) return res.status(404).json({ ok: false, mensaje: 'No se encontró bebé' });
    return res.status(200).json({ ok: true, data: bebes[0] });
  } catch (error) {
    console.error('Error en getBebe:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

// ─── BIBLIOTECA ─────────────────────────────────────────────
const getBiblioteca = async (req, res) => {
  try {
    const [categorias] = await pool.query(
      'SELECT * FROM categorias_contenido WHERE id_categoria IN (3,4,5,6)'
    );
    const [contenidos] = await pool.query(
      'SELECT * FROM contenidos WHERE tipo = ? AND es_premium = ?',
      ['articulo', 0]
    );
    const resultado = categorias.map(cat => ({
      ...cat,
      articulos: contenidos.filter(c => c.id_categoria === cat.id_categoria)
    }));
    return res.status(200).json({ ok: true, data: resultado });
  } catch (error) {
    console.error('Error en getBiblioteca:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

// ─── ES NORMAL ───────────────────────────────────────────────
const getEsNormal = async (req, res) => {
  try {
    const [preguntas] = await pool.query('SELECT * FROM es_normal ORDER BY categoria, id_pregunta');
    return res.status(200).json({ ok: true, data: preguntas });
  } catch (error) {
    console.error('Error en getEsNormal:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

// ─── ACOMPAÑAMIENTO EMOCIONAL ────────────────────────────────
const getAcompanamiento = async (req, res) => {
  try {
    const { estado } = req.params;
    const [resultado] = await pool.query(
      'SELECT * FROM acompanamiento_emocional WHERE estado_emocional = ? LIMIT 1',
      [estado]
    );
    if (resultado.length === 0)
      return res.status(404).json({ ok: false, mensaje: 'No se encontró acompañamiento para este estado' });
    return res.status(200).json({ ok: true, data: resultado[0] });
  } catch (error) {
    console.error('Error en getAcompanamiento:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

// ─── SUGERENCIAS DESARROLLO ──────────────────────────────────
const getSugerencias = async (req, res) => {
  try {
    const { meses } = req.params;
    const [sugerencias] = await pool.query(
      'SELECT * FROM sugerencias_desarrollo WHERE mes_inicio <= ? AND mes_fin >= ?',
      [meses, meses]
    );
    return res.status(200).json({ ok: true, data: sugerencias });
  } catch (error) {
    console.error('Error en getSugerencias:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

// ─── SUSCRIPCION PREMIUM ─────────────────────────────────────
const activarPremium = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_usuario, meses } = req.body;
    if (!id_usuario || !meses) return res.status(400).json({ ok: false, mensaje: 'Datos incompletos' });

    const fecha_inicio = new Date();
    const fecha_fin = new Date();
    fecha_fin.setMonth(fecha_fin.getMonth() + meses);

    await connection.beginTransaction();

    await connection.query('INSERT INTO suscripciones (id_usuario, fecha_inicio, fecha_fin, estado) VALUES (?, ?, ?, ?)',
    [id_usuario, fecha_inicio.toISOString().slice(0, 10), fecha_fin.toISOString().slice(0, 10), 'activa']
    );

    await connection.query(
      'UPDATE usuarios SET tipo_usuario = "premium" WHERE id_usuario = ?',
      [id_usuario]
    );

    await connection.commit();
    return res.status(201).json({ ok: true, mensaje: 'Suscripcion premium activada exitosamente', fecha_fin: fecha_fin.toISOString().slice(0, 10) });
  } catch (error) {
    await connection.rollback();
    console.error('Error en activarPremium:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
};

const getSuscripcion = async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const [suscripciones] = await pool.query(
      'SELECT * FROM suscripciones WHERE id_usuario = ? AND estado = ? ORDER BY fecha_fin DESC LIMIT 1',
      [id_usuario, 'activa']
    );
    const [usuario] = await pool.query('SELECT tipo_usuario FROM usuarios WHERE id_usuario = ?', [id_usuario]);
    return res.status(200).json({ ok: true, data: { suscripcion: suscripciones[0] || null, tipo_usuario: usuario[0]?.tipo_usuario } });
  } catch (error) {
    console.error('Error en getSuscripcion:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

// ─── COMUNIDAD ───────────────────────────────────────────────
const getPublicaciones = async (req, res) => {
  try {
    const [publicaciones] = await pool.query(`
      SELECT p.id_publicacion, p.contenido, p.anonimo, p.fecha_publicacion, p.estado,
        CASE WHEN p.anonimo = 1 THEN 'Mama Anonima' ELSE u.nombre END as nombre_usuario,
        COUNT(c.id_comentario) as total_comentarios
      FROM publicaciones p
      LEFT JOIN usuarios u ON p.id_usuario = u.id_usuario
      LEFT JOIN comentarios c ON p.id_publicacion = c.id_publicacion
      WHERE p.estado = 'activo'
      GROUP BY p.id_publicacion
      ORDER BY p.fecha_publicacion DESC
    `);
    return res.status(200).json({ ok: true, data: publicaciones });
  } catch (error) {
    console.error('Error en getPublicaciones:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

const crearPublicacion = async (req, res) => {
  try {
    const { id_usuario, contenido, anonimo } = req.body;
    if (!id_usuario || !contenido)
      return res.status(400).json({ ok: false, mensaje: 'Contenido obligatorio' });

    const [resultado] = await pool.query(
      'INSERT INTO publicaciones (id_usuario, contenido, anonimo, estado) VALUES (?, ?, ?, ?)',
      [id_usuario, contenido, anonimo || 0, 'activo']
    );
    return res.status(201).json({ ok: true, mensaje: 'Publicacion creada exitosamente', id: resultado.insertId });
  } catch (error) {
    console.error('Error en crearPublicacion:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

const getComentarios = async (req, res) => {
  try {
    const { id_publicacion } = req.params;
    const [comentarios] = await pool.query(`
      SELECT c.id_comentario, c.comentario, c.fecha, u.nombre
      FROM comentarios c
      LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
      WHERE c.id_publicacion = ?
      ORDER BY c.fecha ASC
    `, [id_publicacion]);
    return res.status(200).json({ ok: true, data: comentarios });
  } catch (error) {
    console.error('Error en getComentarios:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

const crearComentario = async (req, res) => {
  try {
    const { id_publicacion, id_usuario, comentario } = req.body;
    if (!id_publicacion || !id_usuario || !comentario)
      return res.status(400).json({ ok: false, mensaje: 'Datos incompletos' });

    await pool.query(
      'INSERT INTO comentarios (id_publicacion, id_usuario, comentario) VALUES (?, ?, ?)',
      [id_publicacion, id_usuario, comentario]
    );
    return res.status(201).json({ ok: true, mensaje: 'Comentario agregado exitosamente' });
  } catch (error) {
    console.error('Error en crearComentario:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

const eliminarPublicacion = async (req, res) => {
  try {
    const { id_publicacion } = req.params;
    await pool.query('UPDATE publicaciones SET estado = "moderado" WHERE id_publicacion = ?', [id_publicacion]);
    return res.status(200).json({ ok: true, mensaje: 'Publicacion eliminada exitosamente' });
  } catch (error) {
    console.error('Error en eliminarPublicacion:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};


// ─── ESPECIALISTAS ───────────────────────────────────────────
const getEspecialistas = async (req, res) => {
  try {
    const [especialistas] = await pool.query('SELECT * FROM especialistas');
    return res.status(200).json({ ok: true, data: especialistas });
  } catch (error) {
    console.error('Error en getEspecialistas:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

const agendarConsulta = async (req, res) => {
  try {
    const { id_usuario, id_especialista, fecha } = req.body;
    if (!id_usuario || !id_especialista || !fecha)
      return res.status(400).json({ ok: false, mensaje: 'Datos incompletos' });

    const [usuario] = await pool.query('SELECT tipo_usuario FROM usuarios WHERE id_usuario = ?', [id_usuario]);
    if (usuario[0]?.tipo_usuario !== 'premium')
      return res.status(403).json({ ok: false, mensaje: 'Se requiere plan Premium para agendar consultas' });

    await pool.query(
      'INSERT INTO consultas_especialista (id_usuario, id_especialista, fecha, estado) VALUES (?, ?, ?, "pendiente")',
      [id_usuario, id_especialista, fecha]
    );
    return res.status(201).json({ ok: true, mensaje: 'Consulta agendada exitosamente' });
  } catch (error) {
    console.error('Error en agendarConsulta:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

const getMisConsultas = async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const [consultas] = await pool.query(`
      SELECT c.id_consulta, c.fecha, c.estado, e.nombre, e.especialidad
      FROM consultas_especialista c
      LEFT JOIN especialistas e ON c.id_especialista = e.id_especialista
      WHERE c.id_usuario = ?
      ORDER BY c.fecha DESC
    `, [id_usuario]);
    return res.status(200).json({ ok: true, data: consultas });
  } catch (error) {
    console.error('Error en getMisConsultas:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

// ─── RECUPERACIÓN DE CONTRASEÑA ──────────────────────────────────────────────



const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const solicitarRecuperacion = async (req, res) => {
  try {
    const { correo } = req.body;
    if (!correo)
      return res.status(400).json({ ok: false, mensaje: 'El correo es obligatorio' });

    const [usuarios] = await pool.query(
      'SELECT id_usuario, nombre FROM usuarios WHERE correo = ?', [correo]
    );
    if (usuarios.length === 0)
      return res.status(200).json({ ok: true, mensaje: 'Si el correo existe, recibirás un código' });

    const usuario = usuarios[0];
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expira_en = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      'UPDATE recuperacion_password SET usado = 1 WHERE id_usuario = ? AND usado = 0',
      [usuario.id_usuario]
    );
    await pool.query(
      'INSERT INTO recuperacion_password (id_usuario, codigo, expira_en) VALUES (?, ?, ?)',
      [usuario.id_usuario, codigo, expira_en]
    );

    await transporter.sendMail({
      from: `"MOMLY 🌸" <${process.env.EMAIL_USER}>`,
      to: correo,
      subject: 'Tu código para recuperar tu contraseña',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #FFF1E6; border-radius: 16px;">
          <h1 style="color: #E8A4B8; text-align: center; letter-spacing: 4px;">🌸 MOMLY</h1>
          <p style="color: #5e5d5d; font-size: 16px;">Hola <strong>${usuario.nombre}</strong> 💕</p>
          <p style="color: #5e5d5d;">Recibimos una solicitud para recuperar tu contraseña. Usa este código:</p>
          <div style="background: white; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 42px; font-weight: bold; letter-spacing: 10px; color: #E8A4B8;">${codigo}</span>
          </div>
          <p style="color: #999; font-size: 13px; text-align: center;">⏱️ Este código expira en <strong>15 minutos</strong></p>
          <p style="color: #999; font-size: 12px; text-align: center;">Si no solicitaste esto, ignora este correo.</p>
          <p style="color: #5e5d5d; font-size: 13px; text-align: center; margin-top: 24px;">Con amor, el equipo de MOMLY 🌸</p>
        </div>
      `,
    });

    return res.status(200).json({ ok: true, mensaje: 'Si el correo existe, recibirás un código' });
  } catch (error) {
    console.error('Error en solicitarRecuperacion:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

const verificarCodigo = async (req, res) => {
  try {
    const { correo, codigo } = req.body;
    if (!correo || !codigo)
      return res.status(400).json({ ok: false, mensaje: 'Correo y código son obligatorios' });

    const [usuarios] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE correo = ?', [correo]
    );
    if (usuarios.length === 0)
      return res.status(404).json({ ok: false, mensaje: 'Correo no encontrado' });

    const id_usuario = usuarios[0].id_usuario;

    const [codigos] = await pool.query(
      `SELECT id FROM recuperacion_password 
       WHERE id_usuario = ? AND codigo = ? AND usado = 0 AND expira_en > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [id_usuario, codigo]
    );

    if (codigos.length === 0)
      return res.status(400).json({ ok: false, mensaje: 'Código incorrecto o expirado' });

    return res.status(200).json({ ok: true, mensaje: 'Código verificado correctamente' });
  } catch (error) {
    console.error('Error en verificarCodigo:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

const restablecerPassword = async (req, res) => {
  try {
    const { correo, codigo, nuevaPassword } = req.body;
    if (!correo || !codigo || !nuevaPassword)
      return res.status(400).json({ ok: false, mensaje: 'Todos los campos son obligatorios' });

    if (nuevaPassword.length < 6)
      return res.status(400).json({ ok: false, mensaje: 'La contraseña debe tener mínimo 6 caracteres' });

    const [usuarios] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE correo = ?', [correo]
    );
    if (usuarios.length === 0)
      return res.status(404).json({ ok: false, mensaje: 'Correo no encontrado' });

    const id_usuario = usuarios[0].id_usuario;

    const [codigos] = await pool.query(
      `SELECT id FROM recuperacion_password 
       WHERE id_usuario = ? AND codigo = ? AND usado = 0 AND expira_en > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [id_usuario, codigo]
    );

    if (codigos.length === 0)
      return res.status(400).json({ ok: false, mensaje: 'Código incorrecto o expirado' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(nuevaPassword, salt);

    await pool.query(
      'UPDATE usuarios SET password = ? WHERE id_usuario = ?',
      [passwordHash, id_usuario]
    );
    await pool.query(
      'UPDATE recuperacion_password SET usado = 1 WHERE id = ?',
      [codigos[0].id]
    );

    return res.status(200).json({ ok: true, mensaje: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error en restablecerPassword:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
  }
};

module.exports = { registro, registroCompleto, login, verificarCorreo, getGuias, 
  registrarBienestar, getBienestar, crearCita, getCitas, eliminarCita, getVacunas, 
  marcarVacuna, desmarcarVacuna, getBebe, getBiblioteca, getEsNormal, getAcompanamiento,
  getSugerencias, activarPremium, getSuscripcion, getPublicaciones, crearPublicacion, 
  getComentarios, crearComentario, eliminarPublicacion, getEspecialistas, 
  agendarConsulta, getMisConsultas, solicitarRecuperacion, verificarCodigo, 
  restablecerPassword};