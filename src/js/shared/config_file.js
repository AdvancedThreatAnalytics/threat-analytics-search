import _ from "lodash";

import { decryptAES } from "./encryption";
import { BasicConfig, StoreKey } from "./constants";
import LocalStore from "./local_store";

const ProvGroups = {
  NUMBER: 0,
  NAME: 1,
};

const ProvQuery = {
  MENU_INDEX: 0,
  LABEL: 1,
  QUERY: 2,
  ENABLED: 3,
};

const SearchProv = {
  MENU_INDEX: 0,
  LABEL: 1,
  LINK: 2,
  ENABLED: 3,
  FROM_CONFIG: 4,
  GROUP: 5,
  IS_POST: 6,
  POST_REQUEST: 7,
  PROXY_ENABLED: 8,
  PROXY_URL: 9,
};

const ConfigFile = {
  updateNow: async function () {
    var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
    var errMsg = null;

    try {
      // Execute request to get configuration file.
      var response = await fetch(settings.configurationURL);
      if (response.status >= 200 && response.status < 300) {
        var dataRaw = await response.text();
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
        var data = JSON.parse(dataRaw);
        await ConfigFile.parseJSONFile(data, false);
      } else {
        errMsg = "Update failed - Invalid URL";
      }
    } catch (fileErr) {
      console.error(fileErr);
      errMsg = "Update failed - Invalid File";
    }

    // Update timestamp and error message.
    await LocalStore.setOne(StoreKey.LAST_CONFIG_DATA, {
      date: new Date().getTime(),
      errorMsg: errMsg,
    });

    // Return success flag.
    return !errMsg;
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
        _.map(defaultFile.searchproviders, ConfigFile.parseProvider)
      );
    }

    // Sanitize special providers.
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
        data.queries = _.map(
          _.get(defaultFile, `${special.fileKey}.Queries`),
          ConfigFile.parseQuery
        );
      }
      LocalStore.setOne(special.storeKey, data);
    });
  },

  parseJSONFile: async function (newData, overrideConfig) {
    // Update main settings.
    var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};

    // - Update basic settings (if need).
    if (overrideConfig && !_.isEmpty(newData.config)) {
      _.assign(settings, ConfigFile.parseBasicSettings(newData.config));
    }

    // - Update group names in the local store (if need).
    var groups = newData.groups;
    if (settings.useGroups && !_.isEmpty(groups) && settings.mergeGroups) {
      if (_.isEmpty(settings.providersGroups)) {
        settings.providersGroups = ConfigFile.parseGroups(groups);
      } else {
        for (
          var k = 0;
          k < groups.length && k < settings.providersGroups.length;
          k++
        ) {
          if (groups[k]) {
            settings.providersGroups[k].name = groups[k][ProvGroups.NAME];
          }
        }
      }
    }

    // - Save settings in storage.
    await LocalStore.setOne(StoreKey.SETTINGS, settings);

    // Update search providers.
    // - Get menu items (with current search providers).
    var searchProviders =
      (await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS)) || [];

    var newProviders = _.map(newData.searchproviders, ConfigFile.parseProvider);

    // - Check if the new list of search providers are already included on the list of menu items.
    var mergeProviderOption = _.get(settings, "mergeSearchProviders", "merge");
    if (mergeProviderOption === "merge") {
      // merge new providers based on `link`
      for (var i = 0; i < newProviders.length; i++) {
        // Check if the search provider wasn't already included (and add it if not).
        if (
          !_.find(searchProviders, function (provider) {
            return provider.link === newProviders[i].link;
          })
        ) {
          searchProviders.push(newProviders[i]);
        }
      }
    } else if (mergeProviderOption === "override") {
      // override
      searchProviders = newProviders;
    }
    await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, searchProviders);

    // Update configuration values and queries for RSA, NWI and CBC.
    await ConfigFile.parseSpecialProvider(
      StoreKey.RSA_SECURITY,
      newData.RSA,
      "mergeRSA"
    );
    await ConfigFile.parseSpecialProvider(
      StoreKey.NET_WITNESS,
      newData.NWI,
      "mergeNWI"
    );
    await ConfigFile.parseSpecialProvider(
      StoreKey.CARBON_BLACK,
      newData.CBC,
      "mergeCBC"
    );
  },

  parseBasicSettings: function (configArray) {
    var config = _.get(configArray, "0");
    if (!_.isEmpty(config) && config.length >= 5) {
      return {
        configurationURL: config[BasicConfig.CONFIG_URL],
        useGroups:
          config[BasicConfig.USE_GROUPS] === true ||
          config[BasicConfig.USE_GROUPS] === "true",
        configEncrypted:
          config[BasicConfig.ENCRYPTED] === true ||
          config[BasicConfig.ENCRYPTED] === "true",
        configEncryptionKey: config[BasicConfig.ENCRIPTION_KEY] || null,
        autoUpdateConfig:
          config[BasicConfig.AUTO_UPDATE] === true ||
          config[BasicConfig.AUTO_UPDATE] === "true",

        resultsInBackgroundTab: true,
        enableAdjacentTabs: true,
        openGroupsInNewWindow: true,
        enableOptionsMenuItem: true,
      };
    }
    return {};
  },

  parseGroups: function (groupsArray) {
    if (_.isArray(groupsArray) && groupsArray.length >= 3) {
      return _.map(groupsArray, function (group, index) {
        return {
          name: _.get(group, "1"),
          enabled: index < 2,
        };
      });
    }
    return [];
  },

  parseSpecialProvider: async function (storeKey, newData, mergeKey) {
    var settings = await LocalStore.getOne(StoreKey.SETTINGS);
    var shouldOverrideConfig = _.get(settings, mergeKey + ".config", false);
    var queriesMergeOption = _.get(settings, mergeKey + ".queries", "merge");

    var provData = (await LocalStore.getOne(storeKey)) || {};

    if (shouldOverrideConfig) {
      provData.config = _.get(newData, "Config", {});
    }

    if (queriesMergeOption === "merge") {
      // merge based on `query`
      var newQueries = _.map(
        _.get(newData, "Queries", []),
        ConfigFile.parseQuery
      );

      for (var i = 0; i < newQueries.length; i++) {
        if (
          !_.find(provData.queries, function (data) {
            return data.query === newQueries[i].query;
          })
        ) {
          provData.queries.push(newQueries[i]);
        }
      }
    } else if (queriesMergeOption === "override") {
      // override
      provData.queries = _.map(
        _.get(newData, "Queries", []),
        ConfigFile.parseQuery
      );
    } else {
      // ignore
    }

    return LocalStore.setOne(storeKey, provData);
  },

  parseProvider: function (item) {
    return {
      menuIndex: item[SearchProv.MENU_INDEX],
      label: item[SearchProv.LABEL],
      link: item[SearchProv.LINK],
      enabled: item[SearchProv.ENABLED],
      fromConfig: item[SearchProv.FROM_CONFIG],
      group: item[SearchProv.GROUP],
      postEnabled: item[SearchProv.IS_POST],
      postValue: item[SearchProv.POST_REQUEST],
      proxyEnabled: item[SearchProv.PROXY_ENABLED],
      proxyUrl: item[SearchProv.PROXY_URL],
    };
  },

  parseProviderInverse: function (item) {
    var res = new Array(10);
    res[SearchProv.MENU_INDEX] = item.menuIndex;
    res[SearchProv.LABEL] = item.label;
    res[SearchProv.LINK] = item.link;
    res[SearchProv.ENABLED] = item.enabled;
    res[SearchProv.FROM_CONFIG] = item.fromConfig;
    res[SearchProv.GROUP] = item.group;
    res[SearchProv.IS_POST] = item.postEnabled;
    res[SearchProv.POST_REQUEST] = item.postValue;
    res[SearchProv.PROXY_ENABLED] = item.proxyEnabled;
    res[SearchProv.PROXY_URL] = item.proxyUrl;
    return res;
  },

  parseQuery: function (item) {
    return {
      menuIndex: item[ProvQuery.MENU_INDEX],
      label: item[ProvQuery.LABEL],
      query: item[ProvQuery.QUERY],
      enabled: item[ProvQuery.ENABLED],
    };
  },

  parseQueryInverse: function (item) {
    var res = new Array(4);
    res[ProvQuery.MENU_INDEX] = item.menuIndex;
    res[ProvQuery.LABEL] = item.label;
    res[ProvQuery.QUERY] = item.query;
    res[ProvQuery.ENABLED] = item.enabled;
    return res;
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

    var basicConfig = new Array(5);
    basicConfig[BasicConfig.CONFIG_URL] = settings.configurationURL;
    basicConfig[BasicConfig.USE_GROUPS] = settings.useGroups;
    basicConfig[BasicConfig.ENCRYPTED] = settings.configEncrypted;
    basicConfig[BasicConfig.ENCRIPTION_KEY] = settings.configEncryptionKey;
    basicConfig[BasicConfig.AUTO_UPDATE] = settings.autoUpdateConfig;

    return {
      searchproviders: _.map(providers, ConfigFile.parseProviderInverse),

      groups: [
        ["1", settings.providersGroups[0].name],
        ["2", settings.providersGroups[1].name],
        ["3", settings.providersGroups[2].name],
      ],

      config: [basicConfig],

      RSA: {
        Config: rsa.config,
        Queries: _.map(rsa.queries, ConfigFile.parseQueryInverse),
      },
      NWI: {
        Config: nwi.config,
        Queries: _.map(nwi.queries, ConfigFile.parseQueryInverse),
      },
      CBC: {
        Config: cbc.config,
        Queries: _.map(cbc.queries, ConfigFile.parseQueryInverse),
      },
    };
  },
};

export default ConfigFile;
