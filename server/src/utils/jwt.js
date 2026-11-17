import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

function requireJwtSecret() {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not configured.');
  }
  return env.jwtSecret;
}

export function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user.userId,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    requireJwtSecret(),
    { expiresIn: env.jwtExpiresIn }
  );
}

export function verifyAuthToken(token) {
  return jwt.verify(token, requireJwtSecret());
}
