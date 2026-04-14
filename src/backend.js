const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

const DB_PATH = path.join(process.cwd(), "statistics.db");
const db = new sqlite3.Database(DB_PATH);

app.use(express.json());

/* ─────────────────────────────
   DB SAFETY (ensure table exists)
───────────────────────────── */
db.run(`
CREATE TABLE IF NOT EXISTS user_visits (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    machine_ip TEXT,
    request_path TEXT,
    request_method TEXT,
    user_agent TEXT,
    referer TEXT
);
`);

/* ─────────────────────────────
   IP extraction (Cloudflare-safe)
───────────────────────────── */
function getIP(req) {
  return (
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress
  );
}

/* ─────────────────────────────
   RATE LIMIT (simple in-memory)
───────────────────────────── */
const hits = new Map();

// cleanup to prevent memory leak
setInterval(() => {
  const now = Date.now();

  for (const [key, arr] of hits.entries()) {
    const filtered = arr.filter(t => now - t < 60000); // keep last 60s
    if (filtered.length === 0) {
      hits.delete(key);
    } else {
      hits.set(key, filtered);
    }
  }
}, 60000);

function rateLimit(req, res, next) {
  const ip = getIP(req);
  const key = `${ip || "unknown"}:${req.path}`;

  const now = Date.now();
  const windowMs = 10000; // 10s
  const limit = 20;

  const arr = hits.get(key) || [];
  const recent = arr.filter(t => now - t < windowMs);

  if (recent.length >= limit) {
    return res.status(429).send("Too many requests");
  }

  recent.push(now);
  hits.set(key, recent);

  next();
}

/* ─────────────────────────────
   MIDDLEWARE
───────────────────────────── */
app.use(rateLimit);

app.use((req, res, next) => {
  const ip = getIP(req);

  db.run(
    `INSERT INTO user_visits 
     (machine_ip, request_path, request_method, user_agent, referer)
     VALUES (?, ?, ?, ?, ?)`,
    [
      ip,
      req.path,
      req.method,
      req.headers["user-agent"],
      req.headers["referer"]
    ],
    (err) => {
      if (err) console.error("DB insert error:", err.message);
    }
  );

  next();
});

/* ─────────────────────────────
   ROUTES
───────────────────────────── */

app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd() , "public", "index.html"));
});

app.get("/visits", (req, res) => {
  db.all(
    `SELECT * FROM user_visits ORDER BY user_timestamp DESC LIMIT 100`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get("/stats", (req, res) => {
  db.all(
    `
    SELECT request_path, COUNT(*) as hits
    FROM user_visits
    GROUP BY request_path
    ORDER BY hits DESC
    `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

/* ─────────────────────────────
   START SERVER
───────────────────────────── */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});