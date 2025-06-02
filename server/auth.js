import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const users = new Map();

const hashPassword = async (password) => {
  return bcryptjs.hash(password, 10);
};

const verifyPassword = async (password, hash) => {
  return bcryptjs.compare(password, hash);
};

const authMiddleware = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId || !users.has(userId)) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  req.userId = userId;
  next();
};

export {
  hashPassword,
  verifyPassword,
  authMiddleware,
  users
};