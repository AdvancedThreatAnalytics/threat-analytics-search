const _ = require("lodash");
const ExtensionUtil = require("./util");
const { MiscURLs, StoreKey } = require("../../src/js/shared/constants");
const ConfigFile = require("../../src/js/shared/config_file").default;
const SETTINGS = require("../../settings.json");
jest.setTimeout(30000);

describe("Migration", () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await ExtensionUtil.load();
  });

  test("Data from local storage is copied to chrome's storage", async () => {
    // Go to options page to set sample data to local storage
    page = await ExtensionUtil.goto("options");

    const sampleData = {
      _configUrl: "https://www.criticalstart.com/",
      _configUseGroups: true,
      _configEnc: true,
      _configEncKey: "value",
      _configAutoRefresh: true,
      _group1Name: "Group 1",
      _group2Name: "Group 2",
      _group3Name: "Group 3",
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

    // Set sample data to local storage
    await page.evaluate((data) => {
      for (const key in data) {
        window.localStorage.setItem(
          key,
          _.isString(data[key]) ? data[key] : JSON.stringify(data[key])
        );
      }
    }, sampleData);

    // Go to migration page
    await ExtensionUtil.goto("migration", page);

    // Check if page is redirected
    const nav = await page.waitForRequest(MiscURLs.INSTALLED_URL);
    expect(nav.url()).toEqual(MiscURLs.INSTALLED_URL);

    // Go back to options page
    await ExtensionUtil.goto("options", page);

    // Get data from chrome storage
    const chromeData = await page.evaluate(
      () => new Promise((resolve) => chrome.storage.local.get(null, resolve))
    );

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
          menuIndex: "searchprovider-0",
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

    // Verify if data is set to chrome storage for both
    // 1. Data defined in local storage
    // 2. Data not defined in local storage
    expect(chromeData).toEqual(expectedData);
  });

  test("Chrome's storage is populated from settings.json", async () => {
    // Go to options page
    page = await ExtensionUtil.goto("options");

    // Clear local storage
    await page.evaluate(() => window.localStorage.clear());

    // Go to migration page
    await ExtensionUtil.goto("migration", page);

    // Check if page is redirected
    const nav = await page.waitForRequest(MiscURLs.INSTALLED_URL);
    expect(nav.url()).toEqual(MiscURLs.INSTALLED_URL);

    // Go back to options page
    await ExtensionUtil.goto("options", page);

    // Get data from chrome storage
    const chromeData = await page.evaluate(
      () => new Promise((resolve) => chrome.storage.local.get(null, resolve))
    );

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
        _.get(SETTINGS, "searchproviders", []).map((item, index) => {
          item[0] = item[3] ? `searchprovider-${index}` : -1;
          return item;
        })
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

    // Verify if chrome's storage is populated from settings.json
    expect(chromeData).toEqual(expectedData);
  });

  afterAll(async () => {
    await browser.close();
  });
});
