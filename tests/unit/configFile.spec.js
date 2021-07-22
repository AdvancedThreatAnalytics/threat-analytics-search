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
      const result = await ConfigFile.default.generateJSONFile();
      expect(result).toStrictEqual(changedSettings);
    });
  });

  describe("parseBasicSettings function", () => {
    it("data should be parsed correctly", async () => {
      await LocalStore.clear();
      const expectedParsedData = {
        configurationURL:
          "https://raw.githubusercontent.com/AdvancedThreatAnalytics/threat-analytics-search/main/settings.json",
        useGroups: true,
        configEncrypted: false,
        configEncryptionKey: "",
        autoUpdateConfig: false,
      };
      const result = await ConfigFile.default.parseBasicSettings(
        defaultSettings.config
      );

      expect(result).toEqual(expect.objectContaining(expectedParsedData));
      expect(result.mergeGroups).toEqual(result.useGroups);
    });
  });

  describe("parseGroups function", () => {
    it("only array of length 3 are parsed, result should be an array of object with first two being enabled", async () => {
      const groups = [
        ["1", "IP Lookup"],
        ["2", "Domain"],
        ["3", "Hash"],
      ];
      const expectedResult = [
        { name: "IP Lookup", enabled: true },
        { name: "Domain", enabled: true },
        { name: "Hash", enabled: false },
      ];
      var result = await ConfigFile.default.parseGroups(groups.slice(0, 1));
      expect(result).toHaveLength(0);

      result = await ConfigFile.default.parseGroups(groups);
      expect(result).toHaveLength(3);
      expect(result).toStrictEqual(expectedResult);
    });
  });

  describe("updateSpecialProvider function", () => {
    it("configuration is overridden only if the corresponding flag is enabled", async () => {
      const newRSA = _.cloneDeep(defaultSettings.RSA);
      newRSA.Config.RSAConfigEnable = true;

      // Configuration shouldn't be changed if flag is false.
      await ConfigFile.default.updateSpecialProvider(
        StoreKey.RSA_SECURITY,
        newRSA,
        "mergeRSA"
      );
      var result = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      expect(result.config.RSAConfigEnable).toEqual(
        defaultSettings.RSA.Config.RSAConfigEnable
      );
    });

    it("queries are merged by default and duplicate values aren't added", async () => {
      var newRSA = _.cloneDeep(defaultSettings.RSA);
      newRSA.Queries = newRSA.Queries.concat([
        [-1, "Search Destination IP", "ip.dst=TESTSEARCH", true],
        [-1, "New Search Destination IP", "new_ip.dst=TESTSEARCH", true],
      ]);

      // Queries should be merged by default and duplicate values shouldn't be added.
      await ConfigFile.default.updateSpecialProvider(
        StoreKey.RSA_SECURITY,
        newRSA,
        "mergeRSA"
      );
      var result = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      var expectedResult = _.cloneDeep(defaultSettings.RSA);
      expectedResult.Queries.push([
        -1,
        "New Search Destination IP",
        "new_ip.dst=TESTSEARCH",
        true,
      ]);
      expectedResult = ConfigFile.default.parseQueries(expectedResult.Queries);
      expect(result.queries).toEqual(expectedResult);
    });

    it("queries are overridden or ignored depending on corresponding flag", async () => {
      var newRSA = _.cloneDeep(defaultSettings.RSA);
      newRSA.Queries = [
        [-1, "Search Destination IP", "ip.dst=TESTSEARCH", true],
        [-1, "New Search Destination IP", "new_ip.dst=TESTSEARCH", true],
      ];

      // Should override queries if flag is override.
      var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      settings.mergeRSA.queries = "override";
      await LocalStore.setOne(StoreKey.SETTINGS, settings);
      await ConfigFile.default.updateSpecialProvider(
        StoreKey.RSA_SECURITY,
        newRSA,
        "mergeRSA"
      );
      var result = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      var expectedResult = ConfigFile.default.parseQueries([
        [-1, "Search Destination IP", "ip.dst=TESTSEARCH", true],
        [-1, "New Search Destination IP", "new_ip.dst=TESTSEARCH", true],
      ]);
      expect(result.queries).toEqual(expectedResult);

      // Should ignore queries if flag is ignore.
      newRSA.Queries = [
        [-1, "Search Hostname", "alias.host='TESTSEARCH'", true],
      ];
      settings.mergeRSA.queries = "ignore";
      await LocalStore.setOne(StoreKey.SETTINGS, settings);
      await ConfigFile.default.updateSpecialProvider(
        StoreKey.RSA_SECURITY,
        newRSA,
        "mergeRSA"
      );
      result = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      expect(result.queries).toEqual(expectedResult);
    });
  });

  describe("parseJSONFile function", () => {
    it("basic settings should be overridden if the corresponding flag is enabled", async () => {
      await LocalStore.clear();
      const expectedParsedData = {
        configurationURL:
          "https://raw.githubusercontent.com/AdvancedThreatAnalytics/threat-analytics-search/main/settings.json",
        useGroups: true,
        configEncrypted: false,
        configEncryptionKey: "",
        autoUpdateConfig: false,
      };

      // Shouldn't override if the flag is false.
      await ConfigFile.default.parseJSONFile(defaultSettings, false);
      var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      expect(settings).toEqual({});

      // Should override if the flag is true.
      await ConfigFile.default.parseJSONFile(defaultSettings, true);
      settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      expect(settings).toEqual(expect.objectContaining(expectedParsedData));
    });

    it("groups name should be updated only if the mergeGroups is true", async () => {
      var newData = _.cloneDeep(defaultSettings);
      var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      const defaultProvidersGroup = [
        { name: "IP Lookup", enabled: true },
        { name: "Domain", enabled: true },
        { name: "Hash", enabled: false },
      ];

      // If mergeGroups is false shouldn't override.
      settings.mergeGroups = false;
      await LocalStore.setOne(StoreKey.SETTINGS, settings);
      await ConfigFile.default.parseJSONFile(newData);
      settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      expect(settings.providersGroups).toEqual(defaultProvidersGroup);

      // If mergeGroups is false should override providersGroups.
      defaultProvidersGroup[2].name = "New Hash";
      newData.groups[2][1] = "New Hash";
      settings.mergeGroups = true;
      await LocalStore.setOne(StoreKey.SETTINGS, settings);
      await ConfigFile.default.parseJSONFile(newData);
      settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      expect(settings.providersGroups).toEqual(defaultProvidersGroup);
    });

    it("search providers are merged, overridden and ignored depending on corresponding flag", async () => {
      var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      var serachProviders = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);

      // By default flag should be merge and duplicate values shouldn't be added.
      var newData = {
        searchproviders: [
          [
            -1,
            "Google new",
            "http://www.google2.com/search?q=TESTSEARCH",
            true,
            true,
            3,
            false,
            "",
            false,
            "",
          ],
          [
            -1,
            "D - AlienVault OTX Domain",
            "https://otx.alienvault.com/indicator/domain/TESTSEARCH",
            true,
            true,
            2,
            false,
            "",
            false,
            "",
          ],
        ],
      };

      await ConfigFile.default.parseJSONFile(newData);

      serachProviders.push({
        menuIndex: -1,
        label: "Google new",
        link: "https://www.google2.com/search?q=TESTSEARCH",
        enabled: true,
        fromConfig: true,
        group: 3,
        postEnabled: false,
        postValue: "",
        proxyEnabled: false,
        proxyUrl: "",
      });
      var newSerachProviders = await LocalStore.getOne(
        StoreKey.SEARCH_PROVIDERS
      );
      expect(newSerachProviders).toEqual(serachProviders);

      // Override flag should change searchProviders to new values.
      settings.mergeSearchProviders = "override";
      await LocalStore.setOne(StoreKey.SETTINGS, settings);
      await ConfigFile.default.parseJSONFile(newData);
      newSerachProviders = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
      expect(newSerachProviders).toEqual(
        ConfigFile.default.parseProviders(newData.searchproviders)
      );
    });
  });
});
