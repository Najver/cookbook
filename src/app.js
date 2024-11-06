const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const app = express();
const PORT = 3000;

// Nastavení připojení k databázi
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Maminka007',
  database: 'cookbook'
});

// Připojení k databázi
db.connect(err => {
  if (err) {
    console.error('Chyba při připojování k databázi:', err);
    return;
  }
  console.log('Připojeno k databázi');
});

// Servírujeme statické soubory ze složky `public`
app.use(express.static(path.join(__dirname, '../public')));

// Nastavíme cestu k HTML stránkám ve složce `html`
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../html/index.html'));
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, '../html/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../html/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../html/register.html'));
});

// Přidáme API endpoint pro získání dat z databáze
app.get('/api/get-data', (req, res) => {
    db.query('SELECT * FROM users', (err, result) => {
        if (err) {
            console.error('Chyba při získávání dat:', err);
            res.status(500).send('Chyba serveru');
            return;
        }
        res.json(result);
    });
});

// Spuštění serveru
app.listen(PORT, () => {
    console.log(`Server běží na http://localhost:${PORT}`);
});
