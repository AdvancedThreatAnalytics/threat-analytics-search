require("./util");
const { decryptAES, encryptAES } = require("../../src/js/shared/encryption");
const defaultSettings = require("../resources/defaultSettings.json");

describe("Encryption", () => {
  it("Test encryptAES and decryptAES functions", async () => {
    const encryptedText = encryptAES(
      JSON.stringify(defaultSettings),
      "password"
    );
    const decryptedText = decryptAES(encryptedText, "password");
    expect(JSON.parse(decryptedText)).toStrictEqual(defaultSettings);
  });
});
