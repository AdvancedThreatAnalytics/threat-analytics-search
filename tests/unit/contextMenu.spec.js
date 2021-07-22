const _ = require("lodash");

require("./util");

const ConfigFile = require("../../src/js/shared/config_file").default;
const LocalStore = require("../../src/js/shared/local_store").default;
const { StoreKey } = require("../../src/js/shared/constants");
const { ContextualMenu, MenuPreffix } = require("../../src/background");
const { getGroupProviders } = require("../../src/js/shared/misc");

const createContextMenu = jest.spyOn(chrome.contextMenus, "create");

describe("ContextualMenu", () => {
  beforeAll(async () => {
    await ConfigFile.sanitizeSettings();
  });

  it("Groups should be added if 'useGroups' is enabled", async () => {
    // Get and enable useGroups
    const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
    const searchProviders =
      (await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS)) || [];
    settings.useGroups = true;
    await LocalStore.setOne(StoreKey.SETTINGS, settings);

    // Call update
    await ContextualMenu.update();

    // Check if non-disabled groups are added
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
    const sampleData = [
      {
        menuIndex: "searchprovider-0",
        label: "Test 1",
        link: "http://www.test.com/?q=TESTSEARCH",
        enabled: true,
        fromConfig: true,
        group: 3,
        postEnabled: false,
        postValue: "",
        proxyEnabled: false,
        proxyUrl: "",
      },
      {
        menuIndex: "searchprovider-1",
        label: "Test 2",
        link: "http://www.test.com/?q=TESTSEARCH",
        enabled: false,
        fromConfig: true,
        group: 3,
        postEnabled: false,
        postValue: "",
        proxyEnabled: false,
        proxyUrl: "",
      },
    ];
    // Set search providers
    await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, sampleData);

    // Call update
    await ContextualMenu.update();

    // Check if only non-disabled providers are added
    sampleData.forEach((provider, index) => {
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
    const sampleData = {
      [StoreKey.CARBON_BLACK]: {
        config: {
          CBCConfigEnable: false,
          CBCConfigPopup: false,
          CBCConfigUseHttps: true,
          CBCConfigNewTab: true,
          CBCConfigHost: "192.168.1.10",
          CBCConfigPort: "",
          CBCConfigURLVersion: "1",
        },
        queries: [
          {
            menuIndex: -1,
            label: "Search All (Mostly Use This)",
            query: "q=TESTSEARCH",
            enabled: true,
          },
          {
            menuIndex: -1,
            label: "Domain Name (FQDN)",
            query: "cb.q.domain=TESTSEARCH",
            enabled: false,
          },
        ],
      },
      [StoreKey.NET_WITNESS]: {
        config: {
          NWIConfigEnable: true,
          NWIConfigPopup: false,
          NWIConfigGMT: false,
          NWIConfigHost: "",
          NWIConfigPort: "",
          NWIConfigCollectionName: "",
          NWIConfigRange1: "1",
          NWIConfigRange2: "24",
          NWIConfigRange3: "48",
          NWIConfigRange4: "720",
        },
        queries: [],
      },
      [StoreKey.RSA_SECURITY]: {
        config: {
          RSAConfigEnable: true,
          RSAConfigPopup: false,
          RSAConfigUseHttps: true,
          RSAConfigNewTab: true,
          RSAConfigHost: "192.168.1.10",
          RSAConfigPort: "",
          RSAConfigDevId: "2",
          RSAConfigRange1: "1",
          RSAConfigRange2: "24",
          RSAConfigRange3: "48",
          RSAConfigRange4: "720",
        },
        queries: [
          {
            menuIndex: -1,
            label: "Search Hostname",
            query: "alias.host='TESTSEARCH'",
            enabled: true,
          },
          {
            menuIndex: -1,
            label: "Search Source IP",
            query: "ip.src=TESTSEARCH",
            enabled: false,
          },
        ],
      },
    };

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

    // Set special providers
    for (const storeKey in sampleData) {
      await LocalStore.setOne(storeKey, sampleData[storeKey]);
    }

    // Call update
    await ContextualMenu.update();

    // Check if only non-disabled providers are added
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

      // Check if only non-disabled query items from non-disabled providers are added
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
