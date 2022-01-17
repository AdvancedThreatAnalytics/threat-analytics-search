import "@fortawesome/fontawesome-free/css/all.min.css";
import "notiflix/dist/notiflix-2.7.0.min.css";
import "../styles/theme.scss";

import "../css/main.css";

import _ from "lodash";

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
};
