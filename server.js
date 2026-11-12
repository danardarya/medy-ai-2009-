require("dotenv").config();
const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const multer = require("multer");

const app = express();
const db = new Database("medy-ai.sqlite");
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "development-secret-change-me";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT UNIQUE NOT NULL,
 password TEXT NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS history (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 kind TEXT NOT NULL,
 prompt TEXT NOT NULL,
 result TEXT,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

app.use(express.json({ limit: "15mb" }));
app.use(express.static(path.join(__dirname, "public")));

function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Sessione non valida. Accedi di nuovo." });
  }
}
function cleanUser(u) { return { id: u.id, name: u.name, email: u.email }; }

app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || password.length < 8)
    return res.status(400).json({ error: "Inserisci nome, email e una password di almeno 8 caratteri." });
  try {
    const hash = await bcrypt.hash(password, 12);
    const info = db.prepare("INSERT INTO users(name,email,password) VALUES(?,?,?)").run(name.trim(), email.toLowerCase().trim(), hash);
    const user = db.prepare("SELECT id,name,email FROM users WHERE id=?").get(info.lastInsertRowid);
    const token = jwt.sign(cleanUser(user), SECRET, { expiresIn: "7d" });
    res.json({ token, user: cleanUser(user) });
  } catch {
    res.status(409).json({ error: "Questa email risulta già registrata." });
  }
});
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare("SELECT * FROM users WHERE email=?").get((email || "").toLowerCase().trim());
  if (!user || !(await bcrypt.compare(password || "", user.password)))
    return res.status(401).json({ error: "Email o password non corretti." });
  const safe = cleanUser(user);
  res.json({ token: jwt.sign(safe, SECRET, { expiresIn: "7d" }), user: safe });
});
app.get("/api/me", auth, (req, res) => res.json({ user: req.user }));
app.get("/api/history", auth, (req, res) => {
  const rows = db.prepare("SELECT id,kind,prompt,result,created_at FROM history WHERE user_id=? ORDER BY id DESC LIMIT 100").all(req.user.id);
  res.json({ history: rows });
});
app.delete("/api/history/:id", auth, (req, res) => {
  db.prepare("DELETE FROM history WHERE id=? AND user_id=?").run(req.params.id, req.user.id);
  res.json({ ok: true });
});
function saveHistory(userId, kind, prompt, result) {
  db.prepare("INSERT INTO history(user_id,kind,prompt,result) VALUES(?,?,?,?)").run(userId, kind, prompt, result || "");
}

app.post("/api/chat", auth, async (req, res) => {
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: "Scrivi un messaggio." });
  if (!process.env.OPENAI_API_KEY)
    return res.status(503).json({ error: "Chat AI non ancora attivata: aggiungi OPENAI_API_KEY nel file .env." });
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini", messages: [{ role: "user", content: message }] })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || "Errore del servizio AI.");
    const answer = data.choices?.[0]?.message?.content || "Nessuna risposta.";
    saveHistory(req.user.id, "chat", message, answer);
    res.json({ answer });
  } catch (e) { res.status(502).json({ error: e.message }); }
});

app.post("/api/image", auth, async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "Descrivi l'immagine da creare." });
  if (!process.env.OPENAI_API_KEY)
    return res.status(503).json({ error: "Generazione immagini non attivata: aggiungi OPENAI_API_KEY nel file .env." });
  try {
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1", prompt, size: "1024x1024" })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || "Errore nella generazione.");
    const image = data.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : data.data?.[0]?.url;
    saveHistory(req.user.id, "image", prompt, image || "");
    res.json({ image });
  } catch (e) { res.status(502).json({ error: e.message }); }
});

app.post("/api/video", auth, (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "Descrivi il video che vuoi creare." });
  saveHistory(req.user.id, "video", prompt, "Richiesta salvata. Collega un provider video per attivare il rendering.");
  res.status(501).json({ error: "MEDY VIDEO è predisposto nell'interfaccia, ma serve collegare un provider video e la relativa API key per generare file reali." });
});

app.post("/api/upload", auth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Nessun file ricevuto." });
  res.json({ name: req.file.originalname, type: req.file.mimetype, size: req.file.size, message: "File ricevuto. La modifica AI richiede il collegamento di un provider di editing." });
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`MEDY AI attivo su http://localhost:${PORT}`));
