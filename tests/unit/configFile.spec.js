import LocalStore from "../../src/js/shared/local_store";
import { StoreKey } from "../../src/js/shared/constants";

require("./util");
const _ = require("lodash");
const ConfigFile = require("../../src/js/shared/config_file");
const defaultSettings = require("../resources/defaultSettings.json");
const encryptedSettings = require("../resources/encryptedSettings.json");

const generateJSONFile = jest.spyOn(ConfigFile.default, "generateJSONFile");
const parseJSONFile = jest.spyOn(ConfigFile.default, "parseJSONFile");
const sanitizeSettings = jest.spyOn(ConfigFile.default, "sanitizeSettings");
const sanitizeSpecialProviders = jest.spyOn(
  ConfigFile.default,
  "sanitizeSpecialProviders"
);
const updateNow = jest.spyOn(ConfigFile.default, "updateNow");

describe("configFile.js", () => {
  beforeEach(async () => {
    await sanitizeSettings();
  });
  describe("updateNow function", () => {
    it("parseJSONFile should be called with the file content and return true", async () => {
      await updateNow();
      expect(parseJSONFile).toHaveBeenCalled();
      expect(parseJSONFile).toHaveBeenCalledWith(defaultSettings, false);
      expect(updateNow).toBeTruthy();
    });

    it("parseJSONFile should be called with decrypted file content and return true", async () => {
      var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      settings.configEncrypted = true;
      settings.configEncryptionKey = "password";
      await LocalStore.setOne(StoreKey.SETTINGS, settings);
      fetch.mockResponseOnce(encryptedSettings.encryptedData);

      const result = await updateNow();
      expect(parseJSONFile).toHaveBeenCalled();
      expect(parseJSONFile).toHaveBeenCalledWith(defaultSettings, false);
      expect(result).toBe(true);
    });

    it("errorMsg shouldn't be null if fetch throws error", async () => {
      fetch.mockAbortOnce();

      const result = await updateNow();
      var lastConfigData = await LocalStore.getOne(StoreKey.LAST_CONFIG_DATA);
      expect(lastConfigData.errorMsg).not.toBe(null);
      expect(result).toBe(false);
    });

    it("errorMsg shouldn't be null if fetch status is 400", async () => {
      fetch.mockResponseOnce(JSON.stringify(defaultSettings), { status: 400 });

      const result = await updateNow();
      var lastConfigData = await LocalStore.getOne(StoreKey.LAST_CONFIG_DATA);
      expect(lastConfigData.errorMsg).not.toBe(null);
      expect(result).toBe(false);
    });

    it("errorMsg shouldn't be null if file is encrypted but encryption is disabled", async () => {
      var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      settings.configEncrypted = false;
      await LocalStore.setOne(StoreKey.SETTINGS, settings);
      fetch.mockResponseOnce(encryptedSettings.encryptedData);

      const result = await updateNow();
      var lastConfigData = await LocalStore.getOne(StoreKey.LAST_CONFIG_DATA);
      expect(lastConfigData.errorMsg).not.toBe(null);
      expect(result).toBe(false);
    });

    it("errorMsg shouldn't be null if file is encrypted but encryption key is wrong", async () => {
      var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      settings.configEncrypted = true;
      settings.configEncryptionKey = "wrong password";
      await LocalStore.setOne(StoreKey.SETTINGS, settings);
      fetch.mockResponseOnce(encryptedSettings.encryptedData);

      const result = await updateNow();
      var lastConfigData = await LocalStore.getOne(StoreKey.LAST_CONFIG_DATA);
      expect(lastConfigData.errorMsg).not.toBe(null);
      expect(result).toBe(false);
    });
  });

  describe("generateJSONFile function", () => {
    it("generateJSONFile result should be equal to simple configuration file", async () => {
      await LocalStore.clear();
      await sanitizeSpecialProviders();
      await parseJSONFile(defaultSettings, true);
      const result = await generateJSONFile();
      expect(result).toStrictEqual(_.omit(defaultSettings, "update"));
    });

    it("generateJSONFile result should be equal to changed configuration file", async () => {
      await LocalStore.clear();
      await sanitizeSpecialProviders();
      await parseJSONFile(defaultSettings, true);

      // change data in local storage.
      var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      settings.configEncrypted = true;
      await LocalStore.setOne(StoreKey.SETTINGS, settings);

      const changedSettings = _.omit(defaultSettings, "update");
      changedSettings.config[0][2] = true;
      const result = await generateJSONFile();
      expect(result).toStrictEqual(changedSettings);
    });
  });
});
