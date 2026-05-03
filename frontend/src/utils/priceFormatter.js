/**
 * Price formatting utility for consistent USD currency display
 * @param {number} price - The price amount to format
 * @returns {string} Formatted price string with USD symbol and 2 decimals
 */
export const formatPrice = (price) => {
  if (price === null || price === undefined) {
    return '$0.00';
  }
  return `$${parseFloat(price).toFixed(2)}`;
};

/**
 * Format price for display in alerts and messages
 * @param {number} price - The price amount
 * @returns {string} Formatted price string
 */
export const formatPriceAlert = (price) => formatPrice(price);

/**
 * Format subtotal for multiple items
 * @param {number} unitPrice - Price per unit
 * @param {number} quantity - Quantity of items
 * @returns {string} Formatted subtotal
 */
export const formatSubtotal = (unitPrice, quantity) => {
  return formatPrice(unitPrice * quantity);
};

export default formatPrice;
