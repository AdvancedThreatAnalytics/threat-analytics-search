import "@fortawesome/fontawesome-free/css/all.min.css";
import "notiflix/dist/notiflix-2.7.0.min.css";
import "bootstrap/dist/css/bootstrap.min.css";

import "../css/main.css";

import _ from "lodash";
import Mustache from "mustache";
import Notiflix from "notiflix";
import beautify from "js-beautify";
import { DateTime } from "luxon";
import { Sortable } from "sortablejs";
import BSN from "bootstrap.native/dist/bootstrap-native.esm.min.js";
import Analytics from "./shared/analytics";

import {
  MiscURLs,
  StoreKey,
  CBC_CONFIG,
  NWI_CONFIG,
  RSA_CONFIG,
  EXPORT_FILE_NAME,
} from "./shared/constants";

import ConfigFile from "./shared/config_file";
import LocalStore from "./shared/local_store";
import providerTabHelper from "./shared/provider_helper";

// Global variable for store initial settings (before user changes).
var initData = {};

// Wait for the page to be loaded to execute the initialization function.
document.addEventListener("DOMContentLoaded", async function () {
  Header.update();
  updateTabsVisibility(Header.DEFAULT_TAB);

  SettingsTab.initialize();
  ProvidersTab.initialize();
  CarbonBlackTab.initialize();
  NetWitnessTab.initialize();
  SearchAnalyticsTab.initialize();

  LocalStore.get([
    StoreKey.CARBON_BLACK,
    StoreKey.NET_WITNESS,
    StoreKey.RSA_SECURITY,
    StoreKey.SEARCH_PROVIDERS,
    StoreKey.SETTINGS,
  ]).then(function (result) {
    _.assign(initData, result);
  });
});

function updateTabsVisibility(current) {
  var pages = document.querySelectorAll("main section");
  for (var i = 0; i < pages.length; i++) {
    var pageAttr = pages[i].getAttribute("data-tab");
    if (!_.isEmpty(pageAttr)) {
      pages[i].style.display = pageAttr === current ? "block" : "none";
    }
  }
}

function mainConfigurationUpdated(lazy) {
  if (!lazy) {
    SettingsTab.updateForms();
    ProvidersTab.updateForms();
    CarbonBlackTab.updateForms();
    NetWitnessTab.updateForms();
    SearchAnalyticsTab.updateForms();
  }

  chrome.runtime.sendMessage({ action: "updateContextualMenu" });
}

// --- Header --- //

var Header = {
  TABS: [
    {
      page: "settings",
      href: "#",
      label: "Settings",
    },
    {
      page: "search-providers",
      href: "#",
      label: "Search Providers",
    },
    {
      page: "security-analytics",
      href: "#",
      label: "Security Analytics",
    },
    {
      page: "netwitness",
      href: "#",
      label: "NetWitness",
    },
    {
      page: "carbon-black",
      href: "#",
      label: "Carbon Black",
    },
  ],

  LINKS: [
    {
      label: "Home",
      title: "Home",
      icon: "fa fa-home",
      href: MiscURLs.EXTENSION_HOME_URL,
    },
    {
      label: "About us",
      title: "About us",
      icon: "fa fa-info-circle",
      href: MiscURLs.ABOUT_US_URL,
    },
    {
      label: "Feedback",
      title: "Report an issue",
      icon: "fab fa-github",
      href: MiscURLs.ISSUES_URL,
    },
  ],

  DEFAULT_TAB: "search-providers",

  update: function (params) {
    var current = _.get(params, "current") || Header.DEFAULT_TAB;

    // Add 'computed' variables to tabs.
    var tabs = _.map(Header.TABS, function (tab) {
      return _.assign(
        {
          classes: tab.page === current ? "active" : "text-success",
          attributes: tab.page === current ? 'aria-current="page"' : "",
        },
        tab
      );
    });

    // Add default values to parameters.
    params = _.assign(
      {
        current: current,
        tabs: tabs,
      },
      params
    );

    // Replace template.
    var headerTemplate = document.getElementById(
      "template-header-nav"
    ).innerHTML;
    var headerRendered = Mustache.render(headerTemplate, params);
    document.querySelector("header nav").innerHTML = headerRendered;

    // Replace link template.
    var linksTemplate = document.getElementById(
      "template-header-links"
    ).innerHTML;
    var linksRendered = Mustache.render(linksTemplate, { links: Header.LINKS });
    document.getElementById("links").innerHTML = linksRendered;

    // Replace footer link.
    var el = document.getElementById("footer-link");
    el.setAttribute("href", MiscURLs.CRITICALSTART_URL);
    el.innerHTML = MiscURLs.CRITICALSTART_URL;

    // Replace logo link.
    document
      .getElementById("logo-link")
      .setAttribute("href", MiscURLs.RELEASES_URL);

    // Add click behaviors to tab links.
    var items = document.querySelectorAll("header nav .nav-link");
    for (var i = 0; i < items.length; i++) {
      items[i].addEventListener("click", Header.tabClicked);
    }
  },

  tabClicked: function (event) {
    var current = event.target.getAttribute("data-tab");

    Header.update({
      current: current,
    });
    updateTabsVisibility(current);

    event.preventDefault();
    return false;
  },
};

