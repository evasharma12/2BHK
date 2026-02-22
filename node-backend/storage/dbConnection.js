// dbConnection.js
const mysql = require('mysql2');

// Support both DB_* and Railway's MYSQL* env var names (Railway MySQL plugin exposes MYSQLHOST, etc.)
const host = process.env.DB_HOST || process.env.MYSQLHOST || 'localhost';
const user = process.env.DB_USER || process.env.MYSQLUSER || 'root';
const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '';
const database = process.env.DB_NAME || process.env.MYSQLDATABASE || '2bhk_db';
const port = process.env.DB_PORT || process.env.MYSQLPORT;
const portNum = port ? parseInt(port, 10) : 3306;

if (process.env.NODE_ENV === 'production' && host === 'localhost') {
  console.error(
    'DB host is localhost in production. Set DB_HOST (or MYSQLHOST) on your backend service to your MySQL host (e.g. from Railway MySQL service → Variables).'
  );
}

const connection = mysql.createConnection({
  host,
  user,
  password,
  database,
  port: portNum,
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Helper used by server.js to verify DB connectivity on startup
async function testConnection() {
  return new Promise((resolve) => {
    connection.ping((err) => {
      if (err) {
        console.error('MySQL ping failed:', err);
        resolve(false);
      } else {
        console.log('MySQL ping successful');
        resolve(true);
      }
    });
  });
}

// Default export is the connection object (for existing code),
// with testConnection attached as a named property (for server.js).
module.exports = connection;
module.exports.testConnection = testConnection;

