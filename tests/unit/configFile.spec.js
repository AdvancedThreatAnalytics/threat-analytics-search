const _ = require("lodash");

import LocalStore from "../../src/js/shared/local_store";
import { StoreKey } from "../../src/js/shared/constants";

require("./util");
const ConfigFile = require("../../src/js/shared/config_file").default;
const defaultSettings = require("../resources/defaultSettings.json");
const encryptedSettings = require("../resources/encryptedSettings.json");

const parseJSONFile = jest.spyOn(ConfigFile, "parseJSONFile");
const updateNow = jest.spyOn(ConfigFile, "updateNow");

describe("configFile.js", () => {
  beforeEach(async () => {
    await ConfigFile.sanitizeSettings();

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
      await ConfigFile.sanitizeSpecialProviders();
      await ConfigFile.parseJSONFile(defaultSettings, true);
      const result = await ConfigFile.generateJSONFile();
      expect(result).toStrictEqual(_.omit(defaultSettings, "update"));
    });

    it("generateJSONFile result should be equal to changed configuration file", async () => {
      await LocalStore.clear();
      await ConfigFile.sanitizeSpecialProviders();
      await ConfigFile.parseJSONFile(defaultSettings, true);

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

      const changedSettings = _.cloneDeep(_.omit(defaultSettings, "update"));
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
      const result = await ConfigFile.generateJSONFile();
      expect(result).toStrictEqual(changedSettings);
    });
  });

  describe("sanitizeSettings function", () => {
    it("Settings and groups should be initialized with default values if some fields are missing", async () => {
      // Initialize settings sample with some missings fields
      const sampleConfig = {
        resultsInBackgroundTab: true,
        enableAdjacentTabs: true,
        openGroupsInNewWindow: true,
        enableOptionsMenuItem: true,

        mergeGroups: false,
        mergeSearchProviders: "merge",
        mergeCBC: { config: false, queries: "merge" },
        mergeNWI: { config: false, queries: "merge" },
        mergeRSA: { config: false, queries: "merge" },
      };

      // Set sample to chrome's storage
      await LocalStore.setOne(StoreKey.SETTINGS, sampleConfig);

      // Sanitize settings
      await ConfigFile.sanitizeSettings();

      // Get default settings and groups
      const defaultConfig = ConfigFile.parseBasicSettings(
        defaultSettings.config
      );
      defaultConfig.providersGroups = ConfigFile.parseGroups(
        defaultSettings.groups
      );

      // Check if missing fields are initialized with default values
      const settings = await LocalStore.getOne(StoreKey.SETTINGS);
      const expectedSettings = _.assign(defaultConfig, sampleConfig);

      expect(settings).toEqual(expectedSettings);
    });

    it("Settings should not be modified if values are valid", async () => {
      // Initialize settings with valid sample
      const sampleConfig = {
        configurationURL: "https://criticalstart.com",
        useGroups: true,
        configEncrypted: false,
        configEncryptionKey: "",
        autoUpdateConfig: false,

        resultsInBackgroundTab: true,
        enableAdjacentTabs: true,
        openGroupsInNewWindow: true,
        enableOptionsMenuItem: true,

        mergeGroups: false,
        mergeSearchProviders: "merge",
        mergeCBC: { config: false, queries: "merge" },
        mergeNWI: { config: false, queries: "merge" },
        mergeRSA: { config: false, queries: "merge" },

        providersGroups: [],
      };

      // Set sample to chrome's storage
      await LocalStore.setOne(StoreKey.SETTINGS, sampleConfig);

      // Sanitize settings
      await ConfigFile.sanitizeSettings();

      // Check if settings are not altered
      const settings = await LocalStore.getOne(StoreKey.SETTINGS);

      expect(settings).toEqual(sampleConfig);
    });

    it("Search providers should be initialized with default values if not defined", async () => {
      // Set empty search providers to chrome's storage
      await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, []);

      // Sanitize settings
      await ConfigFile.sanitizeSettings();

      // Check if search providers are initialized with default values
      const providers = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
      const expectedProviders = ConfigFile.parseProviders(
        defaultSettings.searchproviders
      );

      expect(providers).toEqual(expectedProviders);
    });

    it("Special providers should be initialized with default values if not defined", async () => {
      const specialProviders = [
        { storeKey: StoreKey.CARBON_BLACK, fileKey: "CBC" },
        { storeKey: StoreKey.NET_WITNESS, fileKey: "NWI" },
        { storeKey: StoreKey.RSA_SECURITY, fileKey: "RSA" },
      ];

      // Set invalid special providers to chrome's storage
      for (const provider of specialProviders) {
        await LocalStore.setOne(provider.storeKey, {
          config: null,
          queries: null,
        });
      }

      // Sanitize settings
      await ConfigFile.sanitizeSettings();

      // Check if special providers' config and queries are initialized with default values
      for (const provider of specialProviders) {
        const data = await LocalStore.getOne(provider.storeKey);
        const expectedData = {
          config: _.get(defaultSettings, `${provider.fileKey}.Config`, {}),
          queries: ConfigFile.parseQueries(
            _.get(defaultSettings, `${provider.fileKey}.Queries`, [])
          ),
        };

        expect(data).toEqual(expectedData);
      }
    });
  });
});
