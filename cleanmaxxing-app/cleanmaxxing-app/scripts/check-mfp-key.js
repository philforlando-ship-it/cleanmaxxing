// Diagnostic only — does not print the secret. Reports shape so we
// can tell what's mangled. Delete this file after MFP_ENCRYPTION_KEY
// is verified.
require('dotenv').config({ path: '.env.local' });
const k = process.env.MFP_ENCRYPTION_KEY || '';
const validB64 = k.replace(/[^A-Za-z0-9+/=]/g, '').length;
const padding = (k.match(/=/g) || []).length;
const decoded = Buffer.from(k, 'base64').length;
const firstCharCode = k.length ? k.charCodeAt(0) : null;
const lastCharCode = k.length ? k.charCodeAt(k.length - 1) : null;
const charCodes = [...k].map((c) => c.charCodeAt(0));
const oddChars = charCodes.filter(
  (code) => !((code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 43 || code === 47 || code === 61),
);
console.log({
  rawLength: k.length,
  validBase64Chars: validB64,
  paddingCount: padding,
  decodedBytes: decoded,
  firstCharCode,
  lastCharCode,
  oddCharCodes: oddChars,
  oddCharCount: oddChars.length,
});
