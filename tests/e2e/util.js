const puppeteer = require("puppeteer");

const EXTENSION_ID = "eliokoocofjemjjohafbmhmgjmedomko";

module.exports = {
  async load() {
    this.browser = await puppeteer.launch({
      headless: false,

      // Pass the options to install the extension
      args: [
        `--disable-extensions-except=${process.cwd()}/dist`,
        `--load-extension=${process.cwd()}/dist`,
      ],
    });

    // Wait for some time to allow extension to load options
    await new Promise((func) => setTimeout(func, 3000));

    return this.browser;
  },

  async goto(url, page = null) {
    page = page || (await this.browser.newPage());
    await page.goto(`chrome-extension://${EXTENSION_ID}/${url}`);
    return page;
  },
};
