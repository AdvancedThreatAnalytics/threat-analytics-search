import _ from "lodash";

import { decryptAES } from "./encryption";
import { StoreKey } from "./constants";
import LocalStore from "./local_store";
import { isUrl } from "./misc";

// --- Constants --- //

const CONFIG_MAPPING = [
  { index: 0, field: "configurationURL" },
  { index: 1, field: "useGroups", type: "bool" },
  { index: 2, field: "configEncrypted", type: "bool" },
  { index: 3, field: "configEncryptionKey" },
  { index: 4, field: "autoUpdateConfig", type: "bool" },
];

const GROUP_INDEXES = {
  number: 0,
  name: 1,
};

const QUERY_MAPPING = [
  { index: 0, field: "menuIndex" },
  { index: 1, field: "label" },
  { index: 2, field: "query" },
  { index: 3, field: "enabled", type: "bool" },
];

const PROVIDER_MAPPING = [
  { index: 0, field: "menuIndex" },
  { index: 1, field: "label" },
  { index: 2, field: "link" },
  { index: 3, field: "enabled", type: "bool" },
  { index: 4, field: "fromConfig", type: "bool" },
  { index: 5, field: "group" },
  { index: 6, field: "postEnabled", type: "bool" },
  { index: 7, field: "postValue" },
  { index: 8, field: "proxyEnabled", type: "bool" },
  { index: 9, field: "proxyUrl" },
];

// --- Utility functions --- //

function mapArrayToObject(array, mapping) {
  return _.mapValues(_.keyBy(mapping, "field"), (meta) => {
    const value = _.get(array, meta.index);
    return meta.type === "bool" ? value === true || value === "true" : value;
  });
}

function mapObjectToArray(object, mapping) {
  // NOTE: this method assumes that for all items in mapping: "mapping.indexOf(item) === item.index".
  return _.map(mapping, (meta) => _.get(object, meta.field));
}

async function updateSearchProviders(
  settings,
  newProviders,
  updateActions,
  forceOverride
) {
  // Get menu items (with current search providers).
  let searchProviders =
    (await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS)) || [];

  // Execute update actions.
  _.each(updateActions, (action) => {
    _.each(searchProviders, (provider) => {
      if (action.target.indexOf(provider.link) >= 0) {
        if (action.link) {
          provider.link = action.link;
        }
        if (action.label) {
          provider.label = action.label;
        }
      }
    });
  });

  // Check if the new list of search providers should be merged or should override current values.
  const mergeProviderOption = forceOverride
    ? "override"
    : _.get(settings, "mergeSearchProviders", "merge");

  if (mergeProviderOption === "override") {
    searchProviders = newProviders;
  } else if (mergeProviderOption === "merge") {
    for (let i = 0; i < newProviders.length; i++) {
      const newProvider = newProviders[i];

      // Add provider if isn't on the current list.
      if (
        !_.find(
          searchProviders,
          (provider) => provider.link === newProvider.link
        )
      ) {
        searchProviders.push(newProvider);
      }
    }
  }

  // Save list of search providers.
  await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, searchProviders);
}

// --- Main functions --- //

