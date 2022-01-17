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

// Inject Svelte components into the page.
import Footer from "../components/options/footer.svelte";
import Header from "../components/options/header.svelte";
import Groups from "../components/options/providers/groups.svelte";
import ContextMenuItems from "../components/options/providers/contextMenuItems.svelte";
import Settings from "../components/options/settings/main.svelte";
import AddSearchProviders from "../components/options/providers/add.svelte";
import SpecialProvider from "../components/options/special/main.svelte";

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
  new SpecialProvider({
    target: document.querySelector(
      'main section[data-tab="security-analytics"]'
    ),
    props: {
      configTitle: "RSA Security Analytics Configuration",
      form: "rsa",
      initData,
      isRSA: true,
      settings: RSA_CONFIG,
      storageKey: StoreKey.RSA_SECURITY,
    },
  });
  new SpecialProvider({
    target: document.querySelector('main section[data-tab="netwitness"]'),
    props: {
      configTitle: "NetWitness Investigator Configuration",
      form: "nwi",
      initData,
      settings: NWI_CONFIG,
      storageKey: StoreKey.NET_WITNESS,
    },
  });
  new SpecialProvider({
    target: document.querySelector('main section[data-tab="carbon-black"]'),
    props: {
      configTitle: "Carbon Black Configuration",
      form: "cbc",
      initData,
      settings: CBC_CONFIG,
      storageKey: StoreKey.CARBON_BLACK,
    },
  });

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

        const addProvider = new AddSearchProviders({
          target: document.getElementById("add_provider"),
        });
        addProvider.$on("updateMainConfiguration", mainConfigurationUpdated);

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
