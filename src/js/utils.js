import _ from "lodash";
import Mustache from "mustache";
import Notiflix from "notiflix";
import { Sortable } from "sortablejs";

import { StoreKey } from "./shared/constants";
import LocalStore from "./shared/local_store";


// --- Configuration File --- //

export var ConfigFile = {
  updateNow: async function() {
    var settings = await LocalStore.getOne(StoreKey.SETTINGS) || {};
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
            dataRaw = GibberishAES.dec(dataRaw, k1);
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
       errorMsg: errMsg
    });

    // Return success flag.
    return !errMsg;
  },

  sanitizeSettings: async function() {
    var defaultFile = await ConfigFile.getDefaultJSON();

    // Sanitize basic settings and groups.
    var oldSettings = await LocalStore.getOne(StoreKey.SETTINGS);
    var newSettings = ConfigFile.parseBasicSettings(defaultFile.config);
    newSettings.providersGroups = ConfigFile.parseGroups(defaultFile.groups);
    if(_.isObject(oldSettings) && !_.isArray(oldSettings.providersGroups)) {
      delete oldSettings.providersGroups;
    }
    await LocalStore.setOne(StoreKey.SETTINGS, _.assign(newSettings, oldSettings));

    // Sanitize search providers.
    var providers = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
    if(_.isEmpty(providers)) {
      await LocalStore.setOne(
        StoreKey.SEARCH_PROVIDERS,
        _.map(defaultFile.searchproviders, ConfigFile.parseProvider)
      );      
    }

    // Sanitize special providers.
    var specialProviders = [
      { storeKey: StoreKey.CARBON_BLACK, fileKey: 'CBC' },
      { storeKey: StoreKey.NET_WITNESS, fileKey: 'NWI' },
      { storeKey: StoreKey.RSA_SECURITY, fileKey: 'RSA' },
    ];
    _.forEach(specialProviders, async function(special) {
      var data = await LocalStore.getOne(special.storeKey) || {};
      if(_.isEmpty(data.config)) {
        data.config = _.get(defaultFile, `${special.fileKey}.Queries`) || {};
      }
      if(_.isEmpty(data.queries)) {
        data.queries = _.map(_.get(defaultFile, `${special.fileKey}.Queries`), ConfigFile.parseQuery);
      }
      LocalStore.setOne(special.storeKey, data);
    });
  },

  parseJSONFile: async function(newData, overrideConfig) {
    // Update main settings.
    var settings = await LocalStore.getOne(StoreKey.SETTINGS) || {};

    // - Update basic settings (if need).
    if (overrideConfig && !_.isEmpty(newData.config)) {
      var config = newData.config[0];
      _.assign(settings, ConfigFile.parseBasicSettings(newData.config));
    }

    // - Update group names in the local store (if need).
    var groups = newData.groups;
    if (settings.useGroups && !_.isEmpty(groups)) {
      if(_.isEmpty(settings.providersGroups)) {        
        settings.providersGroups = ConfigFile.parseGroups(groups);
      } else {
        for (var k = 0; k < groups.length && k < settings.providersGroups.length; k++) {
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
    var searchProviders = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS) || [];

    // - Check if the new list of search providers are already included on the list of menu items.
    var newProviders = _.map(newData.searchproviders, ConfigFile.parseProvider);
    for (var i = 0; i < newProviders.length; i++) {
      // Check if the search provider wasn't already included (and add it if not).
      if (!_.find(searchProviders, function(provider) {
          return provider.link === newProviders[i].link;
        })) {
        searchProviders.push(newProviders[i]);
      }
    }

    // - Save list of search providers.
    await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, searchProviders);

    // Update configuration values and queries for RSA, NWI and CBC.
    await ConfigFile.parseSpecialProvider(StoreKey.RSA_SECURITY, newData.RSA);
    await ConfigFile.parseSpecialProvider(StoreKey.NET_WITNESS, newData.NWI);
    await ConfigFile.parseSpecialProvider(StoreKey.CARBON_BLACK, newData.CBC);
  },

  parseBasicSettings: function(configArray) {
    var config = _.get(configArray, '0');
    if (!_.isEmpty(config) && config.length >= 5) {
      return {
        configurationURL: config[BasicConfig.CONFIG_URL],
        useGroups: config[BasicConfig.USE_GROUPS] === true || config[BasicConfig.USE_GROUPS] === "true",
        configEncrypted: config[BasicConfig.ENCRYPTED] === true || config[BasicConfig.ENCRYPTED] === "true",
        configEncryptionKey: config[BasicConfig.ENCRIPTION_KEY] || null,
        autoUpdateConfig: config[BasicConfig.AUTO_UPDATE] === true || config[BasicConfig.AUTO_UPDATE] === "true",

        resultsInBackgroundTab: true,
        enableAdjacentTabs: true,
        openGroupsInNewWindow: true,
        enableOptionsMenuItem: true
      };
    }
    return {};    
  },

  parseGroups: function(groupsArray) {
    if(_.isArray(groupsArray) && groupsArray.length >= 3) {
      return _.map(groupsArray, function(group, index) {
        return {
          name: _.get(group, '1'),
          enabled: index < 2
        };
      });
    }
    return [];
  },

  parseSpecialProvider: function(storeKey, subData) {
    return LocalStore.setOne(storeKey, {
      config: _.get(subData, 'Config', {}),
      queries: _.map(
        _.get(subData, 'Queries', []),
        ConfigFile.parseQuery
      )
    });
  },

  parseProvider: function(item) {
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

  parseProviderInverse: function(item) {
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

  parseQuery: function(item) {
    return {
      menuIndex: item[ProvQuery.MENU_INDEX],
      label: item[ProvQuery.LABEL],
      query: item[ProvQuery.QUERY],
      enabled: item[ProvQuery.ENABLED],
    };
  },

  parseQueryInverse: function(item) {
    var res = new Array(4);
    res[ProvQuery.MENU_INDEX] = item.menuIndex;
    res[ProvQuery.LABEL] = item.label;
    res[ProvQuery.QUERY] = item.query;
    res[ProvQuery.ENABLED] = item.enabled;
    return res;
  },

  getDefaultJSON: async function() {
    try {
      var response = await fetch("../settings.json");
      return await response.json();
    } catch(err) {
      return {};
    }
  },

  generateJSONFile: async function() {
    var settings = await LocalStore.getOne(StoreKey.SETTINGS) || {};
    var rsa = await LocalStore.getOne(StoreKey.RSA_SECURITY) || {};
    var nwi = await LocalStore.getOne(StoreKey.NET_WITNESS) || {};
    var cbc = await LocalStore.getOne(StoreKey.CARBON_BLACK) || {};
    var providers = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS) || [];

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
        ["3", settings.providersGroups[2].name]
      ],

      config: [basicConfig],

      RSA: {
        Config: rsa.config,
        Queries: _.map(rsa.queries, ConfigFile.parseQueryInverse)
      },
      NWI: {
        Config: nwi.config,
        Queries: _.map(nwi.queries, ConfigFile.parseQueryInverse)
      },
      CBC: {
        Config: cbc.config,
        Queries: _.map(cbc.queries, ConfigFile.parseQueryInverse)
      }
    };
  }
};


