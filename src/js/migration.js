import "@fortawesome/fontawesome-free/css/all.min.css";
import "../styles/theme.scss";

import _ from "lodash";

import { StoreKey } from "./shared/constants";
import { isDate } from "./shared/misc";
import ConfigFile from "./shared/config_file";
import LocalStore from "./shared/local_store";
import Storage from "./shared/storage";

/**
 * This script is run when updating the extension from version 4.x.x to version 5.0.0 (or higher) and
 * his main tasks is to relocate the user's settings saved from the local storage (i.e. "localStorage")
 * to the Chrome's storage (i.e. "chrome.storage.local").
 *
 * The need for this change is because starting from version 5.0.0 the extension uses Manifest v3
 * which don't longer supports background pages, and instead uses services workers (and since service
 * workers don't has access to the local storage, we must move all data saved there into Chrome's
 * storage which can be accessed by both service workers and standard scripts).
 */

// These URLs are deprecated, default settings should be read from the GitHub repository.
var OBSOLETES_CONFIG_URL = [
  "http://www.criticalstart.com/cschromeplugin/criticalstart.txt",
  "https://www.criticalstart.com/wp-content/uploads/2018/02/criticalstart.txt",
];

// Wait for the page to be loaded to execute the initialization function.
document.addEventListener("DOMContentLoaded", async function () {
  // Get default settings.
  const defaultFile = await ConfigFile.getDefaultJSON();

  // Migrate data.
  await Promise.all([
    migrateGeneralSettings(defaultFile),
    migrateSearchProviders(defaultFile),
    migrateSpecialProvider(
      StoreKey.CARBON_BLACK,
      "CBC",
      "_CBCConfig",
      "_CBCallquery",
      defaultFile
    ),
    migrateSpecialProvider(
      StoreKey.NET_WITNESS,
      "NWI",
      "_NWIConfig",
      "_NWIallquery",
      defaultFile
    ),
    migrateSpecialProvider(
      StoreKey.RSA_SECURITY,
      "RSA",
      "_RSAConfig",
      "_RSAallquery",
      defaultFile
    ),
    migrateOthers(),
  ]);

  // Update contextual menu.
  chrome.runtime.sendMessage({ action: "updateContextualMenu" });

  // Close current tab.
  chrome.tabs.getCurrent(function (tab) {
    chrome.tabs.remove(tab.id);
  });
});

function migrateGeneralSettings(defaultFile) {
  const defaultBasic = ConfigFile.parseBasicSettings(defaultFile.config);
  const defaultGroups = ConfigFile.parseGroups(defaultFile.groups);

  // If previous URL is empty or has a deprecated value change it to default.
  let configUrl = Storage.getItem("_configUrl");
  if (_.isEmpty(configUrl) || OBSOLETES_CONFIG_URL.indexOf(configUrl) >= 0) {
    configUrl = defaultBasic.configurationURL;
  }

  const useGroups =
    Storage.getItem("_configUseGroups") === "true" ||
    _.get(defaultBasic, "useGroups", false);

  return LocalStore.setOne(StoreKey.SETTINGS, {
    configurationURL: configUrl,
    useGroups: useGroups,
    configEncrypted: Storage.getItem("_configEnc") === "true",
    configEncryptionKey: Storage.getItem("_configEncKey") || null,
    autoUpdateConfig:
      Storage.getItem("_configAutoRefresh") === "true" ||
      _.get(defaultBasic, "autoUpdateConfig", false),

    providersGroups: [
      {
        name: Storage.getItem("_group1Name") || _.get(defaultGroups, "0.name"),
        enabled: true,
      },
      {
        name: Storage.getItem("_group2Name") || _.get(defaultGroups, "1.name"),
        enabled: true,
      },
      {
        name: Storage.getItem("_group3Name") || _.get(defaultGroups, "2.name"),
        enabled: Storage.getItem("_enableGroup3") == "true",
      },
    ],

    // Note that these options aren't defined by configuration files.
    resultsInBackgroundTab: Storage.getItem("_askbg") !== "false",
    enableAdjacentTabs: Storage.getItem("_asknext") !== "false",
    openGroupsInNewWindow: Storage.getItem("_asknewwindow") !== "false",
    enableOptionsMenuItem: Storage.getItem("_askoptions") !== "false",

    mergeGroups: useGroups,
    mergeSearchProviders: "merge",
    mergeCBC: { config: false, queries: "merge" },
    mergeNWI: { config: false, queries: "merge" },
    mergeRSA: { config: false, queries: "merge" },
  });
}

function migrateSearchProviders(defaultFile) {
  return LocalStore.setOne(
    StoreKey.SEARCH_PROVIDERS,
    ConfigFile.parseProviders(
      tryJSONparse(Storage.getItem("_allsearch")) ||
        _.get(defaultFile, "searchproviders", [])
    )
  );
}

function migrateSpecialProvider(
  storeKey,
  fileKey,
  configKey,
  queryKey,
  defaultFile
) {
  return LocalStore.setOne(storeKey, {
    config:
      tryJSONparse(Storage.getItem(configKey)) ||
      _.get(defaultFile, `${fileKey}.Config`, {}),
    queries: ConfigFile.parseQueries(
      tryJSONparse(Storage.getItem(queryKey)) ||
        _.get(defaultFile, `${fileKey}.Queries`, [])
    ),
  });
}

function migrateOthers() {
  return LocalStore.setOne(
    StoreKey.LAST_CONFIG_DATA,
    parseLastRefresh(Storage.getItem("_configLastRefresh"))
  );
}

function parseLastRefresh(item) {
  let error, date;

  if (!_.isNil(item) && isDate(item)) {
    date = new Date(item).getTime();
  } else {
    error = item;
  }

  return {
    date: date,
    errorMsg: error,
  };
}

function tryJSONparse(string) {
  var res;
  try {
    res = JSON.parse(string);
  } catch (err) {
    res = null;
  }
  return res;
}
