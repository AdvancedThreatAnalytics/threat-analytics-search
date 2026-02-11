import aesjs from "aes-js";
import md5 from "md5";
import crypto from "crypto";

export function decryptAES(data, key) {
  // Decode the ciphertext and remove the salt part.
  data = Array.from(atob(data), (c) => c.charCodeAt(0));

  const salt = data.slice(8, 16);
  const s2a = Array.from(unescape(encodeURIComponent(key)), (c) =>
    c.charCodeAt(0)
  );
  const pbe = openSSLKey(s2a, salt);

  data = data.slice(16, data.length);

  // Decrypt the ciphertext using aesjs.
  const aesCbc = new aesjs.ModeOfOperation.cbc(pbe.key, pbe.iv);
  const decryptedBytes = aesCbc.decrypt(data);

  // Remove pre added paddings and parse from byte to utf8.
  return aesjs.utils.utf8.fromBytes(aesjs.padding.pkcs7.strip(decryptedBytes));
}

export function encryptAES(data, password, salt) {
  if (!salt) {
    salt = randArr(8);
  }
  const s2a = Array.from(unescape(encodeURIComponent(password)), (c) =>
    c.charCodeAt(0)
  );
  const pbe = openSSLKey(s2a, salt);

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
 * This function derives a key and IV from the given password and salt.
 * It uses a PBKDF2-based key derivation with sufficient computational effort.
 */
export function openSSLKey(passwordArr, saltArr) {
  // Convert password and salt byte arrays into Buffers for pbkdf2Sync.
  const passwordBuffer = Buffer.from(passwordArr);
  const saltBuffer = Buffer.from(saltArr);

  // Derive 48 bytes (32 for key, 16 for IV) using PBKDF2 with SHA-256.
  // The iteration count should be high enough to make brute-force attacks expensive.
  const iterations = 100000;
  const keyLength = 48;
  const derived = crypto.pbkdf2Sync(passwordBuffer, saltBuffer, iterations, keyLength, "sha256");

  const derivedArr = Array.from(derived);

  return {
    key: derivedArr.slice(0, 32),
    iv: derivedArr.slice(32, 48),
  };
}

export default {
  decryptAES,
  encryptAES,
  openSSLKey,
};
