const _ = require("lodash");

require("./util");

const ConfigFile = require("../../src/js/shared/config_file").default;
const LocalStore = require("../../src/js/shared/local_store").default;
const { StoreKey } = require("../../src/js/shared/constants");
const {
  ContextualMenu,
  MenuPreffix,
  onClickedListener,
} = require("../../src/background");
const {
  getGroupProviders,
  getProviderTargetURL,
} = require("../../src/js/shared/misc");

const createContextMenu = jest.spyOn(chrome.contextMenus, "create");
const createTabs = jest.spyOn(chrome.tabs, "create");

describe("ContextualMenu", () => {
  describe("Menu population", () => {
    beforeEach(async () => {
      // Reset settings to default values.
      await LocalStore.clear();
      await ConfigFile.sanitizeSettings();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it("Groups should be added if 'useGroups' is enabled", async () => {
      // Get and enable groups.
      const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      await LocalStore.setOne(StoreKey.SETTINGS, {
        ...settings,
        useGroups: true,
      });

      // Update contextual menu.
      await ContextualMenu.update();

      // Check that non-disabled groups were added.
      const searchProviders =
        (await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS)) || [];
      settings.providersGroups.forEach((group, index) => {
        if (
          group.enabled &&
          getGroupProviders(index, searchProviders).length > 0
        ) {
          expect(createContextMenu).toBeCalledWith({
            id: MenuPreffix.GROUP + index,
            title: group.name,
            contexts: ["selection"],
          });
        }
      });
    });

    it("One menu item should be added for each non-disabled search provider", async () => {
      // Ensure that there is at least one provider enabled and one disabled.
      const searchProviders = _.cloneDeep(
        (await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS)) || []
      );
      if (searchProviders.length >= 2) {
        searchProviders[0].enabled = true;
        searchProviders[1].enabled = false;
      }
      await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, searchProviders);

      // Update contextual menu.
      await ContextualMenu.update();

      // Check that only non-disabled providers were added.
      searchProviders.forEach((provider, index) => {
        if (provider.enabled) {
          expect(createContextMenu).toBeCalledWith({
            id: MenuPreffix.PROVIDER + index,
            title: provider.label,
            contexts: ["selection"],
          });
        } else {
          expect(createContextMenu).not.toBeCalledWith({
            id: MenuPreffix.PROVIDER + index,
            title: provider.label,
            contexts: ["selection"],
          });
        }
      });
    });

    it("One menu item should be added for each non-disabled special provider", async () => {
      // Ensure that there is at least one provider enabled and one disabled, same for queries.
      const carbonBlack = _.cloneDeep(
        (await LocalStore.getOne(StoreKey.CARBON_BLACK)) || {}
      );
      carbonBlack.CBCConfigEnable = false;

      const netWitness = _.cloneDeep(
        (await LocalStore.getOne(StoreKey.NET_WITNESS)) || {}
      );
      netWitness.NWIConfigEnable = true;
      if (netWitness.queries.length >= 2) {
        netWitness.queries[0].enabled = false;
        netWitness.queries[1].enabled = true;
      }

      await LocalStore.setOne(StoreKey.CARBON_BLACK, carbonBlack);
      await LocalStore.setOne(StoreKey.NET_WITNESS, netWitness);

      // Update contextual menu.
      await ContextualMenu.update();

      // Check that only non-disabled providers were added.
      const providers = [
        {
          storeKey: StoreKey.CARBON_BLACK,
          enableKey: "CBCConfigEnable",
          title: "Carbon Black",
        },
        {
          storeKey: StoreKey.NET_WITNESS,
          enableKey: "NWIConfigEnable",
          title: "NetWitness Investigator",
        },
        {
          storeKey: StoreKey.RSA_SECURITY,
          enableKey: "RSAConfigEnable",
          title: "RSA Security Analytics",
        },
      ];

      for (const provider of providers) {
        const settings = await LocalStore.getOne(provider.storeKey);
        const config = _.get(settings, "config", {});
        const queries = _.get(settings, "queries", []);

        if (config[provider.enableKey]) {
          expect(createContextMenu).toBeCalledWith(
            expect.objectContaining({
              title: provider.title,
              contexts: ["selection"],
            })
          );
        } else {
          expect(createContextMenu).not.toBeCalledWith(
            expect.objectContaining({
              title: provider.title,
              contexts: ["selection"],
            })
          );
        }

        // Check that only non-disabled query items (from non-disabled providers) were added.
        for (const index in queries) {
          const query = queries[index];
          if (config[provider.enableKey] && query.enabled) {
            expect(createContextMenu).toBeCalledWith(
              expect.objectContaining({
                title: query.label,
                contexts: ["selection"],
              })
            );
          } else {
            expect(createContextMenu).not.toBeCalledWith(
              expect.objectContaining({
                title: query.label,
                contexts: ["selection"],
              })
            );
          }
        }
      }
    });
  });

  describe("Menu's items clicking", () => {
    beforeAll(async () => {
      const rsa = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      const nwi = await LocalStore.getOne(StoreKey.NET_WITNESS);
      const cbc = await LocalStore.getOne(StoreKey.CARBON_BLACK);
      rsa.config.RSAConfigEnable = true;
      nwi.config.NWIConfigEnable = true;
      cbc.config.CBCConfigEnable = true;
      await LocalStore.setOne(StoreKey.RSA_SECURITY, rsa);
      await LocalStore.setOne(StoreKey.NET_WITNESS, nwi);
      await LocalStore.setOne(StoreKey.CARBON_BLACK, cbc);

      // Update contextual menu.
      await ContextualMenu.update();
    });

    it("Should open tab for simple search provider", async () => {
      const info = {
        menuItemId: "searchprovider-0",
        selectionText: "test",
      };
      const tab = {
        index: 10,
      };
      await onClickedListener(info, tab);

      const providers = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
      const settings = await LocalStore.getOne(StoreKey.SETTINGS);
      const provider = _.find(providers, function (item) {
        return item.menuIndex === info.menuItemId;
      });
      const targetURL = getProviderTargetURL(provider, info.selectionText);
      expect(createTabs).toBeCalledWith({
        url: targetURL,
        selected: !settings.resultsInBackgroundTab,
        index: tab.index + 1,
      });
    });

    it("Should open dialog for POST search provider", async () => {
      const info = {
        menuItemId: "searchprovider-0",
        selectionText: "test",
      };
      const tab = {
        index: 10,
      };
      const providers = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
      const settings = await LocalStore.getOne(StoreKey.SETTINGS);
      providers[0].postEnabled = true;
      await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, providers);
      await onClickedListener(info, tab);
      const targetURL = getProviderTargetURL(providers[0], info.selectionText);

      expect(createTabs).toBeCalledWith({
        url: targetURL,
        selected: !settings.resultsInBackgroundTab,
        index: tab.index + 1,
      });
    });

    it("Should open dialog for proxy search provider", async () => {
      const info = {
        menuItemId: "searchprovider-0",
        selectionText: "test",
      };
      const tab = {
        index: 10,
      };
      const providers = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
      const settings = await LocalStore.getOne(StoreKey.SETTINGS);
      providers[0].proxyEnabled = true;
      providers[0].proxyUrl =
        "https://run.mocky.io/v3/49340c84-b278-4332-8c5c-59ef778fb958";
      await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, providers);
      await onClickedListener(info, tab);
      const targetURL = getProviderTargetURL(providers[0], info.selectionText);

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
      const subUrl = "https://192.168.1.10/investigation/2/navigate/query";

      await onClickedListener(info);
      expect(createTabs).toBeCalledWith({
        selected: true,
        url: expect.stringContaining(subUrl),
      });
    });

    it("Should open CBC item", async () => {
      const info = {
        parentMenuItemId: "carbonblack",
        menuItemId: "carbonblack-0",
        selectionText: "test",
      };
      const subUrl = "https://192.168.1.10/#/search/cb.urlver=1&q=test";

      await onClickedListener(info);
      expect(createTabs).toBeCalledWith({
        selected: true,
        url: expect.stringContaining(subUrl),
      });
    });

    it("Should open NWI item", async () => {
      const info = {
        parentMenuItemId: "netwitness-1",
        menuItemId: "netwitness-1_1",
        selectionText: "test",
      };
      const subUrl = "nw:///?collection=&where=%28ip.src%3Dtest";

      await onClickedListener(info);
      expect(createTabs).toBeCalledWith({
        url: expect.stringContaining(subUrl),
      });
    });
  });

  describe("Opening search result options", () => {
    it("Shouldn't focus new tab if resultsInBackgroundTab is true", async () => {
      const info = {
        menuItemId: "searchprovider-0",
        selectionText: "resultsInBackgroundTab",
      };
      const tab = {
        index: 10,
      };
      const settings = await LocalStore.getOne(StoreKey.SETTINGS);
      const providers = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
      const provider = _.find(providers, function (item) {
        return item.menuIndex === info.menuItemId;
      });
      const targetURL = getProviderTargetURL(provider, info.selectionText);

      // If shouldn't focus on new tab.
      await LocalStore.setOne(StoreKey.SETTINGS, {
        ...settings,
        resultsInBackgroundTab: true,
      });
      await onClickedListener(info, tab);
      expect(createTabs).toBeCalledWith({
        url: targetURL,
        selected: false,
        index: tab.index + 1,
      });
    });

    it("Should focus new tab if resultsInBackgroundTab is false", async () => {
      const info = {
        menuItemId: "searchprovider-0",
        selectionText: "resultsInBackgroundTab",
      };
      const tab = {
        index: 10,
      };
      const settings = await LocalStore.getOne(StoreKey.SETTINGS);
      const providers = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
      const provider = _.find(providers, function (item) {
        return item.menuIndex === info.menuItemId;
      });
      const targetURL = getProviderTargetURL(provider, info.selectionText);

      // If should focus on new tab.
      await LocalStore.setOne(StoreKey.SETTINGS, {
        ...settings,
        resultsInBackgroundTab: false,
      });
      await onClickedListener(info, tab);
      expect(createTabs).toBeCalledWith({
        url: targetURL,
        selected: true,
        index: tab.index + 1,
      });
    });

    it("Should open new tab next to current one if enableAdjacentTabs is true", async () => {
      const info = {
        menuItemId: "searchprovider-0",
        selectionText: "true_enableAdjacentTabs",
      };
      const tab = {
        index: 7,
      };
      const settings = await LocalStore.getOne(StoreKey.SETTINGS);
      const providers = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
      const provider = _.find(providers, function (item) {
        return item.menuIndex === info.menuItemId;
      });
      const targetURL = getProviderTargetURL(provider, info.selectionText);

      // If should open new tab next to current tab.
      await LocalStore.setOne(StoreKey.SETTINGS, {
        ...settings,
        enableAdjacentTabs: true,
      });
      await onClickedListener(info, tab);
      expect(createTabs).toBeCalledWith({
        url: targetURL,
        selected: !settings.resultsInBackgroundTab,
        index: tab.index + 1,
      });
    });

    it("Should open new tab next to last one if enableAdjacentTabs is false", async () => {
      const info = {
        menuItemId: "searchprovider-0",
        selectionText: "true_enableAdjacentTabs",
      };
      const tab = {
        index: 7,
      };
      const settings = await LocalStore.getOne(StoreKey.SETTINGS);
      const providers = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
      const provider = _.find(providers, function (item) {
        return item.menuIndex === info.menuItemId;
      });
      const targetURL = getProviderTargetURL(provider, info.selectionText);

      // If should open new tab next to last tab.
      await LocalStore.setOne(StoreKey.SETTINGS, {
        ...settings,
        enableAdjacentTabs: false,
      });
      await onClickedListener(info, tab);
      expect(createTabs).toBeCalledWith({
        url: targetURL,
        selected: !settings.resultsInBackgroundTab,
        index: null,
      });
    });

    it("Should open group providers in new window if openGroupsInNewWindow is true", async () => {
      const settings = await LocalStore.getOne(StoreKey.SETTINGS);
      const groupProviders = [
        {
          link: "https://stat.ripe.net/TESTSEARCH#tabId=at-a-glance",
          group: 8,
        },
        {
          link: "http://www.google.com/safebrowsing/diagnostic?site=TESTSEARCH",
          group: 8,
        },
      ];
      const info = {
        menuItemId: "group-3",
        selectionText: "test",
      };
      const tab = {
        index: 10,
      };
      const urls = _.map(groupProviders, function (provider) {
        return getProviderTargetURL(provider, info.selectionText);
      });

      // If should open in new window.
      await LocalStore.setOne(StoreKey.SETTINGS, {
        ...settings,
        openGroupsInNewWindow: true,
      });
      await onClickedListener(info, tab);
      expect(
        chrome.windows.create.withArgs({
          url: urls,
          focused: !settings.resultsInBackgroundTab,
        }).calledOnce
      ).toBe(true);
    });

    it("Should open group providers in current window if openGroupsInNewWindow is false", async () => {
      const settings = await LocalStore.getOne(StoreKey.SETTINGS);
      const groupProviders = [
        {
          link: "https://stat.ripe.net/TESTSEARCH#tabId=at-a-glance",
          group: 8,
        },
        {
          link: "http://www.google.com/safebrowsing/diagnostic?site=TESTSEARCH",
          group: 8,
        },
      ];
      const info = {
        menuItemId: "group-3",
        selectionText: "test",
      };
      const tab = {
        index: 10,
      };
      const urls = _.map(groupProviders, function (provider) {
        return getProviderTargetURL(provider, info.selectionText);
      });

      // If should open in current window
      await LocalStore.setOne(StoreKey.SETTINGS, {
        ...settings,
        openGroupsInNewWindow: false,
      });
      await onClickedListener(info, tab);
      expect(createTabs).toBeCalledWith({
        url: urls[0],
        selected: !settings.resultsInBackgroundTab,
        index: null,
      });
      expect(createTabs).toBeCalledWith({
        url: urls[1],
        selected: !settings.resultsInBackgroundTab,
        index: null,
      });
    });

    it("Should add item for Options to context menu if enableOptionsMenuItem is true", async () => {
      const settings = await LocalStore.getOne(StoreKey.SETTINGS);

      // If should add Options item.
      await LocalStore.setOne(StoreKey.SETTINGS, {
        ...settings,
        enableOptionsMenuItem: true,
      });
      await ContextualMenu.update();
      expect(createContextMenu).toHaveBeenLastCalledWith({
        id: MenuPreffix.OPTIONS,
        title: "Options",
        contexts: ["selection"],
      });
    });

    it("Shouldn't add item for Options to context menu if enableOptionsMenuItem is false", async () => {
      const settings = await LocalStore.getOne(StoreKey.SETTINGS);

      // If shouldn't add Options item.
      await LocalStore.setOne(StoreKey.SETTINGS, {
        ...settings,
        enableOptionsMenuItem: false,
      });
      await ContextualMenu.update();
      expect(createContextMenu).not.toHaveBeenLastCalledWith({
        id: MenuPreffix.OPTIONS,
        title: "Options",
        contexts: ["selection"],
      });
    });
  });
});
