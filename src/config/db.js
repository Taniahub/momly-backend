const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const connectDB = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL conectado correctamente');
    connection.release();
  } catch (error) {
    console.error('❌ Error al conectar MySQL:', error.message);
    process.exit(1);
  }
};

module.exports = { pool, connectDB };