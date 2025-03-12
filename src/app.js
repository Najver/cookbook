require('dotenv').config();

const fs = require('fs');
const express = require('express');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const db = require('./database'); // Importujeme databázové připojení
const User = require('./api/user'); // Import User class
const { defineHTML } = require('./pages');

const app = express();
const PORT = process.env.PORT;
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

// Endpoint for adding a recipe s možností přiřazení tagů
app.post('/api/recipes', checkAuthentication, upload.single('image'), (req, res) => {
  const { title, ingredients, instructions } = req.body;
  // Získáme tagy z formuláře; jméno pole je "tags[]", takže express je zpracuje jako "req.body.tags"
  let tags = req.body.tags;
  if (tags && !Array.isArray(tags)) {
    tags = [tags];
  }
  const userId = req.session.userId;
  const imagePath = req.file ? `/images/${req.file.filename}` : null;

  if (!title || !ingredients || !instructions) {
    return res.status(400).send('Všechna pole jsou povinná.');
  }

  const insertRecipeQuery = `
    INSERT INTO recipes (title, ingredients, instructions, created_by, image_path, created_at)
    VALUES (?, ?, ?, ?, ?, NOW())
  `;

  db.query(insertRecipeQuery, [title, ingredients, instructions, userId, imagePath], (err, result) => {
    if (err) {
      console.error('Chyba při ukládání receptu:', err);
      return res.status(500).send('Chyba při ukládání receptu');
    }

    const recipeId = result.insertId;

    // Pokud byly vybrány tagy, vložíme je do tabulky recipe_tags
    if (tags && tags.length > 0) {
      const values = tags.map(tagId => [recipeId, tagId]);
      const insertTagsQuery = 'INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ?';
      db.query(insertTagsQuery, [values], (err, resultTags) => {
        if (err) {
          console.error('Chyba při ukládání tagů:', err);
          return res.status(500).send('Chyba při ukládání receptu s tagy');
        }
        return res.status(200).send('Recept byl úspěšně uložen!');
      });
    } else {
      return res.status(200).send('Recept byl úspěšně uložen!');
    }
  });
});

// Endpoint pro získání tagů z databáze
app.get('/api/tags', (req, res) => {
  const query = 'SELECT id, tag_name FROM tags ORDER BY tag_name';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Chyba při načítání tagů:', err);
      return res.status(500).send('Chyba serveru');
    }
    res.json(results);
  });
});

//endpoint na ziskani receptu
app.get('/api/recipes', (req, res) => {
  db.query('SELECT id, title, ingredients, instructions, image_path FROM recipes', (err, results) => {
      if (err) {
          console.error('Chyba při načítání receptů:', err);
          return res.status(500).send('Chyba serveru');
      }
      res.json(results);
  });
});

app.get('/recipe/:id', checkAuthentication, (req, res) => {
  const recipeId = req.params.id;
  db.query('SELECT * FROM recipes WHERE id = ?', [recipeId], (err, results) => {
    if (err) {
      console.error('Chyba při načítání receptu:', err);
      return res.status(500).send('Chyba serveru');
    }
    if (results.length === 0) {
      return res.status(404).send('Recept nenalezen');
    }
    const recipe = results[0];
    // Převod průměrného ratingu z procent na počet hvězdiček (5 hvězd = 100%)
    const averageRating = recipe.rating / 20;

    res.send(`
      <!DOCTYPE html>
      <html lang="cs">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${recipe.title}</title>
          <link rel="stylesheet" href="/css/styles.css">
      </head>
      <body>
          <header>
              <nav class="navbar">
                  <div class="navbar-left">
                      <a href="/home">Domů</a>
                  </div>
                  <div class="navbar-right">
                      <a href="/favorites">Oblíbené</a>
                      <a href="/profile">Profil</a>
                      <a href="/logout" class="login-link">Odhlášení</a>
                  </div>
              </nav>
          </header>
          <main>
              <h1>${recipe.title}</h1>
              <div class="recipe-detail">
              ${recipe.image_path ? `<img src="${recipe.image_path}" alt="${recipe.title}" class="recipe-image">` : ''}
              <!-- další obsah detailu receptu -->
              </div>
              <p><strong>Ingredience:</strong> ${recipe.ingredients}</p>
              <p><strong>Postup:</strong> ${recipe.instructions}</p>
              
              <!-- Widget pro hodnocení -->
              <div id="rating-widget" 
                   data-recipe-id="${recipe.id}" 
                   data-initial-rating="${averageRating}" 
                   data-rated-count="${recipe.rated_count}">
                <h3>Hodnocení:</h3>
                <div id="star-rating">
                  <span class="star" data-value="1">&#9734;</span>
                  <span class="star" data-value="2">&#9734;</span>
                  <span class="star" data-value="3">&#9734;</span>
                  <span class="star" data-value="4">&#9734;</span>
                  <span class="star" data-value="5">&#9734;</span>
                </div>
                <p id="user-rating-info"></p>
              </div>
          </main>
          <script src="/scripts/rating.js"></script>
      </body>
      </html>
    `);
  });
});


