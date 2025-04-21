const bcrypt = require('bcrypt');

class User {
  constructor(db) {
    this.db = db;
  }

  async login(username, password, session, callback) {
    this.db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
      if (err) {
        console.error('Chyba při získávání uživatele:', err);
        return callback(err, null);
      }

      if (results.length === 0) {
        return callback(null, 'Uživatel neexistuje');
      }

      const user = results[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return callback(null, 'Nesprávné heslo');
      }

      session.userId = user.id;
      callback(null, null); // Bez chyby, úspěšné přihlášení
    });
  }

  async register(username, password, callback) {
    try {
      const forbiddenWords = ['nig', 'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'kurva', 'debil', 'idiot'];

      // Normalize username (bez diakritiky, malá písmena)
      const normalizedUsername = username
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();

      // Kontrola zakázaných výrazů
      if (forbiddenWords.some(word => normalizedUsername.includes(word))) {
        return callback(null, 'Uživatelské jméno obsahuje nevhodné výrazy');
      }

      // Kontrola, zda username existuje
      this.db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) {
          console.error('Chyba při kontrole uživatelského jména:', err);
          return callback(err, null);
        }

        if (results.length > 0) {
          return callback(null, 'Uživatelské jméno již existuje');
        }

        // Hash hesla
        const hashedPassword = await bcrypt.hash(password, 10);

        // Vložení uživatele
        this.db.query(
            'INSERT INTO users (username, password, role_id) VALUES (?, ?, ?)',
            [username, hashedPassword, 2],
            (err, result) => {
              if (err) {
                console.error('Chyba při registraci uživatele:', err);
                return callback(err, null);
              }
              callback(null, result);
            }
        );
      });
    } catch (err) {
      console.error('Chyba při zpracování registrace:', err);
      callback(err, null);
    }
  }

  logout(session, callback) {
    session.destroy(err => {
      if (err) {
        return callback(err);
      }
      callback(null);
    });
  }
}

module.exports = User;
