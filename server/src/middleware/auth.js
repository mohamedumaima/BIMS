import { verifyAuthToken } from '../utils/jwt.js';

/**
 * Verifies the Bearer JWT and attaches the decoded user payload to req.user.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  const queryToken = typeof req.query?.token === 'string' ? req.query.token.trim() : '';

  let token = '';
  if (header && header.startsWith('Bearer ')) {
    token = header.slice(7).trim();
  } else if (queryToken) {
    token = queryToken;
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication token missing' });
  }

  try {
    const decoded = verifyAuthToken(token);
    req.user = {
      userId: Number(decoded.sub),
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

/**
 * Restricts route access to users matching one of the allowed RBAC roles.
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions for this action',
      });
    }
    return next();
  };
}
