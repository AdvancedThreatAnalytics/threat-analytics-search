const puppeteer = require('puppeteer');

const EXTENSION_ID = "eliokoocofjemjjohafbmhmgjmedomko";

module.exports = {
  async load() {
    this.browser = await puppeteer.launch({
      headless: false,

      // Pass the options to install the extension
      args: [
        `--disable-extensions-except=${process.cwd()}/dist`,
        `--load-extension=${process.cwd()}/dist`,
      ]
    });

    return this.browser;
  },

  async goto(url) {
    const page = await this.browser.newPage();
    await page.goto(`chrome-extension://${EXTENSION_ID}/${url}.html`);
    return page;
  }
}