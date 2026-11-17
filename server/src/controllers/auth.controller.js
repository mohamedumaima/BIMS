import bcrypt from 'bcryptjs';
import { z } from 'zod';
import {
  createSystemUser,
  findUserByEmail,
  findUserById,
} from '../services/dataStore.js';
import { signAuthToken } from '../utils/jwt.js';

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(100),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']).default('STAFF'),
});

const toPublicUser = (user) => ({
  userId: user.userId,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

export async function login(req, res) {
  const { email, password } = loginSchema.parse(req.body);
  const user = await findUserByEmail(email);

  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signAuthToken(user);
  return res.json({
    token,
    user: toPublicUser(user),
  });
}

export async function registerUser(req, res) {
  const payload = registerSchema.parse(req.body);
  const user = await createSystemUser(payload);
  return res.status(201).json({ user });
}

export async function getCurrentUser(req, res) {
  const user = await findUserById(req.user.userId);

  if (!user || !user.isActive) {
    return res.status(404).json({ error: 'User account not found or inactive' });
  }

  return res.json({ user: toPublicUser(user) });
}
