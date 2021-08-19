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

  afterAll(async () => {
    await browser.close();
  });
});
