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
    beforeAll(async () => {
      await ConfigFile.sanitizeSettings();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it("Groups should be added if 'useGroups' is enabled", async () => {
      // Get and enable groups.
      const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      settings.useGroups = true;
      await LocalStore.setOne(StoreKey.SETTINGS, settings);

      // Update contextual menu.
      await ContextualMenu.update();

      // Check if non-disabled groups are added.
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
      const searchProviders =
        (await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS)) || [];

      // Ensure that there is at least one provider enabled and one disabled.
      if (searchProviders.length >= 2) {
        searchProviders[0].enabled = true;
        searchProviders[1].enabled = false;
      }

      // Set search providers.
      await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, searchProviders);

      // Update contextual menu.
      await ContextualMenu.update();

      // Check if only non-disabled providers are added.
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
      const carbonBlack =
        (await LocalStore.getOne(StoreKey.CARBON_BLACK)) || {};
      carbonBlack.CBCConfigEnable = false;
      await LocalStore.setOne(StoreKey.CARBON_BLACK, carbonBlack);
      const netWitness = (await LocalStore.getOne(StoreKey.NET_WITNESS)) || {};
      netWitness.NWIConfigEnable = true;
      if (netWitness.queries.length >= 2) {
        netWitness.queries[0].enabled = false;
        netWitness.queries[1].enabled = true;
      }
      await LocalStore.setOne(StoreKey.NET_WITNESS, netWitness);

      // Update contextual menu.
      await ContextualMenu.update();

      // Check if only non-disabled providers are added.
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

        // Check if only non-disabled query items from non-disabled providers are added.
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
      let rsa = await LocalStore.getOne(StoreKey.RSA_SECURITY);
      let nwi = await LocalStore.getOne(StoreKey.NET_WITNESS);
      let cbc = await LocalStore.getOne(StoreKey.CARBON_BLACK);
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
});
