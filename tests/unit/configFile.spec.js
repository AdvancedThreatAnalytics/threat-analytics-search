const _ = require("lodash");

require("./util");
import LocalStore from "../../src/js/shared/local_store";
const ConfigFile = require("../../src/js/shared/config_file").default;
import { StoreKey } from "../../src/js/shared/constants";

const defaultSettings = require("../resources/defaultSettings.json");
const encryptedSettings = require("../resources/encryptedSettings.json");

const parseJSONFile = jest.spyOn(ConfigFile, "parseJSONFile");
const updateNow = jest.spyOn(ConfigFile, "updateNow");

describe("ConfigFile", () => {
  beforeEach(async () => {
    // Reset settings to default values.
    await LocalStore.clear();
    await ConfigFile.sanitizeSettings();

    // Disable console's errors (used on 'updatedNow').
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("updateNow()", () => {
    it("Plain text settings files should be parsed correctly", async () => {
      fetch.mockResponseOnce(JSON.stringify(defaultSettings));
      const result = await updateNow();

      expect(parseJSONFile).toHaveBeenCalled();
      expect(parseJSONFile).toHaveBeenCalledWith(defaultSettings, false);
      expect(result).toBeTruthy();
    });

    it("Encrypted settings files should be parsed correctly", async () => {
      const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      await LocalStore.setOne(StoreKey.SETTINGS, {
        ...settings,
        configEncrypted: true,
        configEncryptionKey: "password",
      });

      fetch.mockResponseOnce(encryptedSettings.encryptedData);
      const result = await updateNow();

      expect(parseJSONFile).toHaveBeenCalled();
      expect(parseJSONFile).toHaveBeenCalledWith(defaultSettings, false);
      expect(result).toBeTruthy();
    });

    it("Function should fail if fetch fails", async () => {
      fetch.mockAbortOnce();
      const result = await updateNow();

      const lastConfigData = await LocalStore.getOne(StoreKey.LAST_CONFIG_DATA);
      expect(lastConfigData.errorMsg).toBeDefined();
      expect(result).toBeFalsy();
    });

    it("Function should fail fetch status is 400", async () => {
      fetch.mockResponseOnce(JSON.stringify(defaultSettings), { status: 400 });
      const result = await updateNow();

      const lastConfigData = await LocalStore.getOne(StoreKey.LAST_CONFIG_DATA);
      expect(lastConfigData.errorMsg).toBeDefined();
      expect(result).toBeFalsy();
    });

    it("Function should fail if settings are encrypted but encryption is disabled", async () => {
      fetch.mockResponseOnce(encryptedSettings.encryptedData);
      const result = await updateNow();

      const lastConfigData = await LocalStore.getOne(StoreKey.LAST_CONFIG_DATA);
      expect(lastConfigData.errorMsg).toBeDefined();
      expect(result).toBeFalsy();
    });

    it("Function should fail if encryption key is wrong", async () => {
      const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      await LocalStore.setOne(StoreKey.SETTINGS, {
        ...settings,
        configEncrypted: true,
        configEncryptionKey: "wrong",
      });

      fetch.mockResponseOnce(encryptedSettings.encryptedData);
      const result = await updateNow();

      const lastConfigData = await LocalStore.getOne(StoreKey.LAST_CONFIG_DATA);
      expect(lastConfigData.errorMsg).toBeDefined();
      expect(result).toBeFalsy();
    });
  });

  describe("generateJSONFile()", () => {
    it("Result should be equal to default settings (if nothing was changed)", async () => {
      await LocalStore.clear();
      await ConfigFile.parseJSONFile(defaultSettings, true);

      const result = await ConfigFile.generateJSONFile();
      expect(result).toStrictEqual(_.omit(defaultSettings, "update"));
    });

    it("Result should reflect changes done to default settings", async () => {
      await LocalStore.clear();
      await ConfigFile.parseJSONFile(defaultSettings, true);

      // Change data in local storage.
      const settings = _.cloneDeep(
        (await LocalStore.getOne(StoreKey.SETTINGS)) || {}
      );
      const providers = _.cloneDeep(
        (await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS)) || {}
      );
      const rsa = _.cloneDeep(
        (await LocalStore.getOne(StoreKey.RSA_SECURITY)) || {}
      );
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

      const expectedSettings = _.cloneDeep(_.omit(defaultSettings, "update"));
      expectedSettings.config[0][2] = true;
      expectedSettings.config[0][3] = "some password";
      expectedSettings.groups[0][1] = "changed group";
      expectedSettings.searchproviders.shift();
      expectedSettings.searchproviders[0][3] = false;
      expectedSettings.RSA.Config.RSAConfigEnable = true;
      expectedSettings.RSA.Config = _.omit(
        expectedSettings.RSA.Config,
        "RSAConfigRange4"
      );
      expectedSettings.RSA.Queries.shift();
      expectedSettings.RSA.Queries[0][1] = "changed label";

      const result = await ConfigFile.generateJSONFile();
      expect(result).toStrictEqual(expectedSettings);
    });
  });

  describe("parseBasicSettings()", () => {
    it("Valid data should be parsed correctly", async () => {
      const rawData = [
        [
          "https://wwww.some-domain.com/settings.json",
          "true",
          "false",
          "",
          "false",
        ],
      ];
      const result = await ConfigFile.parseBasicSettings(rawData);

      const expectedData = {
        configurationURL: rawData[0][0],
        useGroups: true,
        configEncrypted: false,
        configEncryptionKey: "",
        autoUpdateConfig: false,
      };
      expect(result).toEqual(expect.objectContaining(expectedData));

      // NOTE: 'mergeGroups' should be initialized with same value than 'useGroups'.
      expect(result.mergeGroups).toEqual(result.useGroups);
    });
  });

  describe("parseGroups()", () => {
    it("Valid arrays should be parsed correctly", async () => {
      const groups = [
        ["1", "IP Lookup"],
        ["2", "Domain"],
        ["3", "Hash"],
      ];
      const result = await ConfigFile.parseGroups(groups);

      // NOTE: By default, only first two items should be enabled.
      const expectedResult = [
        { name: "IP Lookup", enabled: true },
        { name: "Domain", enabled: true },
        { name: "Hash", enabled: false },
      ];
      expect(result).toHaveLength(3);
      expect(result).toStrictEqual(expectedResult);
    });

    it("Invalid arrays (length < 3) shouldn't be parsed", async () => {
      const result = await ConfigFile.parseGroups([
        ["1", "IP Lookup"],
        ["2", "Domain"],
      ]);
      expect(result).toHaveLength(0);
    });
  });

  describe("updateSpecialProvider()", () => {
    it("Configuration shouldn't be overridden if corresponding flag is disabled", async () => {
      const oldConfig = defaultSettings.RSA.Config;
      const newConfig = {
        ...oldConfig,
        RSAConfigEnable: !oldConfig.RSAConfigEnable,
        RSAConfigPopup: !oldConfig.RSAConfigPopup,
        RSAConfigPort: "new-value",
        RSAConfigDevId: "24",
      };
      await ConfigFile.updateSpecialProvider(
        StoreKey.RSA_SECURITY,
        { ...defaultSettings.RSA, Config: newConfig },
        "mergeRSA"
      );

      const result = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      expect(result.config).toStrictEqual(oldConfig);
    });

    it("Configuration should be overridden if corresponding flag is enabled", async () => {
      const settings = _.cloneDeep(
        (await LocalStore.getOne(StoreKey.SETTINGS)) || {}
      );
      settings.mergeRSA.config = true;
      await LocalStore.setOne(StoreKey.SETTINGS, settings);

      const oldConfig = defaultSettings.RSA.Config;
      const newConfig = {
        ...oldConfig,
        RSAConfigEnable: !oldConfig.RSAConfigEnable,
        RSAConfigPopup: !oldConfig.RSAConfigPopup,
        RSAConfigPort: "new-value",
        RSAConfigDevId: "24",
      };
      await ConfigFile.updateSpecialProvider(
        StoreKey.RSA_SECURITY,
        { ...defaultSettings.RSA, Config: newConfig },
        "mergeRSA"
      );

      const result = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      expect(result.config).toStrictEqual(newConfig);
    });

    it("Configuration should be overridden if forced (no matter the value of corresponding flag)", async () => {
      const settings = _.cloneDeep(
        (await LocalStore.getOne(StoreKey.SETTINGS)) || {}
      );
      settings.mergeRSA.config = false;
      await LocalStore.setOne(StoreKey.SETTINGS, settings);

      const oldConfig = defaultSettings.RSA.Config;
      const newConfig = {
        ...oldConfig,
        RSAConfigEnable: !oldConfig.RSAConfigEnable,
        RSAConfigPopup: !oldConfig.RSAConfigPopup,
        RSAConfigPort: "new-value",
        RSAConfigDevId: "24",
      };
      await ConfigFile.updateSpecialProvider(
        StoreKey.RSA_SECURITY,
        { ...defaultSettings.RSA, Config: newConfig },
        "mergeRSA",
        true
      );

      const result = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      expect(result.config).toStrictEqual(newConfig);
    });

    it("Queries should merged by default", async () => {
      const newQueries = _.clone(defaultSettings.RSA.Queries);
      const newQuery = [-1, "Some new Query", "new_ip.dst=TESTSEARCH", true];
      newQueries.push(newQuery);
      newQueries.push(_.clone(newQueries[0])); // Simulate a duplicate query.

      await ConfigFile.updateSpecialProvider(
        StoreKey.RSA_SECURITY,
        { ...defaultSettings.RSA, Queries: newQueries },
        "mergeRSA"
      );

      // NOTE: Duplicates queries shouldn't be added.
      const result = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      let expectedQueries = _.clone(defaultSettings.RSA.Queries);
      expectedQueries.push(newQuery);
      expectedQueries = ConfigFile.parseQueries(expectedQueries);
      expect(result.queries).toEqual(expectedQueries);
    });

    it("Queries should be overridden if corresponding flag indicates it", async () => {
      const settings = _.cloneDeep(
        (await LocalStore.getOne(StoreKey.SETTINGS)) || {}
      );
      settings.mergeRSA.queries = "override";
      await LocalStore.setOne(StoreKey.SETTINGS, settings);

      const newQueries = [-1, "Some new Query", "new_ip.dst=TESTSEARCH", true];
      await ConfigFile.updateSpecialProvider(
        StoreKey.RSA_SECURITY,
        { ...defaultSettings.RSA, Queries: newQueries },
        "mergeRSA"
      );

      const result = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      expect(result.queries).toEqual(ConfigFile.parseQueries(newQueries));
    });

    it("Queries should be overridden if forced (no matter the value of corresponding flag)", async () => {
      const settings = _.cloneDeep(
        (await LocalStore.getOne(StoreKey.SETTINGS)) || {}
      );
      settings.mergeRSA.queries = "ignore";
      await LocalStore.setOne(StoreKey.SETTINGS, settings);

      const newQueries = [-1, "Some new Query", "new_ip.dst=TESTSEARCH", true];
      await ConfigFile.updateSpecialProvider(
        StoreKey.RSA_SECURITY,
        { ...defaultSettings.RSA, Queries: newQueries },
        "mergeRSA",
        true
      );

      const result = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      expect(result.queries).toEqual(ConfigFile.parseQueries(newQueries));
    });

    it("Queries should be preserved if corresponding flag indicates it", async () => {
      const settings = _.cloneDeep(
        (await LocalStore.getOne(StoreKey.SETTINGS)) || {}
      );
      settings.mergeRSA.queries = "ignore";
      await LocalStore.setOne(StoreKey.SETTINGS, settings);

      const newQueries = [-1, "Some new Query", "new_ip.dst=TESTSEARCH", true];
      await ConfigFile.updateSpecialProvider(
        StoreKey.RSA_SECURITY,
        { ...defaultSettings.RSA, Queries: newQueries },
        "mergeRSA"
      );

      const result = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      expect(result.queries).toEqual(
        ConfigFile.parseQueries(defaultSettings.RSA.Queries)
      );
    });
  });

  describe("parseJSONFile()", () => {
    it("Basic settings shouldn't modified if override flag is false", async () => {
      await LocalStore.clear(); // Make settings to be empty.
      await ConfigFile.parseJSONFile(defaultSettings, false);

      const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      expect(settings).toEqual({});
    });

    it("Basic settings should be overridden if override flag is true", async () => {
      await LocalStore.clear(); // Make settings to be empty.
      await ConfigFile.parseJSONFile(defaultSettings, true);

      const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      const expectedSettings = ConfigFile.parseBasicSettings(
        defaultSettings.config
      );
      expect(_.omit(settings, "providersGroups")).toEqual(expectedSettings);
    });

    it("Groups names shouldn't be updated if corresponding flag is false", async () => {
      let settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      await LocalStore.setOne(StoreKey.SETTINGS, {
        ...settings,
        mergeGroups: false,
      });

      const newGroups = [
        ["1", "Group 1"],
        ["2", "Group 2"],
        ["3", "Group 3"],
      ];
      await ConfigFile.parseJSONFile({ ...defaultSettings, groups: newGroups });

      settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      const defaultGroups = ConfigFile.parseGroups(defaultSettings.groups);
      expect(settings.providersGroups).toEqual(defaultGroups);
    });

    it("Groups names should be updated if corresponding flag is true", async () => {
      let settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      await LocalStore.setOne(StoreKey.SETTINGS, {
        ...settings,
        mergeGroups: true,
      });

      const newGroups = [
        ["1", "Group 1"],
        ["2", "Group 2"],
        ["3", "Group 3"],
      ];
      await ConfigFile.parseJSONFile({ ...defaultSettings, groups: newGroups });

      settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      const expectedGroups = ConfigFile.parseGroups(newGroups);
      expect(settings.providersGroups).toEqual(expectedGroups);
    });

    it("Groups names should be updated if forced (no matter flag's value)", async () => {
      let settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      await LocalStore.setOne(StoreKey.SETTINGS, {
        ...settings,
        mergeGroups: false,
      });

      const newGroups = [
        ["1", "Group 1"],
        ["2", "Group 2"],
        ["3", "Group 3"],
      ];
      await ConfigFile.parseJSONFile(
        { ...defaultSettings, groups: newGroups },
        true
      );

      settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      const expectedGroups = ConfigFile.parseGroups(newGroups);
      expect(settings.providersGroups).toEqual(expectedGroups);
    });

    it("Search providers should be merged by default", async () => {
      const newProvider = [
        -1,
        "Google new",
        "https://www.google2.com/search?q=TESTSEARCH",
        true,
        true,
        3,
        false,
        "",
        false,
        "",
      ];
      const newProviders = [
        newProvider,
        _.clone(defaultSettings.searchproviders[0]),
      ]; // Simulate a duplicate provider.

      await ConfigFile.parseJSONFile({ searchproviders: newProviders });

      // NOTE: Duplicates providers shouldn't be added.
      const result = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
      let expectedProviders = _.clone(defaultSettings.searchproviders);
      expectedProviders.push(newProvider);
      expectedProviders = ConfigFile.parseProviders(expectedProviders);
      expect(result).toEqual(expectedProviders);
    });

    it("Search providers should be overridden if corresponding flag indicates it", async () => {
      const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      await LocalStore.setOne(StoreKey.SETTINGS, {
        ...settings,
        mergeSearchProviders: "override",
      });

      const newSearchProviders = _.cloneDeep(
        defaultSettings.searchproviders
      ).splice(0, 2);
      await ConfigFile.parseJSONFile({ searchproviders: newSearchProviders });

      const searchProviders = await LocalStore.getOne(
        StoreKey.SEARCH_PROVIDERS
      );
      expect(searchProviders).toEqual(
        ConfigFile.parseProviders(newSearchProviders)
      );
    });

    describe("Groups names should be updated is forced (no matter flag's value)", () => {
      it("Groups names should be updated", async () => {
        const newGroups = [
          ["1", "Group 1"],
          ["2", "Group 2"],
          ["3", "Group 3"],
        ];
        await ConfigFile.parseJSONFile(
          { ...defaultSettings, groups: newGroups },
          true
        );

        const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
        const expectedGroups = ConfigFile.parseGroups(newGroups);
        expect(settings.providersGroups).toEqual(expectedGroups);
      });

      it("New groups should be added", async () => {
        const newGroups = [
          ["1", "Group 1"],
          ["2", "Group 2"],
          ["3", "Group 3"],
          ["4", "Group 4"],
          ["5", "Group 5"],
        ];
        await ConfigFile.parseJSONFile(
          { ...defaultSettings, groups: newGroups },
          true
        );

        const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
        const expectedGroups = ConfigFile.parseGroups(newGroups);
        expect(settings.providersGroups).toEqual(expectedGroups);
      });

      it("Old obsolete groups should be removed", async () => {
        const newGroups = [
          ["1", "Group 1"],
          ["2", "Group 2"],
          ["3", "Group 3"],
          ["4", "Group 4"],
        ];
        await ConfigFile.parseJSONFile(
          { ...defaultSettings, groups: newGroups },
          true
        );

        let settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
        const expectedGroups = ConfigFile.parseGroups(newGroups);
        expect(settings.providersGroups).toEqual(expectedGroups);
      });

      it("Undefined groups should be disabled", async () => {
        await ConfigFile.parseJSONFile(
          { ...defaultSettings, groups: [["1", "New Group 1"]] },
          true
        );

        const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
        const expectedGroups = ConfigFile.parseGroups(defaultSettings.groups);
        expectedGroups[0].name = "New Group 1";
        expectedGroups[1].enabled = false;
        expectedGroups[2].enabled = false;
        expect(settings.providersGroups).toEqual(expectedGroups);
      });
    });
  });

  describe("sanitizeSettings()", () => {
    it("Settings and groups should be initialized with default values if some fields are missing", async () => {
      // Initialize settings sample with some missings fields.
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
      await LocalStore.setOne(StoreKey.SETTINGS, sampleConfig);

      // Sanitize settings.
      await ConfigFile.sanitizeSettings();

      // Get default settings and groups.
      const defaultConfig = ConfigFile.parseBasicSettings(
        defaultSettings.config
      );
      defaultConfig.providersGroups = ConfigFile.parseGroups(
        defaultSettings.groups
      );

      // Check if missing fields are initialized with default values.
      const settings = await LocalStore.getOne(StoreKey.SETTINGS);
      const expectedSettings = _.assign(defaultConfig, sampleConfig);

      expect(settings).toEqual(expectedSettings);
    });

    it("Settings should not be modified if values are valid", async () => {
      // Initialize settings with valid data.
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
      await LocalStore.setOne(StoreKey.SETTINGS, sampleConfig);

      // Sanitize settings.
      await ConfigFile.sanitizeSettings();

      // Check that settings aren't altered.
      const settings = await LocalStore.getOne(StoreKey.SETTINGS);
      expect(settings).toEqual(sampleConfig);
    });

    it("Search providers should be initialized with default values if not defined", async () => {
      // Set empty search providers on Chrome's storage.
      await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, []);

      // Sanitize settings.
      await ConfigFile.sanitizeSettings();

      // Check if search providers are initialized with default values.
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

      // Set invalid special providers on Chrome's storage.
      for (const provider of specialProviders) {
        await LocalStore.setOne(provider.storeKey, {
          config: null,
          queries: null,
        });
      }

      // Sanitize settings.
      await ConfigFile.sanitizeSettings();

      // Check if special providers' config and queries are initialized with default values.
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
