const { customAlphabet } = require('nanoid');

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 4);

function generateLicenseKey(tier = 'VIP') {
  // Format: KIRA-XXXX-XXXX-XXXX
  return `KIRA-${nanoid()}-${nanoid()}-${nanoid()}`;
}

function validateLicenseKeyFormat(key) {
  const pattern = /^KIRA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return pattern.test(key);
}

module.exports = {
  generateLicenseKey,
  validateLicenseKeyFormat
};
