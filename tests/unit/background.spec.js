require("./util");

const _ = require("lodash");
import LocalStore from "../../src/js/shared/local_store";
import { StoreKey } from "../../src/js/shared/constants";
import { getProviderTargetURL } from "../../src/js/shared/misc";

const ConfigFile = require("../../src/js/shared/config_file");
const { MiscURLs } = require("../../src/js/shared/constants");
const {
  installedListener,
  onClickedListener,
} = require("../../src/background");

const createTabs = jest.spyOn(chrome.tabs, "create");
const sanitizeSettings = jest.spyOn(ConfigFile.default, "sanitizeSettings");
const updateNow = jest.spyOn(ConfigFile.default, "updateNow");

describe("background.js", () => {
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
    expect(createTabs).toBeCalledWith({
      url: MiscURLs.INSTALLED_URL,
      selected: true,
    });
    expect(sanitizeSettings).toHaveBeenCalled();
    expect(updateNow).not.toHaveBeenCalled();
  });

  it("Should call 'updateNow' if installing for the first time", async () => {
    await installedListener({ reason: "install" });
    expect(sanitizeSettings).toHaveReturned();
    expect(updateNow).toHaveBeenCalled();
  });

  it("Should open tab for simple search provider", async () => {
    const info = {
      menuItemId: "searchprovider-0",
      selectionText: "test",
    };
    const tab = {
      index: 10,
    };
    onClickedListener(info, tab);

    const providers = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
    const settings = await LocalStore.getOne(StoreKey.SETTINGS);
    const provider = _.find(providers, function (item) {
      return item.menuIndex === info.menuItemId;
    });
    let targetURL = getProviderTargetURL(provider, info.selectionText);
    expect(createTabs).toBeCalledWith({
      url: targetURL,
      selected: !settings.resultsInBackgroundTab,
      index: tab.index + 1,
    });

    // Test providers with a POST request.
    providers[0].postEnabled = true;
    await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, providers);
    await onClickedListener(info, tab);
    targetURL = getProviderTargetURL(provider, info.selectionText);
    expect(createTabs).toBeCalledWith({
      url: targetURL,
      selected: !settings.resultsInBackgroundTab,
      index: tab.index + 1,
    });
  });

  it("Should open group providers", async () => {
    const newProviders = [
      {
        menuIndex: "searchprovider-37",
        label: "Provider belonging to group 3",
        link: "https://stat.ripe.net/TESTSEARCH#tabId=at-a-glance",
        enabled: true,
        fromConfig: true,
        group: 8,
        postEnabled: false,
        postValue: "",
        proxyEnabled: false,
        proxyUrl: "",
      },
      {
        menuIndex: "searchprovider-38",
        label: "Provider 2 belonging to group 3",
        link: "http://www.google.com/safebrowsing/diagnostic?site=TESTSEARCH",
        enabled: true,
        fromConfig: true,
        group: 8,
        postEnabled: false,
        postValue: "",
        proxyEnabled: false,
        proxyUrl: "",
      },
    ];
    let providers = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
    providers = providers.concat(newProviders);
    await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, providers);

    const settings = await LocalStore.getOne(StoreKey.SETTINGS);
    const info = {
      menuItemId: "group-3",
      selectionText: "test",
    };
    const tab = {
      index: 10,
    };
    const urls = _.map(newProviders, function (provider) {
      return getProviderTargetURL(provider, info.selectionText);
    });

    // If should open in new window.
    await onClickedListener(info, tab);
    expect(
      chrome.windows.create.withArgs({
        url: urls,
        focused: !settings.resultsInBackgroundTab,
      }).calledOnce
    ).toBe(true);

    // If should open in new tabs.
    settings.openGroupsInNewWindow = false;
    await LocalStore.setOne(StoreKey.SETTINGS, settings);
    await onClickedListener(info, tab);
    expect(createTabs).toBeCalledWith({
      url: urls[0],
      selected: !settings.resultsInBackgroundTab,
      index: settings.enableAdjacentTabs ? ++tab.index : null,
    });
    expect(createTabs).toBeCalledWith({
      url: urls[1],
      selected: !settings.resultsInBackgroundTab,
      index: settings.enableAdjacentTabs ? ++tab.index : null,
    });
  });

  it("Should open options page", async () => {
    await onClickedListener({ menuItemId: "optionspage" });
    expect(chrome.runtime.openOptionsPage.calledOnce).toBe(true);
  });

  it("Should open RSA item", async () => {
    const info = {
      parentMenuItemId: "rsasecurity-0",
      menuItemId: "rsasecurity-0_1",
      selectionText: "test",
    };
    await onClickedListener(info);
    var subUrl = "https://192.168.1.10/investigation/2/navigate/query";
    expect(createTabs).toBeCalledWith({
      selected: true,
      url: expect.stringContaining(subUrl),
    });
  });

  it("Should open CBC item", async () => {
    const info = {
      parentMenuItemId: "parent-1",
      menuItemId: "carbonblack-0",
      selectionText: "test",
    };
    await onClickedListener(info);
    var subUrl = "https://192.168.1.10/#/search/cb.urlver=1&q=test";
    expect(createTabs).toBeCalledWith({
      selected: true,
      url: expect.stringContaining(subUrl),
    });
  });

  it("Should open NWI item", async () => {
    const info = {
      parentMenuItemId: "netwitness-0",
      menuItemId: "netwitness-0_1",
      selectionText: "test",
    };
    await onClickedListener(info);
    var subUrl = "nw:///?collection=&where=%28alias.host%3D'test";
    expect(createTabs).toBeCalledWith({
      url: expect.stringContaining(subUrl),
    });
  });
});
