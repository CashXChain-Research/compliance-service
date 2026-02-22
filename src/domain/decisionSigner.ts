import jwt from 'jsonwebtoken';
import type { DecisionStatus } from './types';

const JWT_EXPIRY_SEC = 15 * 60; // 15 min

export type TokenPayload = {
  decisionId: string;
  status: DecisionStatus;
  senderId: string;
  receiverId: string;
  amount: number;
  currency: string;
  issuedAt: number;
};

export function signDecisionToken(payload: Omit<TokenPayload, 'issuedAt'>): string {
  const secret = process.env.JWT_SECRET ?? 'default-secret-change-me';
  const issuedAt = Math.floor(Date.now() / 1000);
  const tokenPayload: TokenPayload = { ...payload, issuedAt };
  return jwt.sign(tokenPayload, secret, {
    algorithm: 'HS256',
    expiresIn: JWT_EXPIRY_SEC,
  });
}

export function verifyDecisionToken(token: string): TokenPayload | null {
  const secret = process.env.JWT_SECRET ?? 'default-secret-change-me';
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}
