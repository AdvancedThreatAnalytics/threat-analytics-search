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
      const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
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
      const lastConfigData = await LocalStore.getOne(StoreKey.LAST_CONFIG_DATA);
      expect(lastConfigData.errorMsg).not.toBe(null);
      expect(result).toBe(false);
    });

    it("errorMsg shouldn't be null if fetch status is 400", async () => {
      fetch.mockResponseOnce(JSON.stringify(defaultSettings), { status: 400 });

      const result = await updateNow();
      const lastConfigData = await LocalStore.getOne(StoreKey.LAST_CONFIG_DATA);
      expect(lastConfigData.errorMsg).not.toBe(null);
      expect(result).toBe(false);
    });

    it("errorMsg shouldn't be null if file is encrypted but encryption is disabled", async () => {
      const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      settings.configEncrypted = false;
      await LocalStore.setOne(StoreKey.SETTINGS, settings);
      fetch.mockResponseOnce(encryptedSettings.encryptedData);

      const result = await updateNow();
      const lastConfigData = await LocalStore.getOne(StoreKey.LAST_CONFIG_DATA);
      expect(lastConfigData.errorMsg).not.toBe(null);
      expect(result).toBe(false);
    });

    it("errorMsg shouldn't be null if file is encrypted but encryption key is wrong", async () => {
      const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      settings.configEncrypted = true;
      settings.configEncryptionKey = "wrong password";
      await LocalStore.setOne(StoreKey.SETTINGS, settings);
      fetch.mockResponseOnce(encryptedSettings.encryptedData);

      const result = await updateNow();
      const lastConfigData = await LocalStore.getOne(StoreKey.LAST_CONFIG_DATA);
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
      await ConfigFile.parseJSONFile(_.cloneDeep(defaultSettings), true);

      // Change data in local storage.
      const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      const providers =
        (await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS)) || {};
      const rsa = (await LocalStore.getOne(StoreKey.RSA_SECURITY)) || {};
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

  describe("parseBasicSettings function", () => {
    it("Data should be parsed correctly", async () => {
      await LocalStore.clear();
      const rawData = [
        [
          "https://wwww.some-domain.com/settings.json",
          "true",
          "false",
          "",
          "false",
        ],
      ];
      const expectedParsedData = {
        configurationURL: rawData[0][0],
        useGroups: true,
        configEncrypted: false,
        configEncryptionKey: "",
        autoUpdateConfig: false,
      };
      const result = await ConfigFile.parseBasicSettings(rawData);

      expect(result).toEqual(expect.objectContaining(expectedParsedData));
      expect(result.mergeGroups).toEqual(result.useGroups);
    });
  });

  describe("parseGroups function", () => {
    it("Array of length < 3 shouldn't be parsed", async () => {
      const result = await ConfigFile.parseGroups([
        ["1", "IP Lookup"],
        ["2", "Domain"],
      ]);
      expect(result).toHaveLength(0);
    });
    it("Array of length >= 3 is parsed and only first two items are enabled", async () => {
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

      const result = await ConfigFile.parseGroups(groups);
      expect(result).toHaveLength(3);
      expect(result).toStrictEqual(expectedResult);
    });
  });

  describe("updateSpecialProvider function", () => {
    it("Configuration is overridden only if the corresponding flag is enabled", async () => {
      const newRSA = _.cloneDeep(defaultSettings.RSA);
      newRSA.Config.RSAConfigEnable = true;
      newRSA.Config.RSAConfigPopup = true;
      newRSA.Config.RSAConfigPort = "test";
      newRSA.Config.RSAConfigDevId = "24";

      // Configuration shouldn't be changed if flag is false.
      await ConfigFile.updateSpecialProvider(
        StoreKey.RSA_SECURITY,
        newRSA,
        "mergeRSA"
      );
      let result = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      expect(result.config.RSAConfigEnable).toEqual(
        defaultSettings.RSA.Config.RSAConfigEnable
      );
      expect(result.config.RSAConfigPopup).toEqual(
        defaultSettings.RSA.Config.RSAConfigPopup
      );
      expect(result.config.RSAConfigPort).toEqual(
        defaultSettings.RSA.Config.RSAConfigPort
      );
      expect(result.config.RSAConfigDevId).toEqual(
        defaultSettings.RSA.Config.RSAConfigDevId
      );

      const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      settings.mergeRSA.config = true;
      await LocalStore.setOne(StoreKey.SETTINGS, settings);

      // Configuration should be changed if flag is true.
      await ConfigFile.updateSpecialProvider(
        StoreKey.RSA_SECURITY,
        newRSA,
        "mergeRSA"
      );
      result = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      expect(result.config.RSAConfigEnable).toEqual(
        newRSA.Config.RSAConfigEnable
      );
      expect(result.config.RSAConfigPopup).toEqual(
        newRSA.Config.RSAConfigPopup
      );
      expect(result.config.RSAConfigPort).toEqual(newRSA.Config.RSAConfigPort);
      expect(result.config.RSAConfigDevId).toEqual(
        newRSA.Config.RSAConfigDevId
      );
    });

    it("Configuration is overridden if overrideAll is true, regardless of the corresponding flag", async () => {
      const newRSA = _.cloneDeep(defaultSettings.RSA);

      // Reinitialize default values in case previous tests changed the stored data.
      let rsa = (await LocalStore.getOne(StoreKey.RSA_SECURITY)) || {};
      rsa.config = _.cloneDeep(newRSA.Config);
      await LocalStore.setOne(StoreKey.RSA_SECURITY, rsa);

      newRSA.Config.RSAConfigEnable = true;
      newRSA.Config.RSAConfigPopup = true;
      newRSA.Config.RSAConfigPort = "test";
      newRSA.Config.RSAConfigDevId = "24";

      const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      settings.mergeRSA.config = false;
      await LocalStore.setOne(StoreKey.SETTINGS, settings);

      // Configuration should be changed even if flag is false.
      await ConfigFile.updateSpecialProvider(
        StoreKey.RSA_SECURITY,
        newRSA,
        "mergeRSA",
        true
      );
      rsa = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      expect(rsa.config.RSAConfigEnable).toEqual(newRSA.Config.RSAConfigEnable);
      expect(rsa.config.RSAConfigPopup).toEqual(newRSA.Config.RSAConfigPopup);
      expect(rsa.config.RSAConfigPort).toEqual(newRSA.Config.RSAConfigPort);
      expect(rsa.config.RSAConfigDevId).toEqual(newRSA.Config.RSAConfigDevId);
    });

    it("Queries are merged by default and duplicate values aren't added", async () => {
      const newRSA = _.cloneDeep(defaultSettings.RSA);
      const newQuery = [
        -1,
        "New Search Destination IP",
        "new_ip.dst=TESTSEARCH",
        true,
      ];
      newRSA.Queries = newRSA.Queries.concat([newQuery]);

      // Queries should be merged by default and duplicate values shouldn't be added.
      await ConfigFile.updateSpecialProvider(
        StoreKey.RSA_SECURITY,
        newRSA,
        "mergeRSA"
      );
      const result = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      let expectedResult = _.cloneDeep(defaultSettings.RSA);
      expectedResult.Queries.push(newQuery);
      expectedResult = ConfigFile.parseQueries(expectedResult.Queries);
      expect(result.queries).toEqual(expectedResult);
    });

    it("Queries are overridden if flag is override", async () => {
      const newRSA = _.cloneDeep(defaultSettings.RSA);
      const newQuery = [
        -1,
        "New Search Destination IP",
        "new_ip.dst=TESTSEARCH",
        true,
      ];
      newRSA.Queries = [newQuery];

      // Should override queries if flag is override.
      const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      settings.mergeRSA.queries = "override";
      await LocalStore.setOne(StoreKey.SETTINGS, settings);
      await ConfigFile.updateSpecialProvider(
        StoreKey.RSA_SECURITY,
        newRSA,
        "mergeRSA"
      );
      const result = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      const expectedResult = ConfigFile.parseQueries([newQuery]);
      expect(result.queries).toEqual(expectedResult);
    });

    it("Queries are ignored if flag is ignore", async () => {
      const newRSA = _.cloneDeep(defaultSettings.RSA);
      const newQuery = [
        -1,
        "New Search Destination IP",
        "new_ip.dst=TESTSEARCH",
        true,
      ];
      const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      newRSA.Queries = [newQuery];
      settings.mergeRSA.queries = "ignore";
      await LocalStore.setOne(StoreKey.SETTINGS, settings);
      await ConfigFile.updateSpecialProvider(
        StoreKey.RSA_SECURITY,
        newRSA,
        "mergeRSA"
      );

      const result = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      const expectedResult = ConfigFile.parseQueries([newQuery]);
      expect(result.queries).toEqual(expectedResult);
    });

    it("Queries are overridden if overrideAll is true even if flag is not override", async () => {
      const newRSA = _.cloneDeep(defaultSettings.RSA);
      const newQuery = [
        -1,
        "New Search Destination IP",
        "new_ip.dst=TESTSEARCH",
        true,
      ];
      newRSA.Queries = [newQuery];

      // Reinitialize default values in case previous tests changed the stored data.
      const rsa = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      rsa.queries = ConfigFile.parseQueries(
        _.cloneDeep(defaultSettings.RSA.Queries)
      );
      await LocalStore.setOne(StoreKey.RSA_SECURITY, rsa);

      // Should override queries if overrideAll is true and even corresponding flag is not override.
      const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      settings.mergeRSA.queries = "merge";
      await LocalStore.setOne(StoreKey.SETTINGS, settings);
      await ConfigFile.updateSpecialProvider(
        StoreKey.RSA_SECURITY,
        newRSA,
        "mergeRSA",
        true
      );
      const result = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      const expectedResult = ConfigFile.parseQueries([newQuery]);
      expect(result.queries).toEqual(expectedResult);
    });
  });

  describe("parseJSONFile function", () => {
    it("Basic settings should be overridden if the corresponding flag is enabled", async () => {
      await LocalStore.clear();
      const expectedParsedData = ConfigFile.parseBasicSettings(
        defaultSettings.config
      );

      // Shouldn't override if the flag is false.
      await ConfigFile.parseJSONFile(defaultSettings, false);
      let settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      expect(settings).toEqual({});

      // Should override if the flag is true.
      await ConfigFile.parseJSONFile(defaultSettings, true);
      settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      expect(settings).toEqual(expect.objectContaining(expectedParsedData));
    });

    it("Groups named should be updated only if the mergeGroups is true", async () => {
      const newData = _.cloneDeep(defaultSettings);
      let settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      const defaultProvidersGroup = ConfigFile.parseGroups(
        defaultSettings.groups
      );

      // If mergeGroups is false shouldn't override.
      settings.mergeGroups = false;
      await LocalStore.setOne(StoreKey.SETTINGS, settings);
      await ConfigFile.parseJSONFile(newData);
      settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      expect(settings.providersGroups).toEqual(defaultProvidersGroup);

      // If mergeGroups is false should override providersGroups.
      defaultProvidersGroup[2].name = "New Hash";
      newData.groups[2][1] = "New Hash";
      settings.mergeGroups = true;
      await LocalStore.setOne(StoreKey.SETTINGS, settings);
      await ConfigFile.parseJSONFile(newData);
      settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      expect(settings.providersGroups).toEqual(defaultProvidersGroup);
    });

    it("Search providers are merged if flag is merge", async () => {
      const searchProviders = await LocalStore.getOne(
        StoreKey.SEARCH_PROVIDERS
      );

      // By default flag should be merge and duplicate values shouldn't be added.
      const newData = {
        searchproviders: _.cloneDeep(defaultSettings.searchproviders).splice(
          0,
          2
        ),
      };

      await ConfigFile.parseJSONFile(newData);

      searchProviders.push({
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
      const newSearchProviders = await LocalStore.getOne(
        StoreKey.SEARCH_PROVIDERS
      );
      expect(newSearchProviders).toEqual(searchProviders);
    });

    it("Search providers are overridden if flag is override", async () => {
      const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      settings.mergeSearchProviders = "override";
      await LocalStore.setOne(StoreKey.SETTINGS, settings);
      const newData = {
        searchproviders: _.cloneDeep(defaultSettings.searchproviders).splice(
          0,
          2
        ),
      };
      await ConfigFile.parseJSONFile(newData);
      const newSearchProviders = await LocalStore.getOne(
        StoreKey.SEARCH_PROVIDERS
      );
      expect(newSearchProviders).toEqual(
        ConfigFile.parseProviders(newData.searchproviders)
      );
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
