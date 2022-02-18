// Load dependencies.
import _ from "lodash";
import { DateTime } from "luxon";

import {
  MiscURLs,
  StoreKey,
  NWI_RANGE_LENGTH,
  RSA_RANGE_LENGTH,
} from "./js/shared/constants";
import { getGroupProviders, getProviderTargetURL } from "./js/shared/misc";
import ConfigFile from "./js/shared/config_file";
import LocalStore from "./js/shared/local_store";

// Install handler.
chrome.runtime.onInstalled.addListener(installedListener);

export async function installedListener(details) {
  // Check if migration script should be run.
  var previous = _.get(details, "previousVersion");

  if (!_.isEmpty(previous) && previous.split(".")[0] === "4") {
    // Open migration screen.
    chrome.tabs.create({
      url: "migration.html?previous=" + previous,
      selected: true,
    });
  } else {
    // Sanitize settings with default values.
    await ConfigFile.sanitizeSettings();

    // If the user is installing for the first time, open welcome screen and update settings with newer values.
    if (_.get(details, "reason") === "install") {
      chrome.tabs.create({
        url: MiscURLs.INSTALLED_URL,
        selected: true,
      });

      await ConfigFile.updateNow();
    }

    // Update contextual menu.
    ContextualMenu.update();
  }
}

// Startup handler.
chrome.runtime.onStartup.addListener(function () {
  // Update contextual menu.
  ContextualMenu.update();
});

// Every week check if the settings must be refreshed.
chrome.alarms.create({
  periodInMinutes: 10080,
});
chrome.alarms.onAlarm.addListener(alarmListener);

export async function alarmListener() {
  var settings = await LocalStore.getOne(StoreKey.SETTINGS);
  if (settings.autoUpdateConfig) {
    await ConfigFile.updateNow();
    ContextualMenu.update();
  }
}

// Messages handler.
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (_.get(request, "action") === "updateContextualMenu") {
    ContextualMenu.update();
    sendResponse({ success: true });
  }
});

// Context menu handler.
chrome.contextMenus.onClicked.addListener(onClickedListener);

export async function onClickedListener(info, tab) {
  if (info.menuItemId.indexOf(MenuPreffix.GROUP) === 0) {
    await ContextualMenu.groupClicked(info, tab);
  }

  if (info.menuItemId.indexOf(MenuPreffix.PROVIDER) === 0) {
    await ContextualMenu.providerClicked(info, tab);
  }

  if (info.menuItemId.indexOf(MenuPreffix.CARBON_BLACK) === 0) {
    await ContextualMenu.carbonBlackClicked(info, tab);
  }

  if (info.menuItemId.indexOf(MenuPreffix.NET_WITNESS) === 0) {
    await ContextualMenu.netWitnessClicked(info, tab);
  }

  if (info.menuItemId.indexOf(MenuPreffix.RSA_SECURITY) === 0) {
    await ContextualMenu.rsaSecurityClicked(info, tab);
  }

  if (info.menuItemId === MenuPreffix.OPTIONS) {
    await chrome.runtime.openOptionsPage();
  }
}

// --- Contextual menu --- //

export var MenuPreffix = {
  CARBON_BLACK: "carbonblack-",
  GROUP: "group-",
  NET_WITNESS: "netwitness-",
  OPTIONS: "optionspage",
  PARENT: "parent-",
  PROVIDER: "searchprovider-",
  RSA_SECURITY: "rsasecurity-",
  SEPARATOR: "separator-",
};

function createContextMenu(item) {
  if (!_.isEmpty(item.title)) {
    return chrome.contextMenus.create(item);
  }
}

