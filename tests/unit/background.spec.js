require("./util");

import LocalStore from "../../src/js/shared/local_store";
const ConfigFile = require("../../src/js/shared/config_file");
const { MiscURLs, StoreKey } = require("../../src/js/shared/constants");
const {
  installedListener,
  alarmListener,
  ContextualMenu,
} = require("../../src/background");

const createTabs = jest.spyOn(chrome.tabs, "create");
const sanitizeSettings = jest.spyOn(ConfigFile.default, "sanitizeSettings");
const updateNow = jest.spyOn(ConfigFile.default, "updateNow");
const contextualMenuUpdate = jest.spyOn(ContextualMenu, "update");

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

describe("onAlert", () => {
  it("Should call 'ContextualMenu.update' if 'autoUpdateConfig' flag is set", async () => {
    // Clean up the spy so that assertions in this test
    // are unaffected by previous invocations
    contextualMenuUpdate.mockClear();

    // Set 'autoUpdateConfig' flag to 'true'
    const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
    await LocalStore.setOne(StoreKey.SETTINGS, {
      ...settings,
      autoUpdateConfig: true,
    });

    // Call alarm listener
    await alarmListener();

    // Check if 'ContextualMenu.update' is called
    expect(contextualMenuUpdate).toHaveBeenCalled();
  });

  it("Should not call 'ContextualMenu.update' if 'autoUpdateConfig' flag is not set", async () => {
    // Clean up the spy so that assertions in this test
    // are unaffected by previous invocations
    contextualMenuUpdate.mockClear();

    // Set 'autoUpdateConfig' flag to 'false'
    const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
    await LocalStore.setOne(StoreKey.SETTINGS, {
      ...settings,
      autoUpdateConfig: false,
    });

    // Call alarm listener
    await alarmListener();

    // Check if 'ContextualMenu.update' is not called
    expect(contextualMenuUpdate).not.toHaveBeenCalled();
  });
});
