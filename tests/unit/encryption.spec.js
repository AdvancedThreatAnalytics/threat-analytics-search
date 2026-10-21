require("./util");

const { decryptAES, encryptAES } = require("../../src/js/shared/encryption");
const defaultSettings = require("../resources/defaultSettings.json");
const encryptedSettings = require("../resources/encryptedSettings.json");

const PASSWORD = "password";
const SALT = [83, 97, 108, 116, 101, 100, 95, 95];

describe("Encryption", () => {
  it("Test encryptAES function", async () => {
    const encryptedText = await encryptAES(
      JSON.stringify(defaultSettings),
      PASSWORD,
      SALT
    );
    expect(encryptedText).toEqual(encryptedSettings.encryptedData);
  });

  it("Test decryptAES function", async () => {
    const decryptedText = await decryptAES(encryptedSettings.encryptedData, PASSWORD);
    expect(JSON.parse(decryptedText)).toStrictEqual(defaultSettings);
  });
});
