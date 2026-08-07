import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d',
  });
}

// Throws on invalid/expired tokens - callers decide how to translate that.
export function verifyToken(token: string): string {
  const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  if (typeof payload === 'string' || !payload.sub)
    throw new Error('token missing sub');
  return payload.sub;
}
