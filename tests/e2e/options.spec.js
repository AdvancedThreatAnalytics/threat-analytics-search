const ExtensionUtil = require("./util");

describe("Options page", () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await ExtensionUtil.load();
    page = await ExtensionUtil.goto("options.html");
  });

  test("Changes on provider's names are saved automatically", async () => {
    const newValue = "Test";

    // Wait until the input appears.
    const selector =
      "form[name=manage_providers] ul[role=list] li[role=listitem] input";
    await page.waitForSelector(selector);

    // Clear the input.
    await page.$eval(selector, (el) => (el.value = ""));

    // Type "Test".
    await page.type(selector, newValue);

    // Blur the input so that the extension updates its value on local storage.
    await page.$eval(selector, (el) => el.blur());

    // Reload the page.
    await page.reload();

    // Get the input value.
    await page.waitForSelector(selector);
    const value = await page.$eval(selector, (el) => el.value);

    // Check if value changed.
    expect(value).toEqual(newValue);
  });

  test("Changes on providers' order are preserved", async () => {
    const listItemSelector =
      "form[name=manage_providers] ul[role=list] li[role=listitem]";

    // Wait until the input appears.
    let selector = `${listItemSelector} input[name=label_1]`;
    await page.waitForSelector(selector);

    // Enable drag interception (otherwise, drag and drop feature doesn't work)
    await page.setDragInterception(true);

    // Get the input value
    const expectedValue = await page.$eval(selector, (el) => el.value);

    // Drag and drop second item to the first (change order)
    const dragSelector = `${listItemSelector} .sortable-handle`;
    const elements = await page.$$(dragSelector);
    await elements[1].dragAndDrop(elements[0]);

    // Reload the page.
    await page.reload();

    // Wait until the input appears.
    selector = `${listItemSelector} input[name=label_0]`;
    await page.waitForSelector(selector);

    // Get the input value
    const value = await page.$eval(selector, (el) => el.value);

    // Check if order change is preserved
    expect(value).toEqual(expectedValue);
  });

  test("Link from Security Analytics Investigation autofills settings correctly", async () => {
    const newValue = "https://security.com:81/investigation/12/";

    // Open security analytics tab.
    let rsaTab = "nav ul li a[data-tab=security-analytics]";
    await page.waitForSelector(rsaTab);
    await page.click(rsaTab);

    // Wait until the input appears.
    const exampleLink = "form[name=rsaConfig] input[name=RSAConfigExampleLink]";
    let enable = "form[name=rsaConfig] input[name=RSAConfigEnable]";
    let host = "form[name=rsaConfig] input[name=RSAConfigHost]";
    let port = "form[name=rsaConfig] input[name=RSAConfigPort]";
    let devId = "form[name=rsaConfig] input[name=RSAConfigDevId]";
    let useHttps = "form[name=rsaConfig] input[name=RSAConfigUseHttps]";
    await page.waitForSelector(exampleLink);

    // Clear the input.
    await page.$eval(exampleLink, (el) => (el.value = ""));

    // Type example link.
    await page.type(exampleLink, newValue);

    // Blur the input so that the extension updates its value on local storage.
    await page.$eval(exampleLink, (el) => el.blur());

    enable = await page.$eval(enable, (el) => el.value);
    host = await page.$eval(host, (el) => el.value);
    port = await page.$eval(port, (el) => el.value);
    devId = await page.$eval(devId, (el) => el.value);
    useHttps = await page.$eval(useHttps, (el) => el.value);

    // Check if values are changed.
    expect(enable).toEqual("yes");
    expect(host).toEqual("security.com");
    expect(port).toEqual("81");
    expect(devId).toEqual("12");
    expect(useHttps).toEqual("yes");
  });

  test("Link from NetWitness Investigation autofills settings correctly", async () => {
    const newValue = "https://netwitness.com:81/?collection=12";

    // Open netWitness tab.
    let netWitnessTab = "nav ul li a[data-tab=netwitness]";
    await page.waitForSelector(netWitnessTab);
    await page.click(netWitnessTab);

    // Wait until the input appears.
    const exampleLink = "form[name=nwiConfig] input[name=NWIConfigExampleLink]";
    let enable = "form[name=nwiConfig] input[name=NWIConfigEnable]";
    let host = "form[name=nwiConfig] input[name=NWIConfigHost]";
    let port = "form[name=nwiConfig] input[name=NWIConfigPort]";
    let collectionName =
      "form[name=nwiConfig] input[name=NWIConfigCollectionName]";
    await page.waitForSelector(exampleLink);

    // Clear the input.
    await page.$eval(exampleLink, (el) => (el.value = ""));

    // Type example link.
    await page.type(exampleLink, newValue);

    // Blur the input so that the extension updates its value on local storage.
    await page.$eval(exampleLink, (el) => el.blur());

    enable = await page.$eval(enable, (el) => el.value);
    host = await page.$eval(host, (el) => el.value);
    port = await page.$eval(port, (el) => el.value);
    collectionName = await page.$eval(collectionName, (el) => el.value);

    // Check if values are changed.
    expect(enable).toEqual("yes");
    expect(host).toEqual("netwitness.com");
    expect(port).toEqual("81");
    expect(collectionName).toEqual("12");
  });

  afterAll(async () => {
    await browser.close();
  });
});
