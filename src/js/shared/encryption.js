import aesjs from "aes-js";
import md5 from "md5";

export async function decryptAES(data, key) {
  // Decode the ciphertext and remove the salt part.
  data = Array.from(atob(data), (c) => c.charCodeAt(0));

  const salt = data.slice(8, 16);
  const s2a = Array.from(unescape(encodeURIComponent(key)), (c) =>
    c.charCodeAt(0)
  );

  data = data.slice(16, data.length);

  // Try PBKDF2-based key derivation first (new secure format).
  try {
    const pbe = await openSSLKey(s2a, salt);
    const aesCbc = new aesjs.ModeOfOperation.cbc(pbe.key, pbe.iv);
    const decryptedBytes = aesCbc.decrypt(data);

    // Remove pre added paddings and parse from byte to utf8.
    return aesjs.utils.utf8.fromBytes(aesjs.padding.pkcs7.strip(decryptedBytes));
  } catch (_) {
    // Fall back to legacy MD5-based key derivation for backward compatibility
    // with data encrypted before the PBKDF2 upgrade.
    const pbe = openSSLKeyLegacy(s2a, salt);
    const aesCbc = new aesjs.ModeOfOperation.cbc(pbe.key, pbe.iv);
    const decryptedBytes = aesCbc.decrypt(data);

    // Remove pre added paddings and parse from byte to utf8.
    return aesjs.utils.utf8.fromBytes(aesjs.padding.pkcs7.strip(decryptedBytes));
  }
}

export async function encryptAES(data, password, salt) {
  if (!salt) {
    salt = randArr(8);
  }
  const s2a = Array.from(unescape(encodeURIComponent(password)), (c) =>
    c.charCodeAt(0)
  );
  const pbe = await openSSLKey(s2a, salt);

  // Spells out 'Salted__'
  let saltBlock = [83, 97, 108, 116, 101, 100, 95, 95].concat(salt);

  // Convert string to byte and add padding to be multiple of 16 bytes
  data = new TextEncoder().encode(data);
  data = aesjs.padding.pkcs7.pad(data);

  // Encrypt the cyphertext using aesjs.
  const aesCbc = new aesjs.ModeOfOperation.cbc(pbe.key, pbe.iv);
  let encryptedBytes = aesCbc.encrypt(data);

  // Prepend salt part.
  encryptedBytes = saltBlock.concat(Array.from(encryptedBytes));

  // Encode encrypted bytes and return it.
  const uint8Array = new Uint8Array(encryptedBytes);
  return btoa(String.fromCharCode.apply(null, uint8Array));
}

export function randArr(num) {
  let result = [],
    i;
  for (i = 0; i < num; i++) {
    result = result.concat(Math.floor(Math.random() * 256));
  }
  return result;
}

/**
 * Legacy key derivation function using MD5-based OpenSSL/GibberishAes derivation.
 * Kept for backward compatibility to decrypt data encrypted before the PBKDF2 upgrade.
 * @deprecated Use openSSLKey for new encryptions.
 */
export function openSSLKeyLegacy(passwordArr, saltArr) {
  const rounds = 3;
  const data00 = passwordArr.concat(saltArr);

  let md5_hash = [];
  let result = [];

  md5_hash[0] = aesjs.utils.hex.toBytes(md5(data00));
  result = md5_hash[0];

  for (let i = 1; i < rounds; i++) {
    md5_hash[i] = aesjs.utils.hex.toBytes(md5(md5_hash[i - 1].concat(data00)));
    result = result.concat(md5_hash[i]);
  }

  return {
    key: result.slice(0, 32),
    iv: result.slice(32, 48),
  };
}

/**
 * Derives a key and IV from the given password and salt using PBKDF2 (SHA-256)
 * via the Web Crypto API. Works in both browser (Chrome extension) and Node.js
 * environments without requiring native Node.js modules.
 *
 * Uses 100,000 iterations to provide sufficient computational effort against
 * brute-force attacks (per OWASP recommendations).
 */
export async function openSSLKey(passwordArr, saltArr) {
  const passwordBuffer = new Uint8Array(passwordArr);
  const saltBuffer = new Uint8Array(saltArr);

  const keyMaterial = await globalThis.crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBuffer,
      iterations: 100000,
    },
    keyMaterial,
    48 * 8 // 48 bytes = 32 (key) + 16 (IV)
  );

  const derivedArr = Array.from(new Uint8Array(derivedBits));

  return {
    key: derivedArr.slice(0, 32),
    iv: derivedArr.slice(32, 48),
  };
}

export default {
  decryptAES,
  encryptAES,
  openSSLKey,
  openSSLKeyLegacy,
};
