// dbConnection.js
const mysql = require('mysql2');

// Create a connection to the database
const connection = mysql.createConnection({
  host: 'localhost',      // Your MySQL host
  user: 'root',           // Your MySQL username
  password: '1234567890', // Your MySQL password
  database: '2bhk_db'     // Your database name
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

