'use strict';

const crypto = require('crypto');

// Get encryption key from environment or use a default for development
const encryptionKey = process.env.ENCRYPTION_KEY || 'a-very-secure-32-char-dev-encryption-key';
const algorithm = 'aes-256-cbc';

const encrypt = (text) => {
  if (!text) {
    console.error('Encryption error: Input text is undefined or empty');
    return null;
  }
  
  try {
    console.log(`Encrypting text of length: ${text.length}`);
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(encryptionKey.padEnd(32).slice(0, 32)); // Ensure key is exactly 32 bytes
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const result = iv.toString('hex') + ':' + encrypted.toString('hex');
    console.log(`Encryption successful, result length: ${result.length}`);
    return result;
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
};

const decrypt = (text) => {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const key = Buffer.from(encryptionKey.padEnd(32).slice(0, 32)); // Ensure key is exactly 32 bytes
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

module.exports = { encrypt, decrypt };