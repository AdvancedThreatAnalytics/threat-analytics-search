const _ = require("lodash");

require("./util");

const ConfigFile = require("../../src/js/shared/config_file");
const LocalStore = require("../../src/js/shared/local_store").default;
const { StoreKey } = require("../../src/js/shared/constants");
const { ContextualMenu, MenuPreffix } = require("../../src/background");
const { getGroupProviders } = require("../../src/js/shared/misc");

const createContextMenu = jest.spyOn(chrome.contextMenus, "create");

describe("ContextualMenu", () => {
  beforeAll(async () => {
    await ConfigFile.default.sanitizeSettings();
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
    // Get search providers
    const searchProviders =
      (await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS)) || [];

    // Call update
    await ContextualMenu.update();

    // Check if non-disabled providers are added
    searchProviders.forEach((provider, index) => {
      if (provider.enabled) {
        expect(createContextMenu).toBeCalledWith({
          id: MenuPreffix.PROVIDER + index,
          title: provider.label,
          contexts: ["selection"],
        });
      }
    });
  });

  it("One menu item should be added for each non-disabled special provider", async () => {
    const providers = [
      {
        storeKey: StoreKey.CARBON_BLACK,
        enableKey: "CBCConfigEnable",
      },
      {
        storeKey: StoreKey.NET_WITNESS,
        enableKey: "NWIConfigEnable",
      },
      {
        storeKey: StoreKey.RSA_SECURITY,
        enableKey: "RSAConfigEnable",
      },
    ];

    // Call update
    await ContextualMenu.update();

    // Check if the provider's menu items are added (if enabled).
    for (const provider of providers) {
      const settings = await LocalStore.getOne(provider.storeKey);
      const config = _.get(settings, "config", {});
      const queries = _.get(settings, "queries", []);

      if (config[provider.enableKey]) {
        expect(createContextMenu).toBeCalledWith(
          expect.objectContaining({
            title: "Carbon Black",
            contexts: ["selection"],
          })
        );

        // Check if non-disabled query items are added
        for (const index in queries) {
          const query = queries[index];
          if (query.enabled !== false && query.enabled !== "false") {
            expect(createContextMenu).toBeCalledWith(
              expect.objectContaining({
                title: query.label,
                contexts: ["selection"],
              })
            );
          }
        }
      }
    }
  });
});
