import { storage } from "../../storage";
import { sendError } from "../../lib/apiResponse";

export const authenticateToken = async (req: any, res: any, next: any) => {
  console.log('Auth middleware - headers:', req.headers);
  const token = req.headers.authorization?.replace('Bearer ', '');
  console.log('Auth middleware - token:', token ? 'present' : 'missing');

  if (!token) {
    console.log('Auth middleware - no token provided');
    return sendError(res, 401, 'No token provided');
  }

  try {
    const session = await storage.getSessionByToken(token);
    console.log('Auth middleware - session:', session ? 'found' : 'not found');
    if (!session || session.expiresAt < new Date()) {
      console.log('Auth middleware - invalid or expired session');
      return sendError(res, 401, 'Invalid or expired token');
    }

    const user = await storage.getUser(session.userId);
    console.log('Auth middleware - user:', user ? 'found' : 'not found');
    if (!user) {
      console.log('Auth middleware - user not found');
      return sendError(res, 401, 'User not found');
    }

    req.user = user;
    console.log('Auth middleware - authentication successful for user:', user.username);
    next();
  } catch (error) {
    console.error('Auth middleware - error:', error);
    sendError(res, 500, 'Token validation failed');
  }
};