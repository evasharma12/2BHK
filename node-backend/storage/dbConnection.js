// dbConnection.js
const mysql = require('mysql2');
const { getMysql2Ssl } = require('../config/mysqlSsl');

// Support both DB_* and Railway's MYSQL* env var names (Railway MySQL plugin exposes MYSQLHOST, etc.)
const host = process.env.DB_HOST || process.env.MYSQLHOST || 'localhost';
const user = process.env.DB_USER || process.env.MYSQLUSER || 'root';
const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '';
const database = process.env.DB_NAME || process.env.MYSQLDATABASE || '2bhk_db';
const port = process.env.DB_PORT || process.env.MYSQLPORT;
const portNum = port ? parseInt(port, 10) : 3306;

const ssl = getMysql2Ssl();

if (process.env.NODE_ENV === 'production' && host === 'localhost') {
  console.error(
    'DB host is localhost in production. Set DB_HOST (or MYSQLHOST) on your backend service to your MySQL host (e.g. from Railway MySQL service → Variables).'
  );
}

// Use a connection pool so connections are recreated when closed (idle timeout, network drop, etc.).
// Avoids "Can't add new command when connection is in closed state" after long idle or server restarts.
const pool = mysql.createPool({
  host,
  user,
  password,
  database,
  port: portNum,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ...(ssl && { ssl }),
});

// Helper used by server.js to verify DB connectivity on startup
async function testConnection() {
  return new Promise((resolve) => {
    pool.getConnection((err, conn) => {
      if (err) {
        console.error('MySQL getConnection failed:', err);
        resolve(false);
        return;
      }
      conn.ping((pingErr) => {
        conn.release();
        if (pingErr) {
          console.error('MySQL ping failed:', pingErr);
          resolve(false);
        } else {
          console.log('MySQL ping successful');
          resolve(true);
        }
      });
    });
  });
}

// Export the pool: pool.query() has the same API as connection.query(), so existing code works.
// Only transaction code (user.model create) must use pool.getConnection() then conn.beginTransaction/commit/rollback/release.
module.exports = pool;
module.exports.testConnection = testConnection;
