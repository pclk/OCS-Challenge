import crypto from 'crypto';

// Password hashing salt/secret
const PASSWORD_SALT = process.env.PASSWORD_SALT || '';
if (!PASSWORD_SALT) {
  throw new Error('PASSWORD_SALT environment variable is required. Please set it in .env.local');
}

// Session token secret (different from password salt)
const SESSION_SECRET = process.env.SESSION_SECRET || (PASSWORD_SALT ? PASSWORD_SALT + '_SESSION' : '');
if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required. Please set it in .env.local or ensure PASSWORD_SALT is set.');
}

// Admin password
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
if (!ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD environment variable is required. Please set it in .env.local');
}

// Token expiration (30 days in milliseconds)
const TOKEN_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000;

export interface TokenPayload {
  userId: number;
  name: string;
  wing: string | null;
  timestamp: number;
  expiresAt: number;
}

/**
 * Hash a password using HMAC-SHA256 with the password salt
 */
export function hashPassword(password: string): string {
  return crypto
    .createHmac('sha256', PASSWORD_SALT)
    .update(password)
    .digest('hex');
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  const computedHash = hashPassword(password);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash),
    Buffer.from(hash)
  );
}

/**
 * Generate a session token for a user
 */
export function generateSessionToken(userId: number, name: string, wing: string | null): string {
  const timestamp = Date.now();
  const expiresAt = timestamp + TOKEN_EXPIRATION_MS;
  
  const payload: TokenPayload = {
    userId,
    name,
    wing,
    timestamp,
    expiresAt,
  };

  // Create signature
  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadString)
    .digest('hex');

  // Combine payload and signature (base64 encoded)
  const tokenData = {
    payload,
    signature,
  };

  return Buffer.from(JSON.stringify(tokenData)).toString('base64url');
}

/**
 * Verify and decode a session token
 */
export function verifySessionToken(token: string): TokenPayload | null {
  try {
    // Decode token
    const tokenData = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'));
    
    if (!tokenData.payload || !tokenData.signature) {
      return null;
    }

    const { payload, signature } = tokenData;

    // Verify signature
    const payloadString = JSON.stringify(payload);
    const computedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadString)
      .digest('hex');

    if (!crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    )) {
      return null;
    }

    // Check expiration
    if (payload.expiresAt < Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Verify admin password
 */
export function verifyAdminPassword(password: string): boolean {
    console.log('ADMIN_PASSWORD', ADMIN_PASSWORD, 'password', password);
    console.log('process.env', process.env);

  return password === ADMIN_PASSWORD;
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

