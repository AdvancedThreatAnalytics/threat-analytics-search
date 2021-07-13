const _ = require("lodash");
const ExtensionUtil = require("./util");
const { MiscURLs, StoreKey } = require("../../src/js/shared/constants");
const ConfigFile = require("../../src/js/shared/config_file").default;
const DefaultFile = require("../../settings.json");

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
      key: "_configUrl",
      value: "test value",
    };

    // Set sample data to local storage
    await page.evaluate(
      (sample) => window.localStorage.setItem(sample.key, sample.value),
      sampleData
    );

    // Go to migration page
    await ExtensionUtil.goto("migration", page);

    // Check if page is redirected
    const nav = await page.waitForRequest(MiscURLs.INSTALLED_URL);
    expect(nav.url()).toEqual(MiscURLs.INSTALLED_URL);

    // Go back to options page
    await ExtensionUtil.goto("options", page);

    // Get data from chrome storage
    const [sampleValue, providerValue] = await page.evaluate(
      (key1, key2) =>
        new Promise((resolve) =>
          chrome.storage.local.get([key1, key2], (res) =>
            resolve([res[key1], res[key2]])
          )
        ),
      StoreKey.SETTINGS,
      StoreKey.SEARCH_PROVIDERS
    );

    // Verify if data from local storage is copied to chrome storage
    expect(sampleValue.configurationURL).toEqual(sampleData.value);

    // Verify if data not defined in local storage is in chrome storage
    expect(providerValue).toBeTruthy();
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
    const providers = await page.evaluate(
      (key) =>
        new Promise((resolve) =>
          chrome.storage.local.get([key], (res) => resolve(res[key]))
        ),
      StoreKey.SEARCH_PROVIDERS
    );

    // Get data from settings.json
    const defaultProviders = ConfigFile.parseProviders(
      DefaultFile.searchproviders
    );

    // Verify if chrome's storage is populated from settings.json
    expect(_.map(providers, (item) => _.omit(item, "menuIndex"))).toEqual(
      _.map(defaultProviders, (item) => _.omit(item, "menuIndex"))
    );
  });

  afterAll(async () => {
    await browser.close();
  });
});