// --- Providers configuration and queries --- //

export function providerTabHelper(
  initData,
  storageKey,
  settings,
  configForm,
  configDivId,
  configTemplateId,
  queriesForm,
  queriesDivId,
  queriesTemplateId,
  afterSave,
  autofillerParser
) {
  var tab = {
    initialize: function() {
      return Promise.all([
        tab.initializeConfig(),
        tab.initializeQueries(),
      ]);
    },

    updateForms: function() {
      return tab.initialize();
    },

    // --- Configuration --- //

    initializeConfig: async function() {
      var provData = await LocalStore.getOne(storageKey) || {};

      // Update HTML.
      var template = document.getElementById(configTemplateId).innerHTML;
      var rendered = Mustache.render(template, {
        items: _.map(settings, function(item) {
          var value = _.get(provData.config, item.key);
          return _.assignIn({
            isCheckbox: item.type === "checkbox",
            value: value || '',
            checked: (value === true || value === "true")? "checked" : "",
            placeholder: item.placeholder || '',
          }, item);
        }),
      });
      document.getElementById(configDivId).innerHTML = rendered;

      // Add click behavior to undo button.
      document.querySelector(`form[name="${configForm}"] button[type="reset"]`).addEventListener("click", tab.undoConfigChanges);

      // Add click/change listeners to inputs.
      _.forEach(settings, function(item) {
        var elem = document.querySelector(`form[name="${configForm}"] input[name="${item.key}"]`);
        if(item.autofiller) {
          elem.addEventListener("change", tab.onConfigAutofillerChanged);
        } else if(item.type === "checkbox"){
          elem.addEventListener("click", tab.onConfigInputChanged);
        } else {
          elem.addEventListener("change", tab.onConfigInputChanged);
        }
      });
    },

    undoConfigChanges: function(event) {
      event.preventDefault();
      return tab._undoChanges('config', 'configuration', tab.initializeConfig);
    },

    onConfigAutofillerChanged: async function(event) {
      // Parse input value.
      var newValue = _.get(event, 'target.value');
      var parsedValues = autofillerParser(newValue);
      if(!_.isEmpty(parsedValues)) {
        // Add also autofiller value.
        parsedValues.push({
          key: _.get(event, 'target.name'),
          value: newValue
        });

        // Save values.
        await tab._updateLocalStoreData('config', parsedValues);

        // Reset form.
        await tab.initializeConfig();
      }
    },

    onConfigInputChanged: async function(event) {
      var targetName = _.get(event, 'target.name');
      if(!_.isEmpty(targetName)) {
        // Save new value.
        await tab._updateLocalStoreData('config', [{
          key: targetName,
          value: event.target.type === 'checkbox'
            ? event.target.checked
            : event.target.value
        }]);
      }
    },

    // --- Queries --- //

    initializeQueries: async function() {
      var provData = await LocalStore.getOne(storageKey) || {};

      // Update HTML.
      var template = document.getElementById(queriesTemplateId).innerHTML;
      var rendered = Mustache.render(template, {
        formName: queriesForm,
        items: _.map(provData.queries, function(query, index) {
          return _.assign({}, query, {
            index: index,
            enabled: query.enabled ? "checked" : "",
          });
        }),
      });
      document.getElementById(queriesDivId).innerHTML = rendered;

      // Add click behavior to undo and add buttons.
      document.querySelector(`form[name="${queriesForm}"] button[type="reset"]`).addEventListener("click", tab.undoQueriesChanges);
      document.querySelector(`form[name="${queriesForm}"] button[name="add_new"]`).addEventListener("click", tab.addQuery);

      // Make list sortable.
      Sortable.create(document.querySelector(
        `form[name="${queriesForm}"] ul.list-group`),
        { handle: ".sortable-handle", onEnd: tab.onQueryDragged }
      );

      // Add click listeners to delete buttons.
      _.forEach(provData.queries, function(item, index) {
        document.querySelector(`form[name="${queriesForm}"] button[name="delete_${index}"]`).addEventListener("click", tab.removeQuery);
      });

      // Add click/change listeners to inputs (except for the ones from the creation form).
      var inputs = document.querySelectorAll(`form[name="${queriesForm}"] input`);
      _.forEach(inputs, function(input) {
        if(input.name === 'label_new' || input.name === 'query_new') {
          return;
        }

        if(input.type === "checkbox") {
          input.addEventListener("click", tab.onQueryInputChanged);
        } else {
          input.addEventListener("change", tab.onQueryInputChanged);
        }
      });
    },

    undoQueriesChanges: function(event) {
      event.preventDefault();
      return tab._undoChanges('queries', 'queries', tab.initializeQueries);
    },

    onQueryDragged: async function(event) {
      // Move query.
      var queries = _.get(await LocalStore.getOne(storageKey), 'queries', []);
      queries.splice(event.newIndex, 0, queries.splice(event.oldIndex, 1)[0]);
      await tab._updateLocalStoreData('queries', queries, true);

      // NOTE: Updating the form is required because the 'index' is being used as unique ID for each item.
      tab.initializeQueries();
    },

    removeQuery: async function(event) {
      event.preventDefault();

      if(confirm("Are you sure you want to remove this query?")) {
        // Get index.
        var rootElem = event.target.closest('li');
        var index = parseInt(rootElem.getAttribute("data-index"), 10);

        // Remove query.
        var queries = _.get(await LocalStore.getOne(storageKey), 'queries', []);
        queries.splice(index, 1);
        await tab._updateLocalStoreData('queries', queries, true);

        // Update UI according to this change and show success message.
        tab.initializeQueries();
        Notiflix.Notify.Success("Query removed");
      }
    },

    addQuery: async function(event) {
      event.preventDefault();

      // Get form data.
      var formElem = document.querySelector(`form[name="${queriesForm}"]`);
      var formData = new FormData(formElem);

      // Validate values.
      var errMsg;
      if(_.isEmpty(formData.get('label_new')) || _.isEmpty(formData.get('query_new'))) {
        errMsg = "The label and the query are required values";
      }
      if(!_.isNil(errMsg)) {
        Notiflix.Notify.Failure(errMsg);
        return;
      }

      // Add new option.
      var queries = _.get(await LocalStore.getOne(storageKey), 'queries', []);
      queries.push({
        menuIndex: -1,
        label: formData.get('label_new'),
        query: formData.get('query_new'),
        enabled: true,
      });
      await tab._updateLocalStoreData('queries', queries, true);

      // Clear form.
      document.querySelector(`form[name="${queriesForm}"] input[name="label_new"]`).value = "";
      document.querySelector(`form[name="${queriesForm}"] input[name="query_new"]`).value = "";

      // Update UI according to this change and show success message.
      tab.initializeQueries();
      Notiflix.Notify.Success("Query added successfully");
    },

    onQueryInputChanged: async function(event) {
      // Get index.
      var rootElem = event.target.closest('li');
      var index = parseInt(rootElem.getAttribute("data-index"), 10);

      // Get form data.
      var formElem = document.querySelector(`form[name="${queriesForm}"]`);
      var formData = new FormData(formElem);

      // Update query.
      var queries = _.get(await LocalStore.getOne(storageKey), 'queries', []);
      queries[index].label = formData.get("label_" + index);
      queries[index].query = formData.get("query_" + index);
      queries[index].enabled = formData.get("enabled_" + index) === "yes";

      await tab._updateLocalStoreData('queries', queries, true);
    },

    // --- Utilities --- //

    _updateLocalStoreData: async function(field, newValues, override) {
      // Get current data.
      var fullData = await LocalStore.getOne(storageKey) || {};
      var subData = fullData[field] || {};

      // Update values.
      if(override) {
        subData = newValues;
      } else {
        _.forEach(newValues, function(item) {
          subData[item.key] = item.value;
        });
      }

      // Save new values.
      fullData[field] = subData;
      await LocalStore.setOne(storageKey, fullData);

      // Invoke callback.
      afterSave();
    }, 

    _undoChanges: async function(field, name, resetForm) {
      if(confirm(`Are you sure you want to undo all recents changes on ${name}?`)) {
        // Reset data.
        var oldData = initData[storageKey];
        await tab._updateLocalStoreData(field, oldData[field], true);

        // Reset form and show confirmation message.
        resetForm();
        Notiflix.Notify.Success(`Recent changes on ${name} were undo`);
      }
    },
  };

  return tab;
};

export default {
  ConfigFile,
  providerTabHelper
};
