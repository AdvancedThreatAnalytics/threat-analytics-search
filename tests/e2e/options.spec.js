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
    const listItemSelector = "form[name=manage_providers] ul[role=list] li[role=listitem]";

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

  afterAll(async () => {
    await browser.close();
  });
});
