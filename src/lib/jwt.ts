import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret'; // Use Secrets Manager in prod

export const signAccessToken = async (payload: object): Promise<string> => {
  return jwt.sign(payload, SECRET, { expiresIn: '15m' });
};

export const signRefreshToken = async (payload: object): Promise<string> => {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
};
