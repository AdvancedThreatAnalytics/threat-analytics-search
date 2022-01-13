import "@fortawesome/fontawesome-free/css/all.min.css";
import "notiflix/dist/notiflix-2.7.0.min.css";
import "../styles/theme.scss";

import "../css/main.css";

import _ from "lodash";
import Notiflix from "notiflix";

import {
  StoreKey,
  CBC_CONFIG,
  NWI_CONFIG,
  RSA_CONFIG,
} from "./shared/constants";
import LocalStore from "./shared/local_store";
import providerTabHelper from "./shared/provider_helper";

// Inject Svelte components into the page.
import Footer from "../components/options/footer.svelte";
import Header from "../components/options/header.svelte";
import Groups from "../components/options/providers/groups.svelte";
import ContextMenuItems from "../components/options/providers/contextMenuItems.svelte";
import Settings from "../components/options/settings/main.svelte";

new Footer({
  target: document.getElementById("footer"),
});

const myHeader = new Header({
  target: document.getElementById("header"),
});
myHeader.$on("tabClicked", updateTabsVisibility);
let contextMenuItems;

let groups;

// Global variable for store initial settings (before user changes).
var initData = {};

// Wait for the page to be loaded to execute the initialization function.
document.addEventListener("DOMContentLoaded", async function () {
  const settingsTab = new Settings({
    target: document.querySelector('main section[data-tab="settings"]'),
  });
  settingsTab.$on("updateMainConfiguration", mainConfigurationUpdated);

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

function updateTabsVisibility(data) {
  const current = _.get(data, "detail");
  const pages = document.querySelectorAll("main section");
  for (let i = 0; i < pages.length; i++) {
    const pageAttr = pages[i].getAttribute("data-tab");
    if (!_.isEmpty(pageAttr)) {
      pages[i].style.display = pageAttr === current ? "block" : "none";
    }
  }
}

function mainConfigurationUpdated(lazy) {
  // Since svelte component wraps event parameter with event.detail object, we should also check that.
  if (!lazy || !_.get(lazy, "detail")) {
    ProvidersTab.updateForms();
    CarbonBlackTab.updateForms();
    NetWitnessTab.updateForms();
    SearchAnalyticsTab.updateForms();
  }

  chrome.runtime.sendMessage({ action: "updateContextualMenu" });
}

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

        contextMenuItems = new ContextMenuItems({
          target: document.getElementById("context_menu_providers"),
        });
        contextMenuItems.$on(
          "updateMainConfiguration",
          mainConfigurationUpdated
        );

        groups = new Groups({
          target: document.getElementById("manage_provider_groups"),
          props: {
            initialSettings: initData[StoreKey.SETTINGS],
          },
        });

        groups.$on("updateProvidersForm", this.updateProvidersForm);
        groups.$on("updateForm", this.updateForms);
        groups.$on("updateMainConfiguration", mainConfigurationUpdated);

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
      groups.initialize(),
      ProvidersTab.updateProvidersForm(),
    ]);
  },

  updateProvidersForm: async function () {
    contextMenuItems.initProvidersAndGroups();
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