// --- Settings tab --- //

var SettingsTab = {
  editModal: null,

  initialize: function () {
    fetch("views/settings.html")
      .then((response) => response.text())
      .then((htmlData) => {
        // Insert template file.
        document.querySelector('main section[data-tab="settings"]').innerHTML =
          htmlData;

        // Add click/change behaviors.
        document
          .getElementById("settings_refreshNow")
          .addEventListener("click", SettingsTab.updateNow);
        document
          .getElementById("settings_import")
          .addEventListener("click", SettingsTab.importFromFile);
        document
          .getElementById("settings_export")
          .addEventListener("click", SettingsTab.exportToFile);
        document
          .getElementById("settings_edit")
          .addEventListener("click", SettingsTab.openModal);
        document
          .getElementById("settings_fileInput")
          .addEventListener("change", SettingsTab.fileImported);
        document
          .getElementById("settings_closeModal")
          .addEventListener("click", SettingsTab.closeModal);
        document
          .getElementById("settings_saveChanges")
          .addEventListener("click", SettingsTab.saveModalChanges);
        document
          .getElementById("settings_discardChanges")
          .addEventListener("click", SettingsTab.closeModal);

        var inputs = document.querySelectorAll('form[name="settings"] input');
        _.each(inputs, function (input) {
          if (input.type === "checkbox") {
            input.addEventListener("click", SettingsTab.onInputChanged);
          } else {
            input.addEventListener("change", SettingsTab.onInputChanged);
          }
        });

        // Update inputs with settings values.
        SettingsTab.updateForms();
      });
  },

  onInputChanged: async function (event) {
    var targetName = _.get(event, "target.name");
    if (!_.isEmpty(targetName)) {
      var newSettings =
        _.clone(await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      newSettings[targetName] =
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value;
      await LocalStore.setOne(StoreKey.SETTINGS, newSettings);

      // Update context menu
      mainConfigurationUpdated(true);
    }
  },

  updateForms: async function () {
    var settings = await LocalStore.getOne(StoreKey.SETTINGS);

    // Update inputs.
    var inputs = document.querySelectorAll('form[name="settings"] input');
    _.each(inputs, function (input) {
      var value = _.get(settings, input.name);
      if (input.type === "checkbox") {
        input.checked = value === true;
      } else {
        input.value = value;
      }
    });

    // Update 'last update' text.
    SettingsTab.updateLastConfigUpdate();
  },

  updateLastConfigUpdate: async function () {
    var lastConfig = await LocalStore.getOne(StoreKey.LAST_CONFIG_DATA);

    let date = _.get(lastConfig, "date", "-");
    let error = _.get(lastConfig, "errorMsg", "");

    date = DateTime.fromSeconds(date / 1000).toLocaleString(
      DateTime.DATETIME_SHORT_WITH_SECONDS
    );

    document.getElementById("settings_lastConfigUpdate").innerHTML = date;
    document.getElementById("settings_lastConfigUpdateError").innerHTML = error;
  },

  updateJSONTextarea: async function (newSettings) {
    var textarea = document.getElementById("settings_json");
    if (textarea) {
      if (_.isNil(newSettings)) {
        newSettings = await ConfigFile.generateJSONFile();
      }

      textarea.value = beautify(JSON.stringify(newSettings), {
        indent_size: 2,
      });
    }
  },

  updateNow: async function () {
    var success = await ConfigFile.updateNow();
    if (success) {
      // Update UI according to this change
      mainConfigurationUpdated();

      Notiflix.Notify.Success("The settings were refreshed");
    } else {
      // Update Last Config label to show error details.
      SettingsTab.updateLastConfigUpdate();

      Notiflix.Notify.Failure(
        "The settings couldn't be updated, please check the URL or the file content"
      );
    }
  },

  saveSearches: async function (data) {
    try {
      var parsedData = JSON.parse(data);

      if (
        confirm(
          "Are you sure you want to override your local settings with these values?"
        )
      ) {
        await ConfigFile.parseJSONFile(parsedData, true);

        // Update UI according to this change
        mainConfigurationUpdated();

        Notiflix.Notify.Success("New configuration saved");
        return true;
      }
    } catch (err) {
      console.error(err);
      Notiflix.Notify.Failure(
        "Configuration couldn't be saved. Please verify that the file is valid."
      );
      return false;
    }
  },

  importFromFile() {
    document.getElementById("settings_fileInput").click();
  },

  fileImported(event) {
    let selectedFile = _.first(this.files);
    var reader = new FileReader();

    reader.onload = function (event) {
      SettingsTab.saveSearches(event.target.result);
    };
    reader.readAsText(selectedFile);

    // Reset the value
    event.target.value = "";
  },

  exportToFile: async function () {
    // Generate the JSON
    let data = await ConfigFile.generateJSONFile();

    // Create a downloadable link with content. I have named the exported file to `Settings.json`
    var downloadLink = document.createElement("a");
    var blob = new Blob([JSON.stringify(data)], {
      type: "text/plain;charset=utf-8",
    });
    var url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = EXPORT_FILE_NAME;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  },

  openModal: async function () {
    // Update text Area
    await SettingsTab.updateJSONTextarea();
    SettingsTab.editModal = new BSN.Modal("#settings_editModal");
    SettingsTab.editModal.show();
  },

  saveModalChanges: async function () {
    var changes = document.getElementById("settings_json").value;
    var success = await SettingsTab.saveSearches(changes);

    // close Modal on success
    if (success) {
      SettingsTab.closeModal();
    }
  },

  closeModal() {
    SettingsTab.editModal.dispose();
  },
};

// --- Search Providers tab --- //

var ProvidersTab = {
  initialize: function () {
    fetch("views/providers.html")
      .then((response) => response.text())
      .then((htmlData) => {
        // Insert template file.
        document.querySelector(
          'main section[data-tab="search-providers"]'
        ).innerHTML = htmlData;

        // Add event listeners.
        document
          .querySelector('form[name="manage_providers"] button[type="reset"]')
          .addEventListener("click", ProvidersTab.undoProvidersChanges);
        document
          .querySelector('form[name="edit_groups"] button[type="reset"]')
          .addEventListener("click", ProvidersTab.undoGroupsChanges);

        document
          .querySelector('form[name="add_provider"] button[type="submit"]')
          .addEventListener("click", ProvidersTab.addNewProvider);
        document
          .querySelector('form[name="add_provider"] input[name="postEnabled"]')
          .addEventListener("click", ProvidersTab.toggleInputByCheckbox);
        document
          .querySelector('form[name="add_provider"] input[name="proxyEnabled"]')
          .addEventListener("click", ProvidersTab.toggleInputByCheckbox);

        // Update forms with stored values.
        ProvidersTab.updateForms();
      });
  },

  updateForms: function () {
    return Promise.all([
      ProvidersTab.updateGroupsForm(),
      ProvidersTab.updateProvidersForm(),
    ]);
  },

  // --- Providers list --- //

  updateProvidersForm: async function () {
    var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
    var searchProviders =
      (await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS)) || [];

    // Update HTML.
    var template = document.getElementById(
      "template_menuItemsManager"
    ).innerHTML;
    var rendered = Mustache.render(template, {
      menuItems: _.map(searchProviders, function (item, index) {
        return _.assign({}, item, {
          index: index,
          enabled: item.enabled ? "checked" : "",
        });
      }),
      groups: function () {
        var item = this;
        return _.map(settings.providersGroups, function (group, index) {
          var mask = Math.pow(2, index);
          return {
            value: index + 1,
            name: group.name,
            checked: item.group & mask ? "checked" : "",
            classes: group.enabled ? "" : "text-muted",
          };
        });
      },
    });
    document.getElementById("providers_menuItems").innerHTML = rendered;

    // Add extension's github url
    var el = document.getElementById("extension_home_url");
    el.setAttribute("href", MiscURLs.EXTENSION_HOME_URL);
    el.innerHTML = MiscURLs.EXTENSION_HOME_URL;

    // Make list sortable.
    Sortable.create(
      document.querySelector("#providers_menuItems ul.list-group"),
      { handle: ".sortable-handle", onEnd: ProvidersTab.onProviderDragged }
    );

    // Add click listeners to delete buttons.
    var deleteButtons = document.querySelectorAll(
      'form[name="manage_providers"] button[title="Delete"]'
    );
    _.forEach(deleteButtons, function (button) {
      button.addEventListener("click", ProvidersTab.removeProvider);
    });

    // Add click/change listeners to inputs.
    var inputs = document.querySelectorAll(
      'form[name="manage_providers"] input'
    );
    _.forEach(inputs, function (input) {
      if (input.type === "checkbox") {
        input.addEventListener("click", ProvidersTab.onProviderInputChanged);
      } else {
        input.addEventListener("change", ProvidersTab.onProviderInputChanged);
      }
    });
  },

  onProviderDragged: async function (event) {
    // Move provider.
    var providers = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
    providers.splice(event.newIndex, 0, providers.splice(event.oldIndex, 1)[0]);
    await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, providers);

    // Update UI according to this change.
    // NOTE: Updating the form is required because the 'index' is being used as unique ID for each item.
    ProvidersTab.updateProvidersForm();
    mainConfigurationUpdated(true);
  },

  removeProvider: async function (event) {
    event.preventDefault();

    if (confirm("Are you sure you want to remove this item?")) {
      // Get index.
      var rootElem = event.target.closest("li");
      var index = parseInt(rootElem.getAttribute("data-index"), 10);

      // Remove provider.
      var providers = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
      providers.splice(index, 1);
      await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, providers);

      // Update UI according to this change.
      ProvidersTab.updateProvidersForm();
      mainConfigurationUpdated(true);

      Notiflix.Notify.Success("Item removed");
    }
  },

  onProviderInputChanged: async function (event) {
    var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
    var providers = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);

    // Get index.
    var rootElem = event.target.closest("li");
    var index = parseInt(rootElem.getAttribute("data-index"), 10);

    // Get form data.
    var formElem = document.querySelector('form[name="manage_providers"]');
    var formData = new FormData(formElem);

    // Update provider.
    var item = providers[index];
    item.label = formData.get("label_" + index);
    item.link = formData.get("link_" + index);
    item.enabled = formData.get("enabled_" + index) === "yes";

    var group = 0;
    for (var k = 0; k < settings.providersGroups.length; k++) {
      var value = k + 1;
      var isChecked = !_.isNil(formData.get("group_" + index + "_" + value));
      if (isChecked) {
        group += Math.pow(2, k);
      }
    }
    item.group = group;

    if (item.postEnabled) {
      item.postValue = formData.get("postValue_" + index);
    }
    if (item.proxyEnabled) {
      item.proxyUrl = formData.get("proxyUrl_" + index);
    }

    // Save changes.
    providers[index] = item;
    await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, providers);

    // Update context menu
    mainConfigurationUpdated(true);
  },

  undoProvidersChanges: async function (event) {
    event.preventDefault();

    if (
      confirm(
        "Are you sure you want to undo all recents changes on menu items?"
      )
    ) {
      // Reset data.
      var oldProviders = initData[StoreKey.SEARCH_PROVIDERS];
      await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, oldProviders);

      // Update UI according to this change.
      ProvidersTab.updateForms();
      mainConfigurationUpdated(true);

      Notiflix.Notify.Success("Recent changes on menu items were undo");
    }
  },

  // --- Provider add --- //

  toggleInputByCheckbox: function (event) {
    var checkbox = event.target;
    var input = document.getElementById(checkbox.getAttribute("data-target"));
    if (!_.isNil(input)) {
      input.disabled = !checkbox.checked;
    }
  },

  addNewProvider: async function (event) {
    event.preventDefault();

    // Get form data.
    var formElem = document.querySelector('form[name="add_provider"]');
    var formData = new FormData(formElem);

    // Validate values.
    var errMsg;
    if (_.isEmpty(formData.get("label")) || _.isEmpty(formData.get("link"))) {
      errMsg = "The display name and the link are required values";
    } else if (
      formData.get("postEnabled") === "yes" &&
      _.isEmpty(formData.get("postValue"))
    ) {
      errMsg = "If POST is enabled you must provide a value";
    } else if (
      formData.get("proxyEnabled") === "yes" &&
      _.isEmpty(formData.get("proxyUrl"))
    ) {
      errMsg = "If proxy is enabled you must provide the Proxy's URL";
    }
    if (!_.isNil(errMsg)) {
      Notiflix.Notify.Failure(errMsg);
      return;
    }

    // Add new option.
    var searchProviders = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
    searchProviders.push({
      menuIndex: -1,
      label: formData.get("label"),
      link: formData.get("link"),
      enabled: true,
      fromConfig: false,
      group: 0,
      postEnabled: formData.get("postEnabled") === "yes",
      postValue: formData.get("postValue"),
      proxyEnabled: formData.get("proxyEnabled") === "yes",
      proxyUrl: formData.get("proxyUrl"),
    });
    await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, searchProviders);

    // Clear form.
    _.forEach(
      document.querySelectorAll('form[name="add_provider"] input[type="text"]'),
      function (input) {
        input.value = "";
      }
    );

    // Update UI according to this change.
    ProvidersTab.updateProvidersForm();
    mainConfigurationUpdated(true);

    Notiflix.Notify.Success("Option added successfully");
  },

  // --- Groups --- //

  updateGroupsForm: async function () {
    var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};

    // Update HTML.
    var template = document.getElementById("template_groupsManager").innerHTML;
    var rendered = Mustache.render(template, {
      groups: settings.providersGroups,
      index: function () {
        return settings.providersGroups.indexOf(this);
      },
      checked: function () {
        return this.enabled ? "checked" : "";
      },
    });
    document.getElementById("providers_groupsManager").innerHTML = rendered;

    // Add click/change listeners.
    var inputs = document.querySelectorAll('form[name="edit_groups"] input');
    _.forEach(inputs, function (input) {
      if (input.type === "checkbox") {
        input.addEventListener("click", ProvidersTab.onGroupInputChanged);
      } else {
        input.addEventListener("change", ProvidersTab.onGroupInputChanged);
      }
    });
  },

  onGroupInputChanged: async function (event) {
    // Get index.
    var rootElem = event.target.closest("li");
    var index = parseInt(rootElem.getAttribute("data-index"), 10);

    // Get form data.
    var formElem = document.querySelector('form[name="edit_groups"]');
    var formData = new FormData(formElem);

    // Update group.
    var settings = await LocalStore.getOne(StoreKey.SETTINGS);
    settings.providersGroups[index] = {
      name: formData.get("label_" + index) || "Group " + (index + 1),
      enabled: formData.get("enabled_" + index) === "yes",
    };
    await LocalStore.setOne(StoreKey.SETTINGS, settings);

    // Update UI according to this change.
    ProvidersTab.updateProvidersForm();
    mainConfigurationUpdated(true);
  },

  undoGroupsChanges: async function (event) {
    event.preventDefault();

    if (
      confirm("Are you sure you want to undo all recents changes on groups?")
    ) {
      // Reset data.
      var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
      settings.providersGroups = initData[StoreKey.SETTINGS].providersGroups;
      await LocalStore.setOne(StoreKey.SETTINGS, settings);

      // Update UI according to this change.
      ProvidersTab.updateForms();
      mainConfigurationUpdated(true);

      Notiflix.Notify.Success("Recent changes on groups were undo");
    }
  },
};

