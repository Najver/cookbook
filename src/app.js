const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

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

// Spuštění serveru
app.listen(PORT, () => {
    console.log(`Server běží na http://localhost:${PORT}`);
});
