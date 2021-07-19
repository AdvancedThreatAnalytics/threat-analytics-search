const _ = require("lodash");

import LocalStore from "../../src/js/shared/local_store";
import { StoreKey } from "../../src/js/shared/constants";

require("./util");
const ConfigFile = require("../../src/js/shared/config_file");
const defaultSettings = require("../resources/defaultSettings.json");
const encryptedSettings = require("../resources/encryptedSettings.json");

const parseJSONFile = jest.spyOn(ConfigFile.default, "parseJSONFile");
const updateNow = jest.spyOn(ConfigFile.default, "updateNow");

describe("configFile.js", () => {
  beforeEach(async () => {
    await ConfigFile.default.sanitizeSettings();

    // Disable console's errors (used on 'updatedNow').
    jest.spyOn(console, "error").mockImplementation(() => {});
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
      await ConfigFile.default.sanitizeSpecialProviders();
      await ConfigFile.default.parseJSONFile(defaultSettings, true);
      const result = await ConfigFile.default.generateJSONFile();
      expect(result).toStrictEqual(_.omit(defaultSettings, "update"));
    });

    it("generateJSONFile result should be equal to changed configuration file", async () => {
      await LocalStore.clear();
      await ConfigFile.default.sanitizeSpecialProviders();
      await ConfigFile.default.parseJSONFile(defaultSettings, true);

      // Change data in local storage.
      var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      var providers =
        (await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS)) || {};
      var rsa = (await LocalStore.getOne(StoreKey.RSA_SECURITY)) || {};
      settings.configEncrypted = true;
      settings.configEncryptionKey = "some password";
      settings.providersGroups[0].name = "changed group";
      providers.shift();
      providers[0].enabled = false;
      rsa.config.RSAConfigEnable = true;
      rsa.config = _.omit(rsa.config, "RSAConfigRange4");
      rsa.queries.shift();
      rsa.queries[0].label = "changed label";
      await LocalStore.setOne(StoreKey.SETTINGS, settings);
      await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, providers);
      await LocalStore.setOne(StoreKey.RSA_SECURITY, rsa);

      const changedSettings = _.omit(defaultSettings, "update");
      changedSettings.config[0][2] = true;
      changedSettings.config[0][3] = "some password";
      changedSettings.groups[0][1] = "changed group";
      changedSettings.searchproviders.shift();
      changedSettings.searchproviders[0][3] = false;
      changedSettings.RSA.Config.RSAConfigEnable = true;
      changedSettings.RSA.Config = _.omit(
        changedSettings.RSA.Config,
        "RSAConfigRange4"
      );
      changedSettings.RSA.Queries.shift();
      changedSettings.RSA.Queries[0][1] = "changed label";
      const result = await ConfigFile.default.generateJSONFile();
      expect(result).toStrictEqual(changedSettings);
    });
  });
});