const ConfigFile = {
  updateNow: async function () {
    const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
    let errMsg = null;

    const invalidUrl = !isUrl(settings.configurationURL);
    const missingKey =
      settings.configEncrypted && !settings.configEncryptionKey;

    if (invalidUrl || missingKey) {
      errMsg = `Update failed - Invalid ${
        missingKey ? "Encryption Key" : "URL"
      }`;
    } else {
      try {
        // Execute request to get configuration file.
        const response = await fetch(settings.configurationURL);
        if (response.status >= 200 && response.status < 300) {
          let dataRaw = await response.text();
          dataRaw = dataRaw.replace(/\n\r|\r\n/g, "");

          // Check if the file should be decripted.
          if (settings.configEncrypted) {
            var k1 = settings.configEncryptionKey;
            try {
              dataRaw = decryptAES(dataRaw, k1);
            } catch (decErr) {
              console.error(decErr);
              errMsg = "Update failed - Decryption Error";
            }
          }

          // Parse data object.
          const data = JSON.parse(dataRaw);
          await ConfigFile.parseJSONFile(data, false);
        } else {
          errMsg = "Update failed - Invalid URL";
        }
      } catch (fileErr) {
        console.error(fileErr);
        errMsg = "Update failed - Invalid File";
      }
    }

    // Update timestamp and error message.
    await LocalStore.setOne(StoreKey.LAST_CONFIG_DATA, {
      date: new Date().getTime(),
      errorMsg: errMsg,
    });

    // Return success flag.
    return !errMsg;
  },

  updateSpecialProvider: async function (
    storeKey,
    newData,
    mergeKey,
    forceOverride
  ) {
    const settings = await LocalStore.getOne(StoreKey.SETTINGS);
    const shouldOverrideConfig =
      forceOverride || _.get(settings, mergeKey + ".config", false);
    const queriesMergeOption = forceOverride
      ? "override"
      : _.get(settings, mergeKey + ".queries", "merge");

    const provData = (await LocalStore.getOne(storeKey)) || {};

    // Override configuration (if need)
    if (shouldOverrideConfig || _.isNil(provData.config)) {
      provData.config = _.get(newData, "Config", {});
    }

    // Check if queries should be merged ,overriden or ignored.
    const newQueries = ConfigFile.parseQueries(_.get(newData, "Queries", []));
    if (queriesMergeOption === "merge") {
      if (!_.isArray(provData.queries)) {
        provData.queries = [];
      }

      for (let i = 0; i < newQueries.length; i++) {
        const newQuery = newQueries[i];

        // Update values from outdated queries.
        const aliases = _.get(newQuery, "metadata.alias");
        if (_.isArray(aliases)) {
          _.each(provData.queries, (item) => {
            if (aliases.indexOf(item.query) >= 0) {
              item.query = newQuery.query;
            }
          });
        }

        // Add query if isn't on the current list.
        if (
          !_.find(provData.queries, (item) => item.query === newQuery.query)
        ) {
          provData.queries.push(newQuery);
        }
      }
    } else if (queriesMergeOption === "override") {
      provData.queries = newQueries;
    }

    return LocalStore.setOne(storeKey, provData);
  },

  sanitizeSettings: async function () {
    var defaultFile = await ConfigFile.getDefaultJSON();

    // Sanitize basic settings and groups.
    var oldSettings = await LocalStore.getOne(StoreKey.SETTINGS);
    var newSettings = ConfigFile.parseBasicSettings(defaultFile.config);
    newSettings.providersGroups = ConfigFile.parseGroups(defaultFile.groups);
    if (_.isObject(oldSettings) && !_.isArray(oldSettings.providersGroups)) {
      delete oldSettings.providersGroups;
    }
    await LocalStore.setOne(
      StoreKey.SETTINGS,
      _.assign(newSettings, oldSettings)
    );

    // Sanitize search providers.
    var providers = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
    if (_.isEmpty(providers)) {
      await LocalStore.setOne(
        StoreKey.SEARCH_PROVIDERS,
        ConfigFile.parseProviders(defaultFile.searchproviders)
      );
    }

    await ConfigFile.sanitizeSpecialProviders();
  },

  sanitizeSpecialProviders: async function () {
    var defaultFile = await ConfigFile.getDefaultJSON();

    var specialProviders = [
      { storeKey: StoreKey.CARBON_BLACK, fileKey: "CBC" },
      { storeKey: StoreKey.NET_WITNESS, fileKey: "NWI" },
      { storeKey: StoreKey.RSA_SECURITY, fileKey: "RSA" },
    ];
    _.forEach(specialProviders, async function (special) {
      var data = (await LocalStore.getOne(special.storeKey)) || {};
      if (!_.isObject(data.config)) {
        data.config = _.get(defaultFile, `${special.fileKey}.Config`) || {};
      }
      if (!_.isArray(data.queries)) {
        data.queries = ConfigFile.parseQueries(
          _.get(defaultFile, `${special.fileKey}.Queries`)
        );
      }
      LocalStore.setOne(special.storeKey, data);
    });
  },

  parseJSONFile: async function (newData, overrideAll) {
    // Update main settings.
    const settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};

    // - Update basic settings (if need).
    if (overrideAll && !_.isEmpty(newData.config)) {
      _.assign(settings, ConfigFile.parseBasicSettings(newData.config));
    }

    // - Update group names in the local store (if need).
    const groups = newData.groups;
    if ((overrideAll || settings.mergeGroups) && !_.isEmpty(groups)) {
      if (
        (overrideAll && groups.length >= 3) ||
        _.isEmpty(settings.providersGroups)
      ) {
        settings.providersGroups = ConfigFile.parseGroups(groups);
      } else {
        for (let k = 0; k < settings.providersGroups.length; k++) {
          if (groups[k]) {
            settings.providersGroups[k].name = groups[k][GROUP_INDEXES.name];
          } else if (k < 3) {
            settings.providersGroups[k].enabled = false;
          } else {
            settings.providersGroups.splice(
              3,
              settings.providersGroups.length - 3
            );
          }
        }
      }
    }

    // - Save settings in storage.
    await LocalStore.setOne(StoreKey.SETTINGS, settings);

    // Update search providers.
    const newProviders = ConfigFile.parseProviders(newData.searchproviders);
    await updateSearchProviders(
      settings,
      newProviders,
      _.get(newData, "update.providers"),
      overrideAll
    );

    // Update configuration values and queries for RSA, NWI and CBC.
    await ConfigFile.updateSpecialProvider(
      StoreKey.RSA_SECURITY,
      newData.RSA,
      "mergeRSA",
      overrideAll
    );
    await ConfigFile.updateSpecialProvider(
      StoreKey.NET_WITNESS,
      newData.NWI,
      "mergeNWI",
      overrideAll
    );
    await ConfigFile.updateSpecialProvider(
      StoreKey.CARBON_BLACK,
      newData.CBC,
      "mergeCBC",
      overrideAll
    );
  },

  parseBasicSettings: function (settingsRaw) {
    const settingsArray = _.get(settingsRaw, 0, []);
    const settingsObj = mapArrayToObject(settingsArray, CONFIG_MAPPING);

    return {
      ...settingsObj,

      resultsInBackgroundTab: true,
      enableAdjacentTabs: true,
      openGroupsInNewWindow: true,
      enableOptionsMenuItem: true,

      mergeGroups: settingsObj.useGroups,
      mergeSearchProviders: "merge",
      mergeCBC: { config: false, queries: "merge" },
      mergeNWI: { config: false, queries: "merge" },
      mergeRSA: { config: false, queries: "merge" },
    };
  },

  prepareBasicSettings: function (settings) {
    return [mapObjectToArray(settings, CONFIG_MAPPING)];
  },

  parseGroups: function (groupsArray) {
    if (_.isArray(groupsArray) && groupsArray.length >= 3) {
      return _.map(groupsArray, function (group, index) {
        return {
          name: _.get(group, GROUP_INDEXES.name),
          enabled: index < 2,
        };
      });
    }

    return [];
  },

  prepareGroups: function (groups) {
    return _.map([0, 1, 2], function (index) {
      const number = index + 1 + "";
      return [number, _.get(groups, `${index}.name`)];
    });
  },

  parseProviders: function (providers) {
    return _.map(providers, function (providerArray) {
      return mapArrayToObject(providerArray, PROVIDER_MAPPING);
    });
  },

  prepareProviders: function (providers) {
    return _.map(providers, function (providerObject) {
      return mapObjectToArray(providerObject, PROVIDER_MAPPING);
    });
  },

  parseQueries: function (queries) {
    return _.map(queries, function (queryArray) {
      return mapArrayToObject(queryArray, QUERY_MAPPING);
    });
  },

  prepareQueries: function (queries) {
    return _.map(queries, function (queryObject) {
      return mapObjectToArray(queryObject, QUERY_MAPPING);
    });
  },

  getDefaultJSON: async function () {
    try {
      var response = await fetch("../settings.json");
      return await response.json();
    } catch (err) {
      return {};
    }
  },

  generateJSONFile: async function () {
    var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
    var rsa = (await LocalStore.getOne(StoreKey.RSA_SECURITY)) || {};
    var nwi = (await LocalStore.getOne(StoreKey.NET_WITNESS)) || {};
    var cbc = (await LocalStore.getOne(StoreKey.CARBON_BLACK)) || {};
    var providers = (await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS)) || [];

    return {
      searchproviders: ConfigFile.prepareProviders(providers),
      groups: ConfigFile.prepareGroups(settings.providersGroups),
      config: ConfigFile.prepareBasicSettings(settings),

      RSA: {
        Config: rsa.config,
        Queries: ConfigFile.prepareQueries(rsa.queries),
      },
      NWI: {
        Config: nwi.config,
        Queries: ConfigFile.prepareQueries(nwi.queries),
      },
      CBC: {
        Config: cbc.config,
        Queries: ConfigFile.prepareQueries(cbc.queries),
      },
    };
  },
};

export default ConfigFile;