// --- Carbon Black & NetWitness & Serch analytics tabs --- //

var CarbonBlackTab = providerTabHelper(
  initData,
  StoreKey.CARBON_BLACK,
  CBC_CONFIG,
  "cbcConfig",
  "cbc_config",
  "template_providerConfig",
  "cbcQueries",
  "cbc_queries",
  "template_providerQueries",
  mainConfigurationUpdated.bind(this, true)
);

var NetWitnessTab = providerTabHelper(
  initData,
  StoreKey.NET_WITNESS,
  NWI_CONFIG,
  "nwiConfig",
  "nwi_config",
  "template_providerConfig",
  "nwiQueries",
  "nwi_queries",
  "template_providerQueries",
  mainConfigurationUpdated.bind(this, true),
  function (link) {
    try {
      if (!_.isEmpty(link)) {
        var temp = link.match(/:\/\/([^:/?]*)(:(\d+)|[/?])/);
        var hostname = temp ? (temp[1] ? temp[1] : "") : "";
        var port = temp ? (temp[3] ? temp[3] : "") : "";
        temp = link.match(/collection=([^&]*)/);
        var collectionName = temp ? (temp[1] ? temp[1] : "") : "";

        return [
          { key: "NWIConfigEnable", value: true },
          { key: "NWIConfigHost", value: hostname },
          { key: "NWIConfigPort", value: port },
          { key: "NWIConfigCollectionName", value: collectionName },
        ];
      }
    } catch (err) {
      // Do nothing.
    }
    return null;
  }
);

var SearchAnalyticsTab = providerTabHelper(
  initData,
  StoreKey.RSA_SECURITY,
  RSA_CONFIG,
  "rsaConfig",
  "rsa_config",
  "template_providerConfig",
  "rsaQueries",
  "rsa_queries",
  "template_providerQueries",
  mainConfigurationUpdated.bind(this, true),
  function (link) {
    try {
      if (!_.isEmpty(link)) {
        var ssl = link.search(/https:/) == 0 ? true : false;
        var temp = link.match(/:\/\/([^:/?]*)(:(\d+)|[/?])/);
        var hostname = temp ? (temp[1] ? temp[1] : "") : "";
        var port = temp ? (temp[3] ? temp[3] : "") : "";
        temp = link.match(/investigation\/([^/]*)\//);
        var devId = temp ? (temp[1] ? temp[1] : "") : "";

        return [
          { key: "RSAConfigEnable", value: true },
          { key: "RSAConfigUseHttps", value: ssl },
          { key: "RSAConfigHost", value: hostname },
          { key: "RSAConfigPort", value: port },
          { key: "RSAConfigDevId", value: devId },
        ];
      }
    } catch (err) {
      // Do nothing.
    }
    return null;
  }
);
