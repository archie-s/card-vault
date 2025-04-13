const vault = require('../encryption/vault.js');
const Card = require('../models/card.js');
const { validateCardNumber, detectCardType } = require('../utils/validate.js');

class CardService {
    async storeCard(userId, cardData) {
        console.log('Storing card in service:', { userId, cardData });
        
        let expiryMonth, expiryYear;
        
        // Handle expiry date format
        if (cardData.expiry) {
            // Split MM/YY format
            [expiryMonth, expiryYear] = cardData.expiry.split('/');
            // Ensure month and year are two digits
            expiryMonth = expiryMonth.padStart(2, '0');
            expiryYear = expiryYear.padStart(2, '0');
        } else {
            // If already split (shouldn't happen in current implementation)
            expiryMonth = cardData.expiryMonth.padStart(2, '0');
            expiryYear = cardData.expiryYear.padStart(2, '0');
        }
        
        // Validate the card
        if (!validateCardNumber(cardData.cardNumber)) {
            console.log('Invalid card number');
            throw new Error('Invalid card number');
        }

        // Check if card already exists for this user
        const lastFour = cardData.cardNumber.slice(-4);
        console.log('Checking for existing card:', { userId, lastFour, expiryMonth, expiryYear });
        
        const existingCard = await Card.findOne({
            where: {
                userId,
                lastFour,
                expiryMonth,
                expiryYear,
                isActive: true
            }
        });

        if (existingCard) {
            console.log('Found existing card:', existingCard.token);
            return { token: existingCard.token, lastFour: existingCard.lastFour };
        }

        // Tokenize and encrypt the card
        const { token, encryptedCard } = vault.tokenize(cardData.cardNumber);
        console.log('Card tokenized:', token);

        // Detect card type
        const cardType = detectCardType(cardData.cardNumber);
        console.log('Detected card type:', cardType);

        // Create a new card record
        console.log('Creating new card record');
        const card = await Card.create({
            userId,
            token,
            encryptedData: encryptedCard.encryptedData,
            iv: encryptedCard.iv,
            authTag: encryptedCard.authTag,
            lastFour,
            expiryMonth,
            expiryYear,
            cardType
        });
        console.log('Card created successfully:', card.token);

        return { token: card.token, lastFour };
    }

    async retrieveCard(userId, token) {
        // Find the card
        const card = await Card.findOne({
            where: { userId, token, isActive: true }
        });

        if (!card) {
            throw new Error('Card not found');
        }

        // Decrypt the card data
        const cardNumber = vault.detokenize({
            encryptedData: card.encryptedData,
            iv: card.iv,
            authTag: card.authTag
        });

        return {
            cardNumber, // Full card number after decryption
            lastFour: card.lastFour,
            expiryMonth: card.expiryMonth,
            expiryYear: card.expiryYear,
            cardType: card.cardType
        };
    }

    async listCards(userId) {
        // Get all cards for a user, but only the metadata (never expose sensitive card data)
        const cards = await Card.findAll({
            where: { userId, isActive: true },
            attributes: ['token', 'lastFour', 'expiryMonth', 'expiryYear', 'cardType', 'createdAt']
        });

        return cards.map(card => ({
            token: card.token,
            lastFour: card.lastFour,
            expiryMonth: card.expiryMonth,
            expiryYear: card.expiryYear,
            cardType: card.cardType,
            createdAt: card.createdAt
        }));
    }

    async removeCard(userId, token) {
        // Soft delete by setting isActive to false
        const result = await Card.update(
            { isActive: false },
            { where: { userId, token } }
        );

        if (result[0] === 0) {
            throw new Error('Card not found');
        }

        return { success: true };
    }
}

module.exports = new CardService();
