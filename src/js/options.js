import "@fortawesome/fontawesome-free/css/all.min.css";
import "notiflix/dist/notiflix-2.7.0.min.css";
import "../styles/theme.scss";

import "../css/main.css";

import _ from "lodash";
import Mustache from "mustache";
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
import ContextMenuItems from "../components/options/providers/contextMenuItems.svelte";
import Settings from "../components/options/settings/main.svelte";
import SpecialProvider from "../components/options/special/main.svelte";

new Footer({
  target: document.getElementById("footer"),
});

const myHeader = new Header({
  target: document.getElementById("header"),
});
myHeader.$on("tabClicked", updateTabsVisibility);
let contextMenuItems;

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

        contextMenuItems = new ContextMenuItems({
          target: document.getElementById("context_menu_providers"),
        });
        contextMenuItems.$on(
          "updateMainConfiguration",
          mainConfigurationUpdated
        );

        // Add event listeners.
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
