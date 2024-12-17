require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const db = require('./database'); // Importujeme databázové připojení
const User = require('./api/user'); // Import User class
const { defineHTML } = require('./pages');

const app = express();
const PORT = 3000;
const user = new User(db); // Vytvoření instance třídy User

// Middleware pro parsování JSON a URL-encoded dat
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../public/images'),
  filename: (req, file, cb) => {
      const userId = req.session.userId;
      const ext = path.extname(file.originalname);
      cb(null, `${userId}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// Nastavení express-session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Middleware pro kontrolu přihlášení
function checkAuthentication(req, res, next) {
  if (req.session.userId) {
    return next();
  } else {
    res.redirect('/login');
  }
}

// Definování HTML stránek
defineHTML(app, checkAuthentication);

// Servírujeme statické soubory
app.use(express.static(path.join(__dirname, '../public')));

// Endpoint pro přihlášení
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  user.login(username, password, req.session, (err, message) => {
    if (err) {
      return res.status(500).send('Chyba serveru');
    }
    if (message) {
      // Redirect with error message as a query parameter
      return res.redirect(`/login?error=${encodeURIComponent(message)}`);
    }
    res.redirect('/home');
  });
});

// Registration endpoint
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  user.register(username, password, (err, result) => {
    if (err) {
      return res.status(500).redirect('/register?error=Chyba%20serveru');
    }

    if (result === 'Uživatelské jméno již existuje') {
      return res.status(400).redirect('/register?error=Uživatelské%20jméno%20již%20existuje');
    }

    res.redirect('/login');
  });
});

// Endpoint pro odhlášení
app.get('/logout', (req, res) => {
  user.logout(req.session, (err) => {
    if (err) {
      return res.status(500).send('Chyba při odhlašování');
    }
    res.redirect('/login');
  });
});

// Endpoint pro API
app.get('/api/users', checkAuthentication, (req, res) => {
  db.query('SELECT * FROM users', (err, result) => {
    if (err) {
      console.error('Chyba při získávání dat:', err);
      res.status(500).send('Chyba serveru');
      return;
    }
    res.json(result);
  });
});

// Profilový endpoint
app.get('/api/profile', checkAuthentication, (req, res) => {
  const userId = req.session.userId; // Získání ID uživatele ze session
  if (!userId) {
    return res.status(401).send('Nejste přihlášený.');
  }

  db.query('SELECT username FROM users WHERE id = ?', [userId], (err, result) => {
    if (err) {
      console.error('Chyba při získávání profilových informací:', err);
      return res.status(500).send('Chyba serveru');
    }

    if (result.length === 0) {
      return res.status(404).send('Uživatel nenalezen');
    }

    res.json({ username: result[0].username });
  });
});

// Endpoint for adding a recipe
app.post('/api/recipes', checkAuthentication, upload.single('image'), (req, res) => {
  const { title, ingredients, instructions } = req.body;
  const userId = req.session.userId;
  const imagePath = req.file ? `/images/${req.file.filename}` : null;

  if (!title || !ingredients || !instructions) {
      return res.status(400).send('Všechna pole jsou povinná.');
  }

  const insertRecipeQuery = `
  INSERT INTO recipes (title, ingredients, instructions, rating, created_by, image_path)
  VALUES (?, ?, ?, ?, ?, ?)
`;
const rating = 100;  // Explicitly set rating to 0
db.query(
  insertRecipeQuery,
  [title, ingredients, instructions, rating, userId, imagePath],
  (err, result) => {
    if (err) {
      console.error('Chyba při ukládání receptu:', err);
      return res.status(500).send('Chyba při ukládání receptu');
    }
    res.status(200).send('Recept byl úspěšně uložen!');
  }
);
});

// Spuštění serveru
app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});
