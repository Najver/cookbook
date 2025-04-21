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

        if (result === 'Uživatelské jméno obsahuje nevhodné výrazy') {
            return res.status(400).redirect('/register?error=Uživatelské%20jméno%20obsahuje%20nevhodné%20výrazy');
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
    const limit = parseInt(req.query.limit) || 12;
    const offset = parseInt(req.query.offset) || 0;
    const sort = req.query.sort || 'created_at_desc';

    let orderBy = 'created_at DESC';
    if (sort === 'rating_desc') orderBy = 'rating DESC';
    if (sort === 'title_asc') orderBy = 'title ASC';

    const query = `
    SELECT id, title, ingredients, instructions, image_path
    FROM recipes
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

    db.query(query, [limit, offset], (err, results) => {
        if (err) {
            console.error('Chyba při načítání receptů:', err);
            return res.status(500).send('Chyba serveru');
        }
        res.json(results);
    });
});

app.get('/recipe/:id', checkAuthentication, (req, res) => {
  const recipeId = req.params.id;

  // Načteme recept a jeho komentáře
  db.query(
    'SELECT * FROM recipes WHERE id = ?',
    [recipeId],
    (err, recipeResults) => {
      if (err) {
        console.error('Chyba při načítání receptu:', err);
        return res.status(500).send('Chyba serveru');
      }
      if (recipeResults.length === 0) {
        return res.status(404).send('Recept nenalezen');
      }

      const recipe = recipeResults[0];
      const averageRating = recipe.rating / 20;

      // Načteme komentáře pro daný recept
      db.query(
        'SELECT comments.content, comments.created_at, users.username FROM comments JOIN users ON comments.user_id = users.id WHERE comments.recipe_id = ? ORDER BY comments.created_at DESC',
        [recipeId],
        (err, comments) => {
          if (err) {
            console.error('Chyba při načítání komentářů:', err);
            return res.status(500).send('Chyba serveru');
          }

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
                  <div class="recipe-content">
                    <h1>${recipe.title}</h1>
                    <div class="recipe-detail">
                      ${recipe.image_path ? `<img src="${recipe.image_path}" alt="${recipe.title}" class="recipe-image">` : ''}
                    </div>
                    <button id="favorite-btn">❤️ Přidat do oblíbených</button>
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
                  </div>
                  
                  <h3>Komentáře</h3>
                  <div id="comments-section">
                    <div id="comments-list"></div>
                    <div class="comment-form">
                      <textarea id="comment-input" placeholder="Napište svůj komentář..." rows="3"></textarea>
                      <button id="submit-comment">Odeslat</button>
                    </div>
                  </div>
                </main>
                <script src="/scripts/rating.js"></script>
                <script src="/scripts/comments.js"></script>
                <script src="/scripts/favorite.js"></script>
            </body>
            </html>
          `);
        }
      );
    }
  );
});

app.get('/api/recipes/:id/comments', (req, res) => {
  const recipeId = req.params.id;

  db.query(
      `SELECT comments.id, comments.content, comments.created_at, users.username 
       FROM comments 
       JOIN users ON comments.user_id = users.id 
       WHERE comments.recipe_id = ? 
       ORDER BY comments.created_at ASC`,
      [recipeId],
      (err, results) => {
          if (err) {
              console.error('Error fetching comments:', err);
              return res.status(500).send('Server error');
          }
          res.json(results);
      }
  );
});


//endpoint na pridani receptu
app.post('/api/recipes/:id/comments', checkAuthentication, (req, res) => {
  const recipeId = req.params.id;
  const userId = req.session.userId;
  const { content } = req.body;

  if (!content.trim()) {
      return res.status(400).send('Comment cannot be empty');
  }

  db.query(
      'INSERT INTO comments (user_id, recipe_id, content) VALUES (?, ?, ?)',
      [userId, recipeId, content],
      (err, result) => {
          if (err) {
              console.error('Error inserting comment:', err);
              return res.status(500).send('Server error');
          }
          res.status(201).json({ id: result.insertId, content, username: req.session.username });
      }
  );
});


