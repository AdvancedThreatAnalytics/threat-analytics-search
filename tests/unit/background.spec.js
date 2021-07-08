const chrome = require("sinon-chrome");
global.chrome = chrome;

const ConfigFile = require("../../src/js/shared/config_file");
const {MiscURLs} = require("../../src/js/shared/constants");
const {installedListener} = require("../../src/background");

const sanitizeSettings = jest.spyOn(ConfigFile.default, "sanitizeSettings");
const updateNow = jest.spyOn(ConfigFile.default, "updateNow");

describe("background.js", () => {
  it("should open migration.html if previous version was 4", () => {
    installedListener({previousVersion: "4"});
    expect(chrome.tabs.create.calledOnce).toBe(true);
    expect(chrome.tabs.create.withArgs({url: "migration.html?previous=4", selected: true}).calledOnce).toBe(true);
    chrome.flush();
  })

  it("should call sanitizeSettings if previous version was not 4", () => {
    installedListener({previousVersion: "5"});
    expect(chrome.tabs.create.withArgs({url: MiscURLs.INSTALLED_URL, selected: true}).calledOnce).toBe(true);
    expect(sanitizeSettings).toHaveBeenCalled();
    expect(updateNow).not.toHaveBeenCalled();
    chrome.flush();
  })

  it("should call updateNow if installing for the first time", async () => {
    installedListener({reason: "install"}).finally(() => {
      expect(sanitizeSettings).toHaveReturned();
      expect(updateNow).toHaveBeenCalled();
    });
  })

  afterAll(function () {
    delete global.chrome;
  });
})
