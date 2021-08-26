const _ = require("lodash");

const ExtensionUtil = require("./util");
const { StoreKey } = require("../../src/js/shared/constants");
const ConfigFile = require("../../src/js/shared/config_file").default;
const SETTINGS = require("../../settings.json");

describe("Migration (from v4.0)", () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await ExtensionUtil.load();
  });

  test("Local storage's data is copied to Chrome's storage", async () => {
    // Go to options page to set sample data to local storage.
    page = await ExtensionUtil.goto("options.html");

    const sampleData = {
      _configUrl: "https://www.criticalstart.com/",
      _configUseGroups: true,
      _configEnc: true,
      _configEncKey: "value",
      _configAutoRefresh: true,
      _group1Name: "Group A",
      _group2Name: "Group B",
      _group3Name: "Group C",
      _enableGroup3: true,
      _askbg: false,
      _asknext: false,
      _asknewwindow: false,
      _askoptions: false,
      _allsearch: [
        [
          -1,
          "Test",
          "http://www.test.com/?q=TESTSEARCH",
          true,
          true,
          3,
          false,
          "",
          false,
          "",
        ],
      ],
      _CBCConfig: {},
      _CBCallquery: [],
      _NWIConfig: {},
      _NWIallquery: [],
      _RSAConfig: {},
      _RSAallquery: [],
      _configLastRefresh: "test",
    };

    // Set sample data to local storage.
    await page.evaluate((data) => {
      for (const key in data) {
        window.localStorage.setItem(
          key,
          _.isString(data[key]) ? data[key] : JSON.stringify(data[key])
        );
      }
    }, sampleData);

    // Go to migration page.
    await ExtensionUtil.goto("migration.html", page);

    // Go back to options page.
    page = await ExtensionUtil.goto("options.html");

    // Get data from Chrome storage.
    const chromeData = await page.evaluate(
      () => new Promise((resolve) => chrome.storage.local.get(null, resolve))
    );

    // Update menu index to its initial value as
    // it could have been edited in background.js
    _.forEach(chromeData[StoreKey.SEARCH_PROVIDERS], (item, index) => {
      item.menuIndex = _.get(sampleData, `_allsearch.${index}.0`);
    });

    const expectedData = {
      [StoreKey.SETTINGS]: {
        configurationURL: sampleData._configUrl,
        useGroups: sampleData._configUseGroups,
        configEncrypted: sampleData._configEnc,
        configEncryptionKey: sampleData._configEncKey,
        autoUpdateConfig: sampleData._configAutoRefresh,
        providersGroups: [
          {
            name: sampleData._group1Name,
            enabled: true,
          },
          {
            name: sampleData._group2Name,
            enabled: true,
          },
          {
            name: sampleData._group3Name,
            enabled: sampleData._enableGroup3,
          },
        ],
        resultsInBackgroundTab: sampleData._askbg,
        enableAdjacentTabs: sampleData._asknext,
        openGroupsInNewWindow: sampleData._asknewwindow,
        enableOptionsMenuItem: sampleData._askoptions,
        mergeGroups: sampleData._configUseGroups,
        mergeSearchProviders: "merge",
        mergeCBC: { config: false, queries: "merge" },
        mergeNWI: { config: false, queries: "merge" },
        mergeRSA: { config: false, queries: "merge" },
      },

      [StoreKey.SEARCH_PROVIDERS]: [
        {
          menuIndex: sampleData._allsearch[0][0],
          label: sampleData._allsearch[0][1],
          link: sampleData._allsearch[0][2],
          enabled: sampleData._allsearch[0][3],
          fromConfig: sampleData._allsearch[0][4],
          group: sampleData._allsearch[0][5],
          postEnabled: sampleData._allsearch[0][6],
          postValue: sampleData._allsearch[0][7],
          proxyEnabled: sampleData._allsearch[0][8],
          proxyUrl: sampleData._allsearch[0][9],
        },
      ],

      [StoreKey.CARBON_BLACK]: {
        config: sampleData._CBCConfig,
        queries: sampleData._CBCallquery,
      },

      [StoreKey.NET_WITNESS]: {
        config: sampleData._NWIConfig,
        queries: sampleData._NWIallquery,
      },

      [StoreKey.RSA_SECURITY]: {
        config: sampleData._RSAConfig,
        queries: sampleData._RSAallquery,
      },

      [StoreKey.LAST_CONFIG_DATA]: {
        errorMsg: sampleData._configLastRefresh,
      },
    };

    // Verify if data was set on Chrome storage.
    expect(chromeData).toEqual(expectedData);
  });

  test("Chrome's storage is populated with default settings if local storage is empty", async () => {
    // Go to options page.
    page = await ExtensionUtil.goto("options.html");

    // Clear local storage.
    await page.evaluate(() => window.localStorage.clear());

    // Go to migration page.
    await ExtensionUtil.goto("migration.html", page);

    // Go back to options page.
    page = await ExtensionUtil.goto("options.html");

    // Get data from Chrome storage.
    const chromeData = await page.evaluate(
      () => new Promise((resolve) => chrome.storage.local.get(null, resolve))
    );

    // Update menu index to its initial value as
    // it could have been edited in background.js
    _.forEach(chromeData[StoreKey.SEARCH_PROVIDERS], (item, index) => {
      item.menuIndex = _.get(SETTINGS, `searchproviders.${index}.0`);
    });

    const defaultBasic = ConfigFile.parseBasicSettings(SETTINGS.config);
    const defaultGroups = ConfigFile.parseGroups(SETTINGS.groups);

    const expectedData = {
      [StoreKey.SETTINGS]: {
        configurationURL: _.get(defaultBasic, "configurationURL"),
        useGroups: _.get(defaultBasic, "useGroups", false),
        configEncrypted: false,
        configEncryptionKey: null,
        autoUpdateConfig: _.get(defaultBasic, "autoUpdateConfig", false),
        providersGroups: [
          {
            name: _.get(defaultGroups, "0.name"),
            enabled: true,
          },
          {
            name: _.get(defaultGroups, "1.name"),
            enabled: true,
          },
          {
            name: _.get(defaultGroups, "2.name"),
            enabled: false,
          },
        ],
        resultsInBackgroundTab: true,
        enableAdjacentTabs: true,
        openGroupsInNewWindow: true,
        enableOptionsMenuItem: true,
        mergeGroups: _.get(defaultBasic, "useGroups", false),
        mergeSearchProviders: "merge",
        mergeCBC: { config: false, queries: "merge" },
        mergeNWI: { config: false, queries: "merge" },
        mergeRSA: { config: false, queries: "merge" },
      },

      [StoreKey.SEARCH_PROVIDERS]: ConfigFile.parseProviders(
        _.get(SETTINGS, "searchproviders", [])
      ),

      [StoreKey.CARBON_BLACK]: {
        config: _.get(SETTINGS, "CBC.Config", {}),
        queries: ConfigFile.parseQueries(_.get(SETTINGS, "CBC.Queries", [])),
      },

      [StoreKey.NET_WITNESS]: {
        config: _.get(SETTINGS, "NWI.Config", {}),
        queries: ConfigFile.parseQueries(_.get(SETTINGS, "NWI.Queries", [])),
      },

      [StoreKey.RSA_SECURITY]: {
        config: _.get(SETTINGS, "RSA.Config", {}),
        queries: ConfigFile.parseQueries(_.get(SETTINGS, "RSA.Queries", [])),
      },

      [StoreKey.LAST_CONFIG_DATA]: {
        errorMsg: null,
      },
    };

    // Verify if Chrome's storage is populated with settings.json.
    expect(chromeData).toEqual(expectedData);
  });

  afterAll(async () => {
    await browser.close();
  });
});