// Endpoint pro načtení receptů přihlášeného uživatele
app.get('/api/myrecipes', checkAuthentication, (req, res) => {
  const userId = req.session.userId; // Získáme ID aktuálně přihlášeného uživatele ze session

  const query = 'SELECT id, title, ingredients, instructions, image_path FROM recipes WHERE created_by = ?';
  db.query(query, [userId], (err, results) => {
      if (err) {
          console.error('Chyba při načítání receptů:', err);
          return res.status(500).send('Chyba serveru');
      }
      res.json(results);
  });
});

// Endpoint pro smazání receptu
app.delete('/api/recipes/:id', checkAuthentication, (req, res) => {
  const recipeId = req.params.id;
  const userId = req.session.userId;

  // Nejprve získáme informaci o obrázku daného receptu
  const selectQuery = 'SELECT image_path FROM recipes WHERE id = ? AND created_by = ?';
  db.query(selectQuery, [recipeId, userId], (err, results) => {
    if (err) {
      console.error('Chyba při načítání receptu:', err);
      return res.status(500).send('Chyba serveru');
    }
    if (results.length === 0) {
      return res.status(404).send('Recept nenalezen nebo nemáte oprávnění');
    }
    const imagePath = results[0].image_path;

    // Nejprve smažeme tagy patřící k danému receptu
    const deleteTagsQuery = 'DELETE FROM recipe_tags WHERE recipe_id = ?';
    db.query(deleteTagsQuery, [recipeId], (err, resultTags) => {
      if (err) {
        console.error('Chyba při mazání tagů:', err);
        return res.status(500).send('Chyba při mazání tagů');
      }

      // Poté smažeme samotný recept
      const deleteQuery = 'DELETE FROM recipes WHERE id = ? AND created_by = ?';
      db.query(deleteQuery, [recipeId, userId], (err, result) => {
        if (err) {
          console.error('Chyba při mazání receptu:', err);
          return res.status(500).send('Chyba při mazání receptu');
        }
        
        // Pokud byl připojen obrázek, smažeme soubor ze složky
        if (imagePath) {
          const filePath = path.join(__dirname, '../public', imagePath);
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error('Chyba při mazání obrázku:', err);
              // I když dojde k chybě při mazání obrázku, vrátíme úspěšnou odpověď, protože záznam byl smazán
            }
            return res.status(200).send('Recept byl smazán');
          });
        } else {
          return res.status(200).send('Recept byl smazán');
        }
      });
    });
  });
});

app.get('/api/recipes/search', (req, res) => {
  const searchTerm = req.query.q;
  if (!searchTerm) {
    return res.status(400).send('Vyhledávací výraz je povinný.');
  }

  // Převod vstupu na malá písmena
  const searchTermLower = searchTerm.toLowerCase();

  const query = `
    SELECT id, title, ingredients, instructions, image_path
    FROM recipes
    WHERE LOWER(title) LIKE ?
  `;
  const likeQuery = `%${searchTermLower}%`;

  db.query(query, [likeQuery], (err, results) => {
    if (err) {
      console.error('Chyba při vyhledávání receptů:', err);
      return res.status(500).send('Chyba serveru');
    }
    res.json(results);
  });
});

// Endpoint pro uložení hodnocení receptu
app.post('/api/recipes/:id/rate', checkAuthentication, (req, res) => {
  const recipeId = req.params.id;
  const { rating } = req.body; // očekáváme číslo mezi 0 a 5 (může být půlhvězda, např. 3.5)

  // Validace vstupu
  if (typeof rating !== 'number' || rating < 0 || rating > 5) {
    return res.status(400).send('Neplatné hodnocení.');
  }

  // Načteme aktuální rating a počet hodnocení
  const getQuery = 'SELECT rating, rated_count FROM recipes WHERE id = ?';
  db.query(getQuery, [recipeId], (err, results) => {
    if (err) {
      console.error('Chyba při načítání receptu:', err);
      return res.status(500).send('Chyba serveru');
    }
    if (results.length === 0) {
      return res.status(404).send('Recept nenalezen');
    }
    const currentRating = results[0].rating; // uložené jako číslo 0-100 (např. 80 = 4 hvězdy)
    const ratedCount = results[0].rated_count;

    // Vypočítáme nové průměrné hodnocení
    // Převod uživatelského hodnocení na procenta (1 hvězda = 20%) a průměr počítáme jako vážený průměr.
    const newRatingValue = Math.round(((currentRating * ratedCount) + (rating * 20)) / (ratedCount + 1));
    const newRatedCount = ratedCount + 1;

    const updateQuery = 'UPDATE recipes SET rating = ?, rated_count = ? WHERE id = ?';
    db.query(updateQuery, [newRatingValue, newRatedCount, recipeId], (err, result) => {
      if (err) {
        console.error('Chyba při aktualizaci hodnocení:', err);
        return res.status(500).send('Chyba serveru');
      }
      res.status(200).send('Hodnocení bylo úspěšně uloženo.');
    });
  });
});



// Spuštění serveru
app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});