export var ContextualMenu = {
  // --- Update menu --- //

  _addSeparator: function () {
    chrome.contextMenus.create({
      id: _.uniqueId(MenuPreffix.SEPARATOR),
      type: "separator",
      contexts: ["selection"],
    });
  },

  _addCarbonBlack: async function () {
    var data = await LocalStore.getOne(StoreKey.CARBON_BLACK);
    var config = _.get(data, "config", {});
    var queries = _.get(data, "queries", []);

    // Create the CBC menu (if enabled).
    if (config.CBCConfigEnable) {
      var parentMenu = createContextMenu({
        id: _.uniqueId(MenuPreffix.PARENT),
        title: "Carbon Black",
        contexts: ["selection"],
      });

      // Create entries for queries.
      _.forEach(queries, function (query, index) {
        if (query.enabled !== false && query.enabled !== "false") {
          query.menuIndex = createContextMenu({
            id: MenuPreffix.CARBON_BLACK + index,
            title: query.label,
            contexts: ["selection"],
            parentId: parentMenu,
          });
        }
      });

      ContextualMenu._addSeparator();

      // Update queries (which now have the menu indexes) on the local store.
      data.queries = queries;
      await LocalStore.setOne(StoreKey.CARBON_BLACK, data);
    }
  },

  _addNetWitness: async function () {
    var data = await LocalStore.getOne(StoreKey.NET_WITNESS);
    var config = _.get(data, "config", {});
    var queries = _.get(data, "queries", []);

    // Create the NWI menu (if enabled)
    if (config.NWIConfigEnable) {
      var parentMenu = createContextMenu({
        id: _.uniqueId(MenuPreffix.PARENT),
        title: "NetWitness Investigator",
        contexts: ["selection"],
      });

      // Create entries for queries.
      _.forEach(queries, function (query, index) {
        if (query.enabled !== false && query.enabled !== "false") {
          query.menuIndex = createContextMenu({
            id: MenuPreffix.NET_WITNESS + index,
            title: query.label,
            contexts: ["selection"],
            parentId: parentMenu,
          });

          // Create range entries.
          for (var k = 1; k <= NWI_RANGE_LENGTH; k++) {
            createContextMenu({
              id: query.menuIndex + "_" + k,
              title: config["NWIConfigRange" + k] + " Hour(s)",
              contexts: ["selection"],
              parentId: query.menuIndex,
            });
          }
        }
      });

      ContextualMenu._addSeparator();

      // Update queries (which now have the menu indexes) on the local store.
      data.queries = queries;
      await LocalStore.setOne(StoreKey.NET_WITNESS, data);
    }
  },

  _addRSASecurity: async function () {
    var data = await LocalStore.getOne(StoreKey.RSA_SECURITY);
    var config = _.get(data, "config", {});
    var queries = _.get(data, "queries", []);

    // Create the RSA menu (if enabled)
    if (config.RSAConfigEnable) {
      var parentMenu = createContextMenu({
        id: _.uniqueId(MenuPreffix.PARENT),
        title: "RSA Security Analytics",
        contexts: ["selection"],
      });

      // Create entries for queries.
      _.forEach(queries, function (query, index) {
        if (query.enabled !== false && query.enabled !== "false") {
          query.menuIndex = createContextMenu({
            id: MenuPreffix.RSA_SECURITY + index,
            title: query.label,
            contexts: ["selection"],
            parentId: parentMenu,
          });

          // Create range entries.
          for (var k = 1; k <= RSA_RANGE_LENGTH; k++) {
            createContextMenu({
              id: query.menuIndex + "_" + k,
              title: config["RSAConfigRange" + k] + " Hour(s)",
              contexts: ["selection"],
              parentId: query.menuIndex,
            });
          }
        }
      });

      ContextualMenu._addSeparator();

      // Update queries (which now have the menu indexes) on the local store.
      data.queries = queries;
      await LocalStore.setOne(StoreKey.RSA_SECURITY, data);
    }
  },

  update: async function () {
    // Clear contextual menu.
    chrome.contextMenus.removeAll();

    // Get current settings and list of search providers.
    var searchProviders =
      (await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS)) || [];
    var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};

    // Add entries for special search providers.
    await ContextualMenu._addCarbonBlack();
    await ContextualMenu._addNetWitness();
    await ContextualMenu._addRSASecurity();

    // Add entries for groups (if enabled).
    if (settings.useGroups) {
      var addSeparatorAfterGroups = false;

      // Iterate each group.
      _.forEach(settings.providersGroups, function (group, index) {
        // Check if the group is enabled and has items.
        if (
          group.enabled &&
          getGroupProviders(index, searchProviders).length > 0
        ) {
          // Add entry to contextual menu.
          createContextMenu({
            id: MenuPreffix.GROUP + index,
            title: group.name,
            contexts: ["selection"],
          });

          addSeparatorAfterGroups = true;
        }
      });

      // Add separator (if need).
      if (addSeparatorAfterGroups) {
        ContextualMenu._addSeparator();
      }
    }

    // Add entries for standard seach providers.
    _.forEach(searchProviders, function (provider, index) {
      if (provider.enabled) {
        provider.menuIndex = createContextMenu({
          id: MenuPreffix.PROVIDER + index,
          title: provider.label,
          contexts: ["selection"],
        });
      } else {
        provider.menuIndex = -1;
      }
    });

    // Update search providers (which now have the menu indexes) on the local store.
    await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, searchProviders);

    // Add entry for options page (if enabled).
    if (settings.enableOptionsMenuItem) {
      ContextualMenu._addSeparator();

      createContextMenu({
        id: MenuPreffix.OPTIONS,
        title: "Options",
        contexts: ["selection"],
      });
    }
  },

  // --- Click handlers --- //

  providerClicked: async function (info, tab) {
    var providers = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
    var provider = _.find(providers, function (item) {
      return item.menuIndex === info.menuItemId;
    });

    if (provider) {
      var targetURL = getProviderTargetURL(provider, info.selectionText);
      var settings = await LocalStore.getOne(StoreKey.SETTINGS);

      var index = settings.enableAdjacentTabs ? tab.index + 1 : null;

      chrome.tabs.create({
        url: targetURL,
        selected: !settings.resultsInBackgroundTab,
        index: index,
      });
    }
  },

  groupClicked: async function (info, tab) {
    var settings = await LocalStore.getOne(StoreKey.SETTINGS);
    var providers = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);

    var groupIndex = parseInt(info.menuItemId.split("-")[1], 10);
    var groupItems = getGroupProviders(groupIndex, providers);
    var urls = _.map(groupItems, function (provider) {
      return getProviderTargetURL(provider, info.selectionText);
    });

    if (settings.openGroupsInNewWindow) {
      chrome.windows.create({
        url: urls,
        focused: !settings.resultsInBackgroundTab,
      });
    } else {
      var index = tab.index;
      for (var i = 0; i < urls.length; i++) {
        chrome.tabs.create({
          url: urls[i],
          selected: !settings.resultsInBackgroundTab,
          index: settings.enableAdjacentTabs ? ++index : null,
        });
      }
    }
  },

  carbonBlackClicked: async function (info) {
    var data = await LocalStore.getOne(StoreKey.CARBON_BLACK);
    var config = _.get(data, "config", {});
    var queries = _.get(data, "queries", []);

    var queryItem = _.find(queries, function (item) {
      return item.menuIndex === info.menuItemId;
    });
    if (queryItem) {
      var query = queryItem.query.replace(/TESTSEARCH/g, info.selectionText);
      query = query.replace(/%s/g, info.selectionText);
      query = encodeURI(query);

      var port = config.CBCConfigPort ? ":" + config.CBCConfigPort : "";
      var urlVersion = config.CBCConfigURLVersion || 1;
      var protocol = config.CBCConfigUseHttps ? "https://" : "http://";

      var url =
        protocol +
        config.CBCConfigHost +
        port +
        "/#/search/cb.urlver=" +
        urlVersion +
        "&" +
        query +
        "&sort=start%20desc&rows=10&start=0";

      if (config.CBCConfigPopup) {
        showPopupMessage("Carbon Black", url);
      }

      chrome.tabs.create({
        url: url,
        selected: config.CBCConfigNewTab,
      });
    }
  },

  netWitnessClicked: async function (info) {
    var data = await LocalStore.getOne(StoreKey.NET_WITNESS);
    var config = _.get(data, "config", {});
    var queries = _.get(data, "queries", []);

    var queryItem = _.find(queries, function (item) {
      return item.menuIndex === info.parentMenuItemId;
    });
    if (queryItem) {
      var rangeNumber = parseInt(info.menuItemId.split("_")[1], 10);
      var hours = parseInt(config["NWIConfigRange" + rangeNumber], 10);

      // Build query.
      var port = config.NWIConfigPort ? ":" + config.NWIConfigPort : "";
      var useGMT = config.NWIConfigGMT;
      var historyString = escape(
        "collection=" + config.NWIConfigCollectionName
      );

      var query = queryItem.query.replace(/TESTSEARCH/g, info.selectionText);
      query = query.replace(/%s/g, info.selectionText);

      var queryName =
        "Critical+Start+Drill+" +
        escape('"') +
        encodeURIComponent(query) +
        escape('"');
      query = escape("(") + encodeURIComponent(query) + escape(")");

      // Set start and end date.
      var endDate = DateTime.now();
      var startDate = endDate.minus(hours * 60 * 60 * 1000);
      if (useGMT) {
        endDate = endDate.setZone("UTC");
        startDate = startDate.setZone("UTC");
      }

      // Escape all special characters, except for the "+" sign.
      var NWI_DATETIME_FORMAT = "yyyy-LLL-dd+hh:mm a";
      var timeString = encodeURIComponent(
        startDate.toFormat(NWI_DATETIME_FORMAT) +
          "++to++" +
          endDate.toFormat(NWI_DATETIME_FORMAT)
      ).replace(/%2B/g, "+");

      // Build URL.
      var url =
        "nw://" +
        config.NWIConfigHost +
        port +
        "/?collection=" +
        config.NWIConfigCollectionName +
        "&where=" +
        query +
        "&time=" +
        timeString +
        "&name=" +
        queryName +
        "&history=" +
        historyString;

      // Show popup message (if need) and open tab.
      if (config.NWIConfigPopup) {
        showPopupMessage("NetWitness Investigator", url);
      }

      chrome.tabs.create({
        url: url,
      });
    }
  },

  rsaSecurityClicked: async function (info) {
    var data = await LocalStore.getOne(StoreKey.RSA_SECURITY);
    var config = _.get(data, "config", {});
    var queries = _.get(data, "queries", []);

    var queryItem = _.find(queries, function (item) {
      return item.menuIndex === info.parentMenuItemId;
    });
    if (queryItem) {
      var rangeNumber = parseInt(info.menuItemId.split("_")[1], 10);
      var hours = parseInt(config["RSAConfigRange" + rangeNumber], 10);

      // Build URL.
      var query = queryItem.query.replace(/TESTSEARCH/g, info.selectionText);
      query = query.replace(/%s/g, info.selectionText);
      query = encodeURIComponent(query);

      var port = config.RSAConfigPort ? ":" + config.RSAConfigPort : "";

      var endDate = new Date();
      var startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);

      var protocol = config.RSAConfigUseHttps ? "https://" : "http://";
      var url =
        protocol +
        config.RSAConfigHost +
        port +
        "/investigation/" +
        config.RSAConfigDevId +
        "/navigate/query/" +
        query +
        "/date/" +
        startDate.toISOString().replace(/\.\d+Z$/, "Z") +
        "/" +
        endDate.toISOString().replace(/\.\d+Z$/, "Z");

      // Show popup (if need) and open tab.
      if (config.RSAConfigPopup) {
        showPopupMessage("RSA Security Analytics", url);
      }

      chrome.tabs.create({
        url: url,
        selected: config.RSAConfigNewTab,
      });
    }
  },
};

function showPopupMessage(title, message) {
  // Wrap with a try-catch since this method throws an error for Chrome v90 or less.
  try {
    chrome.notifications.create("", {
      title: title,
      message: message,
      iconUrl: "/images/icon_48.png",
      type: "basic",
    });
  } catch (err) {
    // Do nothing.
  }
}

export default { installedListener, onClickedListener };
