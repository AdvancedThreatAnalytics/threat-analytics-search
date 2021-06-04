import aesjs from "aes-js";
import md5 from "md5";

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

/**
 * This function is needed to provide backward compatibility and calculate
 * the key and iv in the same way as GibberishAes.
 */
export function openSSLKey(passwordArr, saltArr) {
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

export default {
  openSSLKey,
};
