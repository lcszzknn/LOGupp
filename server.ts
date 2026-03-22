import express from 'express';
import cors from 'cors';
import path from 'path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';

// SQLite Database setup
const sqliteDb = new Database('logup.db');
sqliteDb.pragma('journal_mode = WAL'); // Performance improvement

// Async wrapper to mimic mysql2/promise pool behavior so we don't have to rewrite 500 lines of API handlers!
const pool = {
  query: async (sqlStr: string, params: any[] = []) => {
    return new Promise((resolve, reject) => {
      try {
        let sql = sqlStr.replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT'); // SQLite equivalent
        sql = sql.replace(/ENUM\([^)]+\)/gi, 'TEXT'); // SQLite doesn't have ENUM

        const isQuery = sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA');
        
        const stmt = sqliteDb.prepare(sql);
        
        if (isQuery) {
          const rows = stmt.all(params);
          resolve([rows]);
        } else {
          const info = stmt.run(params);
          resolve([{ insertId: info.lastInsertRowid, affectedRows: info.changes }]);
        }
      } catch (err) {
        reject(err);
      }
    });
  },
  getConnection: async () => pool,
  release: () => {},
  end: async () => {}
};

// Initialize Database Schema
async function initDb() {
  try {
    const connection = await pool.getConnection();
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS professionals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        professional_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        price REAL NOT NULL,
        duration INTEGER NOT NULL,
        FOREIGN KEY(professional_id) REFERENCES professionals(id) ON DELETE CASCADE
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        professional_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        status TEXT DEFAULT 'scheduled',
        FOREIGN KEY(professional_id) REFERENCES professionals(id) ON DELETE CASCADE,
        FOREIGN KEY(client_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS appointment_services (
        appointment_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
        FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE CASCADE,
        PRIMARY KEY (appointment_id, service_id)
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS professional_hours (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        professional_id INTEGER NOT NULL,
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY(professional_id) REFERENCES professionals(id) ON DELETE CASCADE
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS professional_blocked_dates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        professional_id INTEGER NOT NULL,
        blocked_date TEXT NOT NULL,
        FOREIGN KEY(professional_id) REFERENCES professionals(id) ON DELETE CASCADE
      );
    `);

    // Seed Admin
    const adminEmail = 'admin@logup.com';
    const adminPassword = await bcrypt.hash('admin123', 10);
    const [adminRows]: any = await connection.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
    if (adminRows.length === 0) {
      await connection.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Admin Geral', adminEmail, adminPassword, 'admin']);
    } else {
      await connection.query('UPDATE users SET password = ? WHERE email = ?', [adminPassword, adminEmail]);
    }

    // Seed Vendedor (Professional)
    const vendedorEmail = 'vendedor@logup.com';
    const vendedorPassword = await bcrypt.hash('vendedor123', 10);
    const [vendedorRows]: any = await connection.query('SELECT id FROM users WHERE email = ?', [vendedorEmail]);
    if (vendedorRows.length === 0) {
      const [result]: any = await connection.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Vendedor Teste', vendedorEmail, vendedorPassword, 'professional']);
      await connection.query('INSERT INTO professionals (user_id, business_name, description, city, instagram) VALUES (?, ?, ?, ?, ?)', [result.insertId, 'Barbearia do Vendedor', 'Serviços de barbearia e estética.', 'São Paulo', '@barbeariavendedor']);
    } else {
      await connection.query('UPDATE users SET password = ? WHERE email = ?', [vendedorPassword, vendedorEmail]);
    }

    // Seed Cliente
    const clienteEmail = 'cliente@logup.com';
    const clientePassword = await bcrypt.hash('cliente123', 10);
    const [clienteRows]: any = await connection.query('SELECT id FROM users WHERE email = ?', [clienteEmail]);
    if (clienteRows.length === 0) {
      await connection.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Cliente Teste', clienteEmail, clientePassword, 'client']);
    } else {
      await connection.query('UPDATE users SET password = ? WHERE email = ?', [clientePassword, clienteEmail]);
    }

    console.log('Database initialized successfully with SQLite');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

initDb();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- API Routes ---

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  
  if (!['professional', 'client'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result]: any = await pool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashedPassword, role]);
    
    if (role === 'professional') {
      await pool.query('INSERT INTO professionals (user_id) VALUES (?)', [result.insertId]);
    }

    const token = jwt.sign({ id: result.insertId, role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: result.insertId, name, email, role } });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const [rows]: any = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Account is inactive. Please contact support.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Current User
app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  try {
    const [rows]: any = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (req.user.role === 'professional') {
      const [profRows]: any = await pool.query('SELECT * FROM professionals WHERE user_id = ?', [req.user.id]);
      return res.json({ ...user, professionalData: profRows[0] });
    }
    
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Professional Profile Update
app.put('/api/professional/profile', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'professional') return res.status(403).json({ error: 'Access denied' });
  
  try {
    const { business_name, description, photo_url, city, instagram, banner_url } = req.body;
    await pool.query(
      'UPDATE professionals SET business_name = ?, description = ?, photo_url = ?, city = ?, instagram = ?, banner_url = ? WHERE user_id = ?',
      [business_name || null, description || null, photo_url || null, city || null, instagram || null, banner_url || null, req.user.id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Services Management
app.get('/api/services', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'professional') return res.status(403).json({ error: 'Access denied' });
  
  try {
    const [profRows]: any = await pool.query('SELECT id FROM professionals WHERE user_id = ?', [req.user.id]);
    const prof = profRows[0];
    
    const [services]: any = await pool.query('SELECT * FROM services WHERE professional_id = ?', [prof.id]);
    res.json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/services', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'professional') return res.status(403).json({ error: 'Access denied' });
  
  const { name, price, duration } = req.body;
  try {
    const [profRows]: any = await pool.query('SELECT id FROM professionals WHERE user_id = ?', [req.user.id]);
    const prof = profRows[0];
    
    const [result]: any = await pool.query('INSERT INTO services (professional_id, name, price, duration) VALUES (?, ?, ?, ?)', [prof.id, name, price, duration]);
    
    res.json({ id: result.insertId, name, price, duration });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/services/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'professional') return res.status(403).json({ error: 'Access denied' });
  
  try {
    const [profRows]: any = await pool.query('SELECT id FROM professionals WHERE user_id = ?', [req.user.id]);
    const prof = profRows[0];
    
    const [serviceRows]: any = await pool.query('SELECT * FROM services WHERE id = ? AND professional_id = ?', [req.params.id, prof.id]);
    const service = serviceRows[0];
    
    if (!service) return res.status(404).json({ error: 'Service not found or unauthorized' });
    
    await pool.query('DELETE FROM services WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all professionals (for clients)
app.get('/api/professionals', async (req, res) => {
  try {
    const [professionals]: any = await pool.query(`
      SELECT p.id, u.name, p.business_name, p.description, p.photo_url, p.city, p.instagram, p.banner_url 
      FROM professionals p 
      JOIN users u ON p.user_id = u.id
    `);
    res.json(professionals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get professional details and services
app.get('/api/professionals/:id', async (req, res) => {
  try {
    const [profRows]: any = await pool.query(`
      SELECT p.id, u.name, p.business_name, p.description, p.photo_url, p.city, p.instagram, p.banner_url 
      FROM professionals p 
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [req.params.id]);
    const professional = profRows[0];
    
    if (!professional) return res.status(404).json({ error: 'Professional not found' });
    
    const [services]: any = await pool.query('SELECT * FROM services WHERE professional_id = ?', [req.params.id]);
    const [hours]: any = await pool.query('SELECT * FROM professional_hours WHERE professional_id = ?', [req.params.id]);
    const [blockedDates]: any = await pool.query('SELECT blocked_date FROM professional_blocked_dates WHERE professional_id = ?', [req.params.id]);
    
    res.json({ ...professional, services, hours, blockedDates: blockedDates.map((b: any) => b.blocked_date) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/professionals/:id/booked-times', async (req, res) => {
  const { date } = req.query; // format YYYY-MM-DD
  if (!date) return res.status(400).json({ error: 'Date is required' });
  
  try {
    const [appointments]: any = await pool.query(`
      SELECT start_time, end_time FROM appointments
      WHERE professional_id = ? AND status = 'scheduled'
      AND start_time LIKE ?
    `, [req.params.id, `${date}%`]);

    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Appointments
app.post('/api/appointments', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'client') return res.status(403).json({ error: 'Only clients can book' });
  
  const { professional_id, service_ids, start_time, end_time } = req.body;
  if (!service_ids || service_ids.length === 0) return res.status(400).json({ error: 'No services selected' });
  
  try {
    // Check for conflicts
    const [conflictRows]: any = await pool.query(`
      SELECT id FROM appointments 
      WHERE professional_id = ? AND status = 'scheduled' AND (
        (start_time <= ? AND end_time > ?) OR
        (start_time < ? AND end_time >= ?) OR
        (start_time >= ? AND end_time <= ?)
      )
    `, [professional_id, start_time, start_time, end_time, end_time, start_time, end_time]);
    
    if (conflictRows.length > 0) {
      return res.status(400).json({ error: 'Time slot is already booked' });
    }

    const [result]: any = await pool.query(
      'INSERT INTO appointments (professional_id, client_id, start_time, end_time) VALUES (?, ?, ?, ?)',
      [professional_id, req.user.id, start_time, end_time]
    );
    
    const appointmentId = result.insertId;
    for (const serviceId of service_ids) {
      await pool.query('INSERT INTO appointment_services (appointment_id, service_id) VALUES (?, ?)', [appointmentId, serviceId]);
    }
    
    res.json({ id: appointmentId, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/appointments', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role === 'professional') {
      const [profRows]: any = await pool.query('SELECT id FROM professionals WHERE user_id = ?', [req.user.id]);
      const prof = profRows[0];
      
      const [appointments]: any = await pool.query(`
        SELECT a.*, u.name as client_name, 
               (SELECT GROUP_CONCAT(s.name, ', ') FROM appointment_services aps JOIN services s ON aps.service_id = s.id WHERE aps.appointment_id = a.id) as service_name,
               (SELECT SUM(s.price) FROM appointment_services aps JOIN services s ON aps.service_id = s.id WHERE aps.appointment_id = a.id) as price
        FROM appointments a
        JOIN users u ON a.client_id = u.id
        WHERE a.professional_id = ?
        ORDER BY a.start_time ASC
      `, [prof.id]);
      res.json(appointments);
    } else if (req.user.role === 'client') {
      const [appointments]: any = await pool.query(`
        SELECT a.*, p.business_name, u.name as professional_name,
               (SELECT GROUP_CONCAT(s.name, ', ') FROM appointment_services aps JOIN services s ON aps.service_id = s.id WHERE aps.appointment_id = a.id) as service_name,
               (SELECT SUM(s.price) FROM appointment_services aps JOIN services s ON aps.service_id = s.id WHERE aps.appointment_id = a.id) as price
        FROM appointments a
        JOIN professionals p ON a.professional_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE a.client_id = ?
        ORDER BY a.start_time DESC
      `, [req.user.id]);
      res.json(appointments);
    } else {
      res.status(403).json({ error: 'Access denied' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/appointments/:id/status', authenticateToken, async (req: any, res) => {
  const { status } = req.body;
  if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  try {
    await pool.query('UPDATE appointments SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Working Hours Management
app.get('/api/professional/hours', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'professional') return res.status(403).json({ error: 'Access denied' });
  try {
    const [profRows]: any = await pool.query('SELECT id FROM professionals WHERE user_id = ?', [req.user.id]);
    const prof = profRows[0];
    const [hours]: any = await pool.query('SELECT * FROM professional_hours WHERE professional_id = ?', [prof.id]);
    res.json(hours);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/professional/hours', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'professional') return res.status(403).json({ error: 'Access denied' });
  const { hours } = req.body; // array of { day_of_week, start_time, end_time, is_active }
  try {
    const [profRows]: any = await pool.query('SELECT id FROM professionals WHERE user_id = ?', [req.user.id]);
    const prof = profRows[0];
    
    await pool.query('DELETE FROM professional_hours WHERE professional_id = ?', [prof.id]);
    
    for (const h of hours) {
      await pool.query(
        'INSERT INTO professional_hours (professional_id, day_of_week, start_time, end_time, is_active) VALUES (?, ?, ?, ?, ?)',
        [prof.id, h.day_of_week, h.start_time, h.end_time, h.is_active ? 1 : 0]
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Blocked Dates Management
app.get('/api/professional/blocked-dates', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'professional') return res.status(403).json({ error: 'Access denied' });
  try {
    const [profRows]: any = await pool.query('SELECT id FROM professionals WHERE user_id = ?', [req.user.id]);
    const prof = profRows[0];
    const [dates]: any = await pool.query('SELECT blocked_date FROM professional_blocked_dates WHERE professional_id = ?', [prof.id]);
    res.json(dates.map((d: any) => d.blocked_date));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/professional/blocked-dates', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'professional') return res.status(403).json({ error: 'Access denied' });
  const { date } = req.body;
  try {
    const [profRows]: any = await pool.query('SELECT id FROM professionals WHERE user_id = ?', [req.user.id]);
    const prof = profRows[0];
    await pool.query('INSERT INTO professional_blocked_dates (professional_id, blocked_date) VALUES (?, ?)', [prof.id, date]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/professional/blocked-dates/:date', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'professional') return res.status(403).json({ error: 'Access denied' });
  try {
    const [profRows]: any = await pool.query('SELECT id FROM professionals WHERE user_id = ?', [req.user.id]);
    const prof = profRows[0];
    await pool.query('DELETE FROM professional_blocked_dates WHERE professional_id = ? AND blocked_date = ?', [prof.id, req.params.date]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin Routes
app.get('/api/admin/users', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  
  try {
    const [users]: any = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.status,
             COALESCE(p.subscription_status, 'N/A') as subscription_status
      FROM users u
      LEFT JOIN professionals p ON u.id = p.user_id
      ORDER BY u.created_at DESC
    `);
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/users/:id/status', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/users', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  
  const { name, email, password, role } = req.body;
  
  if (!['professional', 'client'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result]: any = await pool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashedPassword, role]);
    
    if (role === 'professional') {
      await pool.query('INSERT INTO professionals (user_id) VALUES (?)', [result.insertId]);
    }

    res.json({ success: true, id: result.insertId });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  
  const userId = req.params.id;
  
  try {
    const [userRows]: any = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
    const user = userRows[0];
    
    if (user && user.role === 'professional') {
      const [profRows]: any = await pool.query('SELECT id FROM professionals WHERE user_id = ?', [userId]);
      const prof = profRows[0];
      
      if (prof) {
        await pool.query('DELETE FROM appointments WHERE professional_id = ?', [prof.id]);
        await pool.query('DELETE FROM services WHERE professional_id = ?', [prof.id]);
        await pool.query('DELETE FROM professionals WHERE id = ?', [prof.id]);
      }
    } else if (user && user.role === 'client') {
      await pool.query('DELETE FROM appointments WHERE client_id = ?', [userId]);
    }
    
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Vite Middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
