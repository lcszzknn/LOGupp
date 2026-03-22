import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../database/mysql';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

// Middleware de autenticação
export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ error: 'Token inválido ou expirado' });
      }
      req.user = user;
      next();
    });

  } catch (error) {
    return res.status(500).json({ error: 'Erro ao verificar token' });
  }
}

// Middleware para verificar role
export function authorizeRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado. Role insuficiente.' });
    }

    next();
  };
}

// Middleware para buscar dados adicionais do usuário
export async function enrichUserData(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      return next();
    }

    const [users]: any = await (pool as any).execute(
      'SELECT u.id, u.name, u.email, u.role, pp.id as profile_id FROM users u LEFT JOIN professional_profiles pp ON u.id = pp.user_id WHERE u.id = ?',
      [req.user.id]
    );

    if (users.length > 0) {
      req.user = { ...req.user, ...users[0] };
    }

    next();

  } catch (error) {
    console.error('Erro ao enriquecer dados do usuário:', error);
    next();
  }
}

export default { authenticateToken, authorizeRole, enrichUserData };
