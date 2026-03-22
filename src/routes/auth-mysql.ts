import express, { Request, Response } from 'express';
import pool from '../database/mysql';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

// ===== AUTENTICAÇÃO =====

// Registrar novo usuário
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    // Validações
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email e password são obrigatórios' });
    }

    // Verificar se email já existe
    const [existingUsers] = await (pool as any).execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if ((existingUsers as any[]).length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Inserir usuário
    const [result] = await (pool as any).execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role || 'client']
    );

    // Gerar JWT
    const user = {
      id: (result as any).insertId,
      name,
      email,
      role: role || 'client'
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });

    return res.status(201).json({
      message: 'Usuário criado com sucesso',
      token,
      user
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    return res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password obrigatórios' });
    }

    // Buscar usuário
    const [users]: any = await (pool as any).execute(
      'SELECT id, name, email, password, role FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = users[0];

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Registrar sessão
    await (pool as any).execute(
      'INSERT INTO sessions (user_id, token, ip_address, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))',
      [user.id, token, req.ip]
    );

    return res.json({
      message: 'Login bem-sucedido',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// ===== PERFIL PROFISSIONAL =====

// Criar/atualizar perfil profissional
router.post('/professional-profile', async (req: Request, res: Response) => {
  try {
    const { id: userId } = (req as any).user; // Adicione middleware de autenticação
    const { bio, specialization, experience_years, hourly_rate, phone, location } = req.body;

    // Verificar se já tem perfil
    const [existing]: any = await (pool as any).execute(
      'SELECT id FROM professional_profiles WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      // Atualizar
      await (pool as any).execute(
        'UPDATE professional_profiles SET bio=?, specialization=?, experience_years=?, hourly_rate=?, phone=?, location=? WHERE user_id=?',
        [bio, specialization, experience_years, hourly_rate, phone, location, userId]
      );
      return res.json({ message: 'Perfil atualizado com sucesso' });
    } else {
      // Criar
      await (pool as any).execute(
        'INSERT INTO professional_profiles (user_id, bio, specialization, experience_years, hourly_rate, phone, location) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, bio, specialization, experience_years, hourly_rate, phone, location]
      );
      return res.status(201).json({ message: 'Perfil criado com sucesso' });
    }

  } catch (error) {
    console.error('Erro ao salvar perfil:', error);
    return res.status(500).json({ error: 'Erro ao salvar perfil' });
  }
});

// ===== AUDITORIA =====

// Função auxiliar para registrar ações
export async function logAction(
  userId: number | null,
  action: string,
  entityType: string,
  entityId: number,
  oldValues: any = null,
  newValues: any = null,
  ipAddress: string = 'unknown'
) {
  try {
    await (pool as any).execute(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        userId,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress
      ]
    );
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
  }
}

export default router;
