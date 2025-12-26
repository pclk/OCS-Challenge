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

// Admin passwords
const OCS_ADMIN_PASSWORD = process.env.OCS_ADMIN_PASSWORD || '';
const WING_ADMIN_PASSWORD = process.env.WING_ADMIN_PASSWORD || '';

// Keep ADMIN_PASSWORD for backward compatibility
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// Token expiration defaults (in milliseconds)
const TOKEN_EXPIRATION_7_DAYS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_EXPIRATION_30_DAYS = 30 * 24 * 60 * 60 * 1000;
const TOKEN_EXPIRATION_FOREVER = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years (effectively forever)
const TOKEN_EXPIRATION_MS = TOKEN_EXPIRATION_30_DAYS; // Default

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
 * @param userId - User ID
 * @param name - User name
 * @param wing - User wing
 * @param expirationMs - Optional custom expiration time in milliseconds. If not provided, uses default (30 days)
 */
export function generateSessionToken(
  userId: number, 
  name: string, 
  wing: string | null, 
  expirationMs?: number
): string {
  const timestamp = Date.now();
  const expiresAt = timestamp + (expirationMs || TOKEN_EXPIRATION_MS);
  
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
 * Get expiration time in milliseconds based on remember me option
 */
export function getExpirationTime(rememberMe: '7days' | '30days' | 'forever'): number {
  switch (rememberMe) {
    case '7days':
      return TOKEN_EXPIRATION_7_DAYS;
    case '30days':
      return TOKEN_EXPIRATION_30_DAYS;
    case 'forever':
      return TOKEN_EXPIRATION_FOREVER;
    default:
      return TOKEN_EXPIRATION_30_DAYS;
  }
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
 * Verify OCS admin password
 */
export function verifyOCSAdminPassword(password: string): boolean {
  return password === OCS_ADMIN_PASSWORD;
}

/**
 * Verify Wing admin password
 */
export function verifyWingAdminPassword(password: string): boolean {
  return password === WING_ADMIN_PASSWORD;
}

/**
 * Get wing from wing-specific password
 */
export function getWingFromPassword(password: string): string | null {
  const wingPasswords: Record<string, string> = {
    'ALPHA_WING_PASSWORD': process.env.ALPHA_WING_PASSWORD || '',
    'CHARLIE_WING_PASSWORD': process.env.CHARLIE_WING_PASSWORD || '',
    'DELTA_WING_PASSWORD': process.env.DELTA_WING_PASSWORD || '',
    'ECHO_WING_PASSWORD': process.env.ECHO_WING_PASSWORD || '',
    'TANGO_WING_PASSWORD': process.env.TANGO_WING_PASSWORD || '',
    'SIERRA_WING_PASSWORD': process.env.SIERRA_WING_PASSWORD || '',
    'MIDS_WING_PASSWORD': process.env.MIDS_WING_PASSWORD || '',
    'AIR_WING_PASSWORD': process.env.AIR_WING_PASSWORD || '',
    'DIS_WING_PASSWORD': process.env.DIS_WING_PASSWORD || '',
    'OCS_HQ_PASSWORD': process.env.OCS_HQ_PASSWORD || '',
    'CLD_PASSWORD': process.env.CLD_PASSWORD || '',
  };

  const wingMapping: Record<string, string> = {
    [wingPasswords['ALPHA_WING_PASSWORD']]: 'ALPHA WING',
    [wingPasswords['CHARLIE_WING_PASSWORD']]: 'CHARLIE WING',
    [wingPasswords['DELTA_WING_PASSWORD']]: 'DELTA WING',
    [wingPasswords['ECHO_WING_PASSWORD']]: 'ECHO WING',
    [wingPasswords['TANGO_WING_PASSWORD']]: 'TANGO WING',
    [wingPasswords['SIERRA_WING_PASSWORD']]: 'SIERRA WING',
    [wingPasswords['MIDS_WING_PASSWORD']]: 'MIDS WING',
    [wingPasswords['AIR_WING_PASSWORD']]: 'AIR WING',
    [wingPasswords['DIS_WING_PASSWORD']]: 'DIS WING',
    [wingPasswords['OCS_HQ_PASSWORD']]: 'OCS HQ',
    [wingPasswords['CLD_PASSWORD']]: 'CLD',
  };

  return wingMapping[password] || null;
}

/**
 * Get admin level from password (returns 'OCS', 'WING', or null)
 */
export function getAdminLevel(password: string): 'OCS' | 'WING' | null {
  if (verifyOCSAdminPassword(password)) {
    return 'OCS';
  }
  if (verifyWingAdminPassword(password) || getWingFromPassword(password)) {
    return 'WING';
  }
  // Backward compatibility with old ADMIN_PASSWORD
  if (ADMIN_PASSWORD && password === ADMIN_PASSWORD) {
    return 'OCS';
  }
  return null;
}

/**
 * Verify admin password (backward compatibility - checks both levels)
 */
export function verifyAdminPassword(password: string): boolean {
  return getAdminLevel(password) !== null;
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

