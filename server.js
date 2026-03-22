import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const app = express();
const PORT = 3e3;
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-for-dev";
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "logup_db",
  port: parseInt(process.env.DB_PORT || "3306"),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
async function initDb() {
  try {
    const initPool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "password",
      port: parseInt(process.env.DB_PORT || "3306")
    });
    await initPool.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || "logup_db"}\``);
    await initPool.end();
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('professional', 'client', 'admin') NOT NULL,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS professionals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE NOT NULL,
        business_name VARCHAR(255),
        description TEXT,
        photo_url VARCHAR(1024),
        subscription_status VARCHAR(50) DEFAULT 'inactive',
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        city VARCHAR(255),
        instagram VARCHAR(255),
        banner_url VARCHAR(1024),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        professional_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        duration INT NOT NULL,
        FOREIGN KEY(professional_id) REFERENCES professionals(id) ON DELETE CASCADE
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        professional_id INT NOT NULL,
        client_id INT NOT NULL,
        service_id INT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
        FOREIGN KEY(professional_id) REFERENCES professionals(id) ON DELETE CASCADE,
        FOREIGN KEY(client_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE CASCADE
      );
    `);
    const adminEmail = "admin@logup.com";
    const adminPassword = await bcrypt.hash("admin123", 10);
    const [adminRows] = await connection.query("SELECT id FROM users WHERE email = ?", [adminEmail]);
    if (adminRows.length === 0) {
      await connection.query("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", ["Admin Geral", adminEmail, adminPassword, "admin"]);
    } else {
      await connection.query("UPDATE users SET password = ? WHERE email = ?", [adminPassword, adminEmail]);
    }
    const vendedorEmail = "vendedor@logup.com";
    const vendedorPassword = await bcrypt.hash("vendedor123", 10);
    const [vendedorRows] = await connection.query("SELECT id FROM users WHERE email = ?", [vendedorEmail]);
    if (vendedorRows.length === 0) {
      const [result] = await connection.query("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", ["Vendedor Teste", vendedorEmail, vendedorPassword, "professional"]);
      await connection.query("INSERT INTO professionals (user_id, business_name, description, city, instagram) VALUES (?, ?, ?, ?, ?)", [result.insertId, "Barbearia do Vendedor", "Servi\xE7os de barbearia e est\xE9tica.", "S\xE3o Paulo", "@barbeariavendedor"]);
    } else {
      await connection.query("UPDATE users SET password = ? WHERE email = ?", [vendedorPassword, vendedorEmail]);
    }
    const clienteEmail = "cliente@logup.com";
    const clientePassword = await bcrypt.hash("cliente123", 10);
    const [clienteRows] = await connection.query("SELECT id FROM users WHERE email = ?", [clienteEmail]);
    if (clienteRows.length === 0) {
      await connection.query("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", ["Cliente Teste", clienteEmail, clientePassword, "client"]);
    } else {
      await connection.query("UPDATE users SET password = ? WHERE email = ?", [clientePassword, clienteEmail]);
    }
    connection.release();
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}
initDb();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!["professional", "client"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", [name, email, hashedPassword, role]);
    if (role === "professional") {
      await pool.query("INSERT INTO professionals (user_id) VALUES (?)", [result.insertId]);
    }
    const token = jwt.sign({ id: result.insertId, role }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, user: { id: result.insertId, name, email, role } });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Email already exists" });
    }
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    const user = rows[0];
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    if (user.status === "inactive") {
      return res.status(403).json({ error: "Account is inactive. Please contact support." });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, email, role FROM users WHERE id = ?", [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    if (req.user.role === "professional") {
      const [profRows] = await pool.query("SELECT * FROM professionals WHERE user_id = ?", [req.user.id]);
      return res.json({ ...user, professionalData: profRows[0] });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
app.put("/api/professional/profile", authenticateToken, async (req, res) => {
  if (req.user.role !== "professional") return res.status(403).json({ error: "Access denied" });
  try {
    const { business_name, description, photo_url, city, instagram, banner_url } = req.body;
    await pool.query(
      "UPDATE professionals SET business_name = ?, description = ?, photo_url = ?, city = ?, instagram = ?, banner_url = ? WHERE user_id = ?",
      [business_name || null, description || null, photo_url || null, city || null, instagram || null, banner_url || null, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/api/services", authenticateToken, async (req, res) => {
  if (req.user.role !== "professional") return res.status(403).json({ error: "Access denied" });
  try {
    const [profRows] = await pool.query("SELECT id FROM professionals WHERE user_id = ?", [req.user.id]);
    const prof = profRows[0];
    const [services] = await pool.query("SELECT * FROM services WHERE professional_id = ?", [prof.id]);
    res.json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/services", authenticateToken, async (req, res) => {
  if (req.user.role !== "professional") return res.status(403).json({ error: "Access denied" });
  const { name, price, duration } = req.body;
  try {
    const [profRows] = await pool.query("SELECT id FROM professionals WHERE user_id = ?", [req.user.id]);
    const prof = profRows[0];
    const [result] = await pool.query("INSERT INTO services (professional_id, name, price, duration) VALUES (?, ?, ?, ?)", [prof.id, name, price, duration]);
    res.json({ id: result.insertId, name, price, duration });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
app.delete("/api/services/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "professional") return res.status(403).json({ error: "Access denied" });
  try {
    const [profRows] = await pool.query("SELECT id FROM professionals WHERE user_id = ?", [req.user.id]);
    const prof = profRows[0];
    const [serviceRows] = await pool.query("SELECT * FROM services WHERE id = ? AND professional_id = ?", [req.params.id, prof.id]);
    const service = serviceRows[0];
    if (!service) return res.status(404).json({ error: "Service not found or unauthorized" });
    await pool.query("DELETE FROM services WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/professionals", async (req, res) => {
  try {
    const [professionals] = await pool.query(`
      SELECT p.id, u.name, p.business_name, p.description, p.photo_url, p.city, p.instagram, p.banner_url 
      FROM professionals p 
      JOIN users u ON p.user_id = u.id
    `);
    res.json(professionals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/professionals/:id", async (req, res) => {
  try {
    const [profRows] = await pool.query(`
      SELECT p.id, u.name, p.business_name, p.description, p.photo_url, p.city, p.instagram, p.banner_url 
      FROM professionals p 
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [req.params.id]);
    const professional = profRows[0];
    if (!professional) return res.status(404).json({ error: "Professional not found" });
    const [services] = await pool.query("SELECT * FROM services WHERE professional_id = ?", [req.params.id]);
    res.json({ ...professional, services });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/appointments", authenticateToken, async (req, res) => {
  if (req.user.role !== "client") return res.status(403).json({ error: "Only clients can book" });
  const { professional_id, service_id, start_time, end_time } = req.body;
  try {
    const [conflictRows] = await pool.query(`
      SELECT id FROM appointments 
      WHERE professional_id = ? AND status = 'scheduled' AND (
        (start_time <= ? AND end_time > ?) OR
        (start_time < ? AND end_time >= ?) OR
        (start_time >= ? AND end_time <= ?)
      )
    `, [professional_id, start_time, start_time, end_time, end_time, start_time, end_time]);
    if (conflictRows.length > 0) {
      return res.status(400).json({ error: "Time slot is already booked" });
    }
    const [result] = await pool.query(
      "INSERT INTO appointments (professional_id, client_id, service_id, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
      [professional_id, req.user.id, service_id, start_time, end_time]
    );
    res.json({ id: result.insertId, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/appointments", authenticateToken, async (req, res) => {
  try {
    if (req.user.role === "professional") {
      const [profRows] = await pool.query("SELECT id FROM professionals WHERE user_id = ?", [req.user.id]);
      const prof = profRows[0];
      const [appointments] = await pool.query(`
        SELECT a.*, u.name as client_name, s.name as service_name, s.price 
        FROM appointments a
        JOIN users u ON a.client_id = u.id
        JOIN services s ON a.service_id = s.id
        WHERE a.professional_id = ?
        ORDER BY a.start_time ASC
      `, [prof.id]);
      res.json(appointments);
    } else if (req.user.role === "client") {
      const [appointments] = await pool.query(`
        SELECT a.*, p.business_name, u.name as professional_name, s.name as service_name, s.price 
        FROM appointments a
        JOIN professionals p ON a.professional_id = p.id
        JOIN users u ON p.user_id = u.id
        JOIN services s ON a.service_id = s.id
        WHERE a.client_id = ?
        ORDER BY a.start_time DESC
      `, [req.user.id]);
      res.json(appointments);
    } else {
      res.status(403).json({ error: "Access denied" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
app.put("/api/appointments/:id/status", authenticateToken, async (req, res) => {
  const { status } = req.body;
  if (!["scheduled", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  try {
    await pool.query("UPDATE appointments SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/admin/users", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });
  try {
    const [users] = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.status,
             COALESCE(p.subscription_status, 'N/A') as subscription_status
      FROM users u
      LEFT JOIN professionals p ON u.id = p.user_id
      ORDER BY u.created_at DESC
    `);
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
app.put("/api/admin/users/:id/status", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });
  const { status } = req.body;
  if (!["active", "inactive"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  try {
    await pool.query("UPDATE users SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/admin/users", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });
  const { name, email, password, role } = req.body;
  if (!["professional", "client"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", [name, email, hashedPassword, role]);
    if (role === "professional") {
      await pool.query("INSERT INTO professionals (user_id) VALUES (?)", [result.insertId]);
    }
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Email already exists" });
    }
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});
app.delete("/api/admin/users/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });
  const userId = req.params.id;
  try {
    const [userRows] = await pool.query("SELECT role FROM users WHERE id = ?", [userId]);
    const user = userRows[0];
    if (user && user.role === "professional") {
      const [profRows] = await pool.query("SELECT id FROM professionals WHERE user_id = ?", [userId]);
      const prof = profRows[0];
      if (prof) {
        await pool.query("DELETE FROM appointments WHERE professional_id = ?", [prof.id]);
        await pool.query("DELETE FROM services WHERE professional_id = ?", [prof.id]);
        await pool.query("DELETE FROM professionals WHERE id = ?", [prof.id]);
      }
    } else if (user && user.role === "client") {
      await pool.query("DELETE FROM appointments WHERE client_id = ?", [userId]);
    }
    await pool.query("DELETE FROM users WHERE id = ?", [userId]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting user", error);
    res.status(500).json({ error: "Server error" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
