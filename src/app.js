require('dotenv').config();

const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();
const PORT = 3000;

// Nastavení připojení k databázi
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

// Middleware pro parsování JSON a URL-encoded dat
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Nastavení express-session pro správu relací
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // nastavte na true, pokud používáte HTTPS
}));

// Middleware pro kontrolu, zda je uživatel přihlášen
function checkAuthentication(req, res, next) {
  if (req.session.userId) {
    return next();
  } else {
    res.redirect('/login');
  }
}

// Servírujeme statické soubory ze složky `public`
app.use(express.static(path.join(__dirname, '../public')));

// Nastavíme cestu k HTML stránkám ve složce `html`
app.get('/', checkAuthentication, (req, res) => {
    res.sendFile(path.join(__dirname, '../html/index.html'));
});

app.get('/home', checkAuthentication, (req, res) => {
    res.sendFile(path.join(__dirname, '../html/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../html/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../html/register.html'));
});

// Endpoint pro zpracování přihlášení
app.post('/login', (req, res) => {
    const { username, password } = req.body;
  
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
      if (err) {
        console.error('Chyba při získávání uživatele:', err);
        return res.status(500).send('Chyba serveru');
      }
  
      if (results.length === 0) {
        return res.status(400).send('Uživatel neexistuje');
      }
  
      const user = results[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(400).send('Nesprávné heslo');
      }
      if (match){
        req.session.userId = user.id;
        res.redirect('/home');
      }
      
    });
  });

// Endpoint pro registraci uživatele
app.post('/register', async (req, res) => {
    const { username, password, role_id } = req.body;
  
    const hashedPassword = await bcrypt.hash(password, 10);
  
    db.query('INSERT INTO users (username, password, role_id) VALUES (?, ?, ?)', [username, hashedPassword, 2], (err, result) => {
      if (err) {
        console.error('Chyba při registraci uživatele:', err);
        return res.status(500).send('Chyba serveru');
      }
      res.redirect('/login');
    });
  });
  
// Endpoint pro odhlášení
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).send('Chyba při odhlašování');
      }
      res.redirect('/login');
    });
  });

// Přidáme API endpoint pro získání dat z databáze (pouze pro přihlášené uživatele)
app.get('/api/get-data', checkAuthentication, (req, res) => {
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
