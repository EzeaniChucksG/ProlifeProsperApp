/**
 * Crypto utilities for encrypting/decrypting sensitive data
 * Uses proper AES-256-GCM with authenticated encryption
 * 
 * SECURITY NOTES:
 * - Uses crypto.createCipherGCM/createDecipherGCM for proper GCM mode
 * - Requires ENCRYPTION_KEY in production (no insecure fallbacks)
 * - Implements proper IV handling and authentication tag verification
 * - Provides timing-safe comparison functions for HMAC verification
 */

import crypto from 'crypto';

// Encryption settings for AES-256-GCM
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits (recommended for GCM)
const TAG_LENGTH = 16; // 128 bits authentication tag

/**
 * Get encryption key from environment with security enforcement
 * In production, ENCRYPTION_KEY must be set - no insecure fallbacks allowed
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  
  if (!envKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable must be set in production for security');
    }
    
    // Development fallback - derive consistently from DATABASE_URL
    console.log('⚠️ Using development encryption key fallback - set ENCRYPTION_KEY for production');
    const dbUrl = process.env.DATABASE_URL || 'development-fallback-key-do-not-use-in-production';
    return crypto.createHash('sha256').update(dbUrl).digest();
  }
  
  // Validate key format and length
  let key: Buffer;
  try {
    key = Buffer.from(envKey, 'base64');
  } catch (error) {
    throw new Error('ENCRYPTION_KEY must be base64 encoded');
  }
  
  if (key.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be ${KEY_LENGTH} bytes when base64 decoded (got ${key.length} bytes)`);
  }
  
  return key;
}

/**
 * Encrypt sensitive text data using AES-256-GCM
 * Format: base64(iv):base64(tag):hex(ciphertext)
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) {
    return '';
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Use proper Node.js GCM cipher API
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Validate tag length
    if (tag.length !== TAG_LENGTH) {
      throw new Error('Invalid authentication tag length');
    }
    
    // Return format: iv:tag:ciphertext (base64:base64:hex)
    const result = `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`;
    
    console.log('🔐 Secret encrypted successfully');
    return result;
  } catch (error) {
    console.error('❌ Error encrypting secret:', error);
    throw new Error('Failed to encrypt secret');
  }
}

/**
 * Decrypt sensitive text data using AES-256-GCM with authentication
 */
export function decryptSecret(encryptedData: string): string {
  if (!encryptedData) {
    return '';
  }

  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format - expected iv:tag:ciphertext');
    }
    
    // Parse components
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];
    
    // Validate component lengths
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length - expected ${IV_LENGTH} bytes, got ${iv.length}`);
    }
    if (tag.length !== TAG_LENGTH) {
      throw new Error(`Invalid authentication tag length - expected ${TAG_LENGTH} bytes, got ${tag.length}`);
    }
    
    // Use proper GCM decipher with IV
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log('🔓 Secret decrypted successfully');
    return decrypted;
  } catch (error) {
    console.error('❌ Error decrypting secret:', error);
    throw new Error('Failed to decrypt secret');
  }
}

/**
 * Timing-safe comparison for HMAC verification
 * Prevents timing attacks on webhook signature verification
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  
  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * Verify HMAC-SHA256 signature in timing-safe manner
 * Used for webhook signature verification
 */
export function verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    // Remove any 'sha256=' prefix from signature
    const cleanSignature = signature.replace(/^sha256=/, '');
    
    return timingSafeEqual(expectedSignature, cleanSignature);
  } catch (error) {
    console.error('❌ Error verifying HMAC signature:', error);
    return false;
  }
}

/**
 * Mask sensitive data for logging/API responses
 */
export function maskSecret(secret: string): string {
  if (!secret) {
    return '';
  }
  
  if (secret.length <= 8) {
    return '*'.repeat(secret.length);
  }
  
  // Show first 4 and last 4 characters, mask the middle
  const start = secret.substring(0, 4);
  const end = secret.substring(secret.length - 4);
  const middle = '*'.repeat(secret.length - 8);
  
  return start + middle + end;
}

/**
 * Redact sensitive fields from an object for API responses
 */
export function redactSensitiveFields<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (!obj) {
    return obj;
  }
  
  const redacted = { ...obj } as Record<string, any>;
  
  // List of sensitive field names to redact
  const sensitiveFields = [
    'btcpayApiKey',
    'btcpayWebhookSecret',
    'apiKey',
    'webhookSecret',
    'password',
    'secret',
    'token',
    'key'
  ];
  
  for (const field of sensitiveFields) {
    if (redacted[field]) {
      redacted[field] = maskSecret(redacted[field]);
    }
  }
  
  return redacted;
}

/**
 * Check if a string is encrypted (has our encryption format)
 * Format: base64:base64:hex
 */
export function isEncrypted(data: string): boolean {
  if (!data) {
    return false;
  }
  
  const parts = data.split(':');
  if (parts.length !== 3) {
    return false;
  }
  
  try {
    // Check if first two parts are valid base64
    Buffer.from(parts[0], 'base64');
    Buffer.from(parts[1], 'base64');
    
    // Check if third part is valid hex
    if (!/^[0-9a-f]+$/i.test(parts[2])) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely encrypt a secret only if it's not already encrypted
 * Prevents double-encryption and handles masked values
 */
export function safeEncryptSecret(secret: string): string {
  if (!secret) {
    return '';
  }
  
  // Don't encrypt masked values (e.g., "abcd****efgh")
  if (secret.includes('*')) {
    console.log('🔐 Secret appears to be masked, skipping encryption');
    return secret;
  }
  
  if (isEncrypted(secret)) {
    console.log('🔐 Secret is already encrypted, skipping encryption');
    return secret;
  }
  
  return encryptSecret(secret);
}

/**
 * Safely decrypt a secret, handling both encrypted and plain text
 * Provides backward compatibility during migration
 */
export function safeDecryptSecret(secret: string): string {
  if (!secret) {
    return '';
  }
  
  // Don't try to decrypt masked values
  if (secret.includes('*')) {
    console.log('🔐 Secret appears to be masked, returning as-is');
    return secret;
  }
  
  if (isEncrypted(secret)) {
    return decryptSecret(secret);
  }
  
  // If not encrypted, return as-is (for backward compatibility)
  console.log('⚠️ Secret is not encrypted, consider migrating to encrypted storage');
  return secret;
}