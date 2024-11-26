const mysql = require('mysql2');

// Vytvoření připojení k databázi
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Připojení k databázi
db.connect(err => {
  if (err) {
    console.error('Chyba při připojování k databázi:', err);
    return;
  }
  console.log('Připojeno k databázi');
});

module.exports = db;
