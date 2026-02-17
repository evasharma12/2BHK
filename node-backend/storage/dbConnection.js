// dbConnection.js
const mysql = require('mysql2');

// Use env vars in production (e.g. Render + PlanetScale/Railway); fallback for local dev
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '2bhk_db',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
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

