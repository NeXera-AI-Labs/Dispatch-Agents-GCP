import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRY = '8h';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: {
  user_id: string;
  tenant_id: string;
  email: string;
  role: string;
  warehouse_numbers: string[];
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): {
  user_id: string;
  tenant_id: string;
  email: string;
  role: string;
  warehouse_numbers: string[];
} | null {
  try {
    return jwt.verify(token, JWT_SECRET) as ReturnType<typeof verifyToken>;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: Request): ReturnType<typeof verifyToken> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}