//endpoint na mazani komentaru
app.delete('/api/comments/:id', checkAuthentication, (req, res) => {
  const commentId = req.params.id;
  const userId = req.session.userId;

  db.query(
      'DELETE FROM comments WHERE id = ? AND user_id = ?',
      [commentId, userId],
      (err, result) => {
          if (err) {
              console.error('Error deleting comment:', err);
              return res.status(500).send('Server error');
          }
          if (result.affectedRows === 0) {
              return res.status(403).send('You can only delete your own comments');
          }
          res.status(200).send('Comment deleted successfully');
      }
  );
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

    // Načteme recept kvůli image_path
    const selectQuery = 'SELECT image_path FROM recipes WHERE id = ? AND created_by = ?';
    db.query(selectQuery, [recipeId, userId], (err, results) => {
        if (err) {
            console.error('Chyba při načítání receptu:', err);
            return res.status(500).send('Chyba serveru');
        }

        if (results.length === 0) {
            return res.status(404).send('Recept nenalezen nebo nemáte oprávnění');
        }

        // Uložíme imagePath do proměnné vyššího rozsahu
        const imagePath = results[0].image_path;

        // Smazání komentářů
        db.query('DELETE FROM comments WHERE recipe_id = ?', [recipeId], (err) => {
            if (err) {
                console.error('Chyba při mazání komentářů:', err);
                return res.status(500).send('Chyba při mazání komentářů');
            }

            // Smazání z favorites
            db.query('DELETE FROM favorites WHERE recipe_id = ?', [recipeId], (err) => {
                if (err) {
                    console.error('Chyba při mazání oblíbených:', err);
                    return res.status(500).send('Chyba při mazání oblíbených');
                }

                // Smazání tagů
                db.query('DELETE FROM recipe_tags WHERE recipe_id = ?', [recipeId], (err) => {
                    if (err) {
                        console.error('Chyba při mazání tagů:', err);
                        return res.status(500).send('Chyba při mazání tagů');
                    }

                    // Nakonec smažeme samotný recept
                    db.query('DELETE FROM recipes WHERE id = ? AND created_by = ?', [recipeId, userId], (err) => {
                        if (err) {
                            console.error('Chyba při mazání receptu:', err);
                            return res.status(500).send('Chyba při mazání receptu');
                        }

                        // Pokud má recept obrázek, smažeme ho
                        if (imagePath) {
                            const filePath = path.join(__dirname, '../public', imagePath);
                            fs.unlink(filePath, (err) => {
                                if (err) {
                                    console.error('Chyba při mazání obrázku:', err);
                                    // Nevadí, i tak vrátíme úspěch
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
    });
});


app.get('/api/recipes/search', (req, res) => {
    const searchTerm = req.query.q || '';
    const tags = req.query.tags ? req.query.tags.split(',') : [];
    const limit = parseInt(req.query.limit) || 12;
    const offset = parseInt(req.query.offset) || 0;
    const sort = req.query.sort || 'created_at_desc';

    let orderBy = 'r.created_at DESC';
    if (sort === 'rating_desc') orderBy = 'r.rating DESC';
    if (sort === 'title_asc') orderBy = 'r.title ASC';

    let query = `
        SELECT DISTINCT r.id, r.title, r.ingredients, r.instructions, r.image_path, r.created_at, r.rating
        FROM recipes r
                 LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
    `;

    const queryParams = [];
    const conditions = [];

    if (searchTerm) {
        conditions.push("LOWER(r.title) LIKE ?");
        queryParams.push(`%${searchTerm.toLowerCase()}%`);
    }

    let havingClause = '';
    if (tags.length > 0) {
        conditions.push(`rt.tag_id IN (${tags.map(() => '?').join(',')})`);
        havingClause = `GROUP BY r.id HAVING COUNT(DISTINCT rt.tag_id) = ${tags.length}`;
        queryParams.push(...tags);
    }

    if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
    }

    if (havingClause) {
        query += ` ${havingClause}`;
    }


    query += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    db.query(query, queryParams, (err, results) => {
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

app.post('/api/favorites/:recipeId', checkAuthentication, (req, res) => {
    const recipeId = req.params.recipeId;
    const userId = req.session.userId;

    const insertQuery = 'INSERT IGNORE INTO favorites (user_id, recipe_id) VALUES (?, ?)';
    db.query(insertQuery, [userId, recipeId], (err, result) => {
        if (err) {
            console.error('Chyba při přidávání do oblíbených:', err);
            return res.status(500).send('Chyba serveru');
        }
        res.status(200).send('Recept přidán do oblíbených');
    });
});

app.delete('/api/favorites/:recipeId', checkAuthentication, (req, res) => {
    const recipeId = req.params.recipeId;
    const userId = req.session.userId;

    const deleteQuery = 'DELETE FROM favorites WHERE user_id = ? AND recipe_id = ?';
    db.query(deleteQuery, [userId, recipeId], (err, result) => {
        if (err) {
            console.error('Chyba při odebírání z oblíbených:', err);
            return res.status(500).send('Chyba serveru');
        }
        res.status(200).send('Recept odebrán z oblíbených');
    });
});

app.get('/api/favorites', checkAuthentication, (req, res) => {
    const userId = req.session.userId;

    const query = `
    SELECT r.id, r.title, r.ingredients, r.instructions, r.image_path 
    FROM favorites f
    JOIN recipes r ON f.recipe_id = r.id
    WHERE f.user_id = ?
  `;
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Chyba při načítání oblíbených:', err);
            return res.status(500).send('Chyba serveru');
        }
        res.json(results);
    });
});

app.get('/api/favorites/:recipeId', checkAuthentication, (req, res) => {
    const recipeId = req.params.recipeId;
    const userId = req.session.userId;

    db.query('SELECT * FROM favorites WHERE user_id = ? AND recipe_id = ?', [userId, recipeId], (err, results) => {
        if (err) {
            console.error('Chyba při kontrole oblíbeného:', err);
            return res.status(500).send('Chyba serveru');
        }
        res.json({ isFavorite: results.length > 0 });
    });
});


// Spuštění serveru
app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});
