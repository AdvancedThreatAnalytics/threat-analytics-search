require("./util");

const ConfigFile = require("../../src/js/shared/config_file");
const { MiscURLs } = require("../../src/js/shared/constants");
const { installedListener } = require("../../src/background");

const createTabs = jest.spyOn(chrome.tabs, "create");
const sanitizeSettings = jest.spyOn(ConfigFile.default, "sanitizeSettings");
const updateNow = jest.spyOn(ConfigFile.default, "updateNow");

describe("onInstall", () => {
  it("Should open 'migration.html' if previous version was 4", () => {
    installedListener({ previousVersion: "4" });
    expect(createTabs).toHaveBeenCalled();
    expect(createTabs).toBeCalledWith({
      url: "migration.html?previous=4",
      selected: true,
    });
  });

  it("Should call 'sanitizeSettings' if previous version was not 4", () => {
    installedListener({ previousVersion: "5" });
    expect(sanitizeSettings).toHaveBeenCalled();
    expect(updateNow).not.toHaveBeenCalled();
  });

  it("Should call 'updateNow' and open welcome URL if installing for the first time", async () => {
    await installedListener({ reason: "install" });
    expect(sanitizeSettings).toHaveReturned();
    expect(updateNow).toHaveBeenCalled();
    expect(createTabs).toBeCalledWith({
      url: MiscURLs.INSTALLED_URL,
      selected: true,
    });
  });
});
