const path = require('path');

function defineHTML(app,checkAuthentication) {
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
  
  app.get('/profile', checkAuthentication, (req, res) => {
    res.sendFile(path.join(__dirname, '../html/profile.html'));
  });

  app.get('/favorites', checkAuthentication, (req, res) => {
    res.sendFile(path.join(__dirname, '../html/favorites.html'));
  });
}

module.exports = {defineHTML}