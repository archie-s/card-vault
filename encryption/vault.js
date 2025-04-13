const crypto = require('crypto');
const config = require('../config/index.js');

class Vault {
    constructor() {
        // Ensure encryption key is provided
        if (!config.encryption.key) {
            throw new Error('Encryption key not found in environment variables');
        }

        // Ensure the key is 32 bytes (for AES-256)
        let key = Buffer.from(config.encryption.key, 'hex');

        // If key length is less than 32 bytes, pad it with zero bytes
        if (key.length < 32) {
            key = Buffer.concat([key, Buffer.alloc(32 - key.length)]);  // Pad with zeros if key is too short
        } else if (key.length > 32) {
            key = key.slice(0, 32);  // Truncate if key is too long
        }

        this.key = key;
    }

    // Encrypt method
    encrypt(text) {
        // Ensure IV length is correct (typically 12 bytes for AES-GCM)
        const iv = crypto.randomBytes(config.ivLength || 12); // Default to 12 bytes if ivLength is not set
        const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag().toString('hex');

        // Return the encrypted data with IV and auth tag
        return {
            iv: iv.toString('hex'),
            encryptedData: encrypted,
            authTag
        };
    }

    // Decrypt method
    decrypt(encryptedObj) {
        const iv = Buffer.from(encryptedObj.iv, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);

        // Set the authentication tag for AES-GCM decryption
        decipher.setAuthTag(Buffer.from(encryptedObj.authTag, 'hex'));

        let decrypted = decipher.update(encryptedObj.encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    // Tokenize the card number, returning a reference token
    tokenize(cardNumber) {
        // Hash the card to create a token
        const token = crypto
            .createHash('sha256')
            .update(cardNumber + config.encryption.key)
            .digest('hex');

        // Encrypt the actual card number
        const encryptedCard = this.encrypt(cardNumber);

        return { token, encryptedCard };
    }

    // For retrieving card data by token (would need to look up in database)
    detokenize(encryptedCardObj) {
        return this.decrypt(encryptedCardObj);
    }
}

module.exports = new Vault();
