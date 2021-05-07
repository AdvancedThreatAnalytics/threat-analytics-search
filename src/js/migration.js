import "@fortawesome/fontawesome-free/css/all.min.css";
import "bootstrap/dist/css/bootstrap.min.css";

import _ from "lodash";

import {
  MiscURLs,
  StoreKey,
} from "./shared/constants";
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
  "https://www.criticalstart.com/wp-content/uploads/2018/02/criticalstart.txt"
];

// Wait for the page to be loaded to execute the initialization function.
document.addEventListener("DOMContentLoaded", async function() {
  // Get default settings.
  window.defaultFile = await ConfigFile.getDefaultJSON();

  // Migrate data.
  await Promise.all([
    migrateGeneralSettings(),
    migrateSearchProviders(),
    migrateSpecialProvider(StoreKey.CARBON_BLACK, "CBC", "_CBCConfig", "_CBCallquery"),
    migrateSpecialProvider(StoreKey.NET_WITNESS, "NWI", "_NWIConfig", "_NWIallquery"),
    migrateSpecialProvider(StoreKey.RSA_SECURITY, "RSA", "_RSAConfig", "_RSAallquery"),
    migrateOthers(),
  ]);

  // Update contextual menu.
  chrome.runtime.sendMessage({ action: "updateContextualMenu" });

  // Redirect to welcome URL.
  window.open(MiscURLs.INSTALLED_URL, "_self");
});

function migrateGeneralSettings() {
  var defaultBasic = ConfigFile.parseBasicSettings(defaultFile.config);
  var defaultGroups = ConfigFile.parseGroups(defaultFile.groups);

  // If previous URL is empty or has a deprecated value change it to default.
  var configUrl = Storage.getItem("_configUrl");
  if(_.isEmpty(configUrl) || OBSOLETES_CONFIG_URL.indexOf(configUrl) >= 0) {
    configUrl = defaultBasic.configurationURL;
  }

  return LocalStore.setOne(StoreKey.SETTINGS, {
    configurationURL: configUrl,
    useGroups: Storage.getItem("_configUseGroups") === "true" || _.get(defaultBasic, 'useGroups', false),
    configEncrypted: Storage.getItem("_configEnc") === "true",
    configEncryptionKey: Storage.getItem("_configEncKey") || null,
    autoUpdateConfig: Storage.getItem("_configAutoRefresh") === "true" || _.get(defaultBasic, 'autoUpdateConfig', false),

    providersGroups: [
      {
        name: Storage.getItem("_group1Name") || _.get(defaultGroups, '0.name'),
        enabled: true
      },
      {
        name: Storage.getItem("_group2Name") || _.get(defaultGroups, '1.name'),
        enabled: true
      },
      {
        name: Storage.getItem("_group3Name") || _.get(defaultGroups, '2.name'),
        enabled: Storage.getItem("_enableGroup3") == "true"
      },
    ],

    // Note that these options aren't defined by configuration files.
    resultsInBackgroundTab: Storage.getItem("_askbg") !== "false",
    enableAdjacentTabs: Storage.getItem("_asknext") !== "false",
    openGroupsInNewWindow: Storage.getItem("_asknewwindow") !== "false",
    enableOptionsMenuItem: Storage.getItem("_askoptions") !== "false"
  });
}

function migrateSearchProviders() {
  return LocalStore.setOne(
    StoreKey.SEARCH_PROVIDERS,
    _.map(
      tryJSONparse(Storage.getItem("_allsearch")) || _.get(defaultFile, 'searchproviders', []),
      ConfigFile.parseProvider
    )
  );
}

function migrateSpecialProvider(storeKey, fileKey, configKey, queryKey) {
  return LocalStore.setOne(storeKey, {
    config: tryJSONparse(Storage.getItem(configKey)) || _.get(defaultFile, `${fileKey}.Config`, {}),
    queries: _.map(
      tryJSONparse(Storage.getItem(queryKey)) || _.get(defaultFile, `${fileKey}.Queries`, []),
      ConfigFile.parseQuery
    )
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
  } catch(err) {
    res = null;
  }
  return res;
}