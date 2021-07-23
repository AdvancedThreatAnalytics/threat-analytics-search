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
    const carbonBlack = (await LocalStore.getOne(StoreKey.CARBON_BLACK)) || {};
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
