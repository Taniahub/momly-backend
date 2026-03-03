const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// ✅ SSL: Render (base64) o Local (archivo)
let sslConfig;
if (process.env.DB_SSL_CA_BASE64) {
  const ca = Buffer.from(process.env.DB_SSL_CA_BASE64, 'base64').toString('utf8');
  sslConfig = { ca, rejectUnauthorized: true };
} else {
  const caPath = path.join(__dirname, '../../certs/aiven-ca.pem');
  sslConfig = { ca: fs.readFileSync(caPath, 'utf8'), rejectUnauthorized: true };
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: sslConfig,
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