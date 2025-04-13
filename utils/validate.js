const Joi = require('joi');

// Luhn algorithm for card number validation
const validateCardNumber = (cardNumber) => {
  if (!cardNumber || typeof cardNumber !== 'string') {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  // Loop through card number digits starting from the rightmost
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber.charAt(i));

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9; // Subtract 9 if the result is greater than 9
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return (sum % 10) === 0;
};

// Detect card type (Visa, MasterCard, etc.)
const detectCardType = (cardNumber) => {
  const patterns = {
    visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
    mastercard: /^5[1-5][0-9]{14}$/,
    amex: /^3[47][0-9]{13}$/,
    discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(cardNumber)) {
      return type;
    }
  }

  return 'other';
};

// Expiry date check (ensure card is not expired)
const isCardExpired = (expiryMonth, expiryYear) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // Months are zero-based

  // Check if the card has expired
  if (parseInt(expiryYear) < currentYear) {
    return true; // Expired
  } else if (parseInt(expiryYear) === currentYear && parseInt(expiryMonth) < currentMonth) {
    return true; // Expired
  }

  return false; // Not expired
};

// Joi schema for validating card information, including Luhn and expiry checks
const cardSchema = Joi.object({
  cardNumber: Joi.string()
    .pattern(/^[0-9]{13,19}$/)
    .required()
    .custom((value, helpers) => {
      if (!validateCardNumber(value)) {
        return helpers.error('any.invalid', { message: 'Invalid card number' });
      }
      return value;
    }),
  cardholderName: Joi.string().min(2).max(100).required(),
  expiryMonth: Joi.string()
    .pattern(/^(0[1-9]|1[0-2])$/)
    .required(),
  expiryYear: Joi.string()
    .pattern(/^[0-9]{2,4}$/) // Allow both 2-digit and 4-digit years
    .required()
    .custom((value, helpers) => {
      const expiryMonth = parseInt(helpers.state.ancestors[0].expiryMonth);
      const expiryYear = parseInt(value);

      if (isCardExpired(expiryMonth, expiryYear)) {
        return helpers.error('any.invalid', { message: 'Card has expired' });
      }
      return value;
    }),
  cvv: Joi.string().pattern(/^[0-9]{3,4}$/).required()
});

module.exports = {
  validateCardNumber,
  detectCardType,
  validateCard: (card) => cardSchema.validate(card)
};
