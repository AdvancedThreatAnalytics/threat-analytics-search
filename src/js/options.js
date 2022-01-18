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
import Providers from "../components/options/providers/main.svelte";
import Settings from "../components/options/settings/main.svelte";
import SpecialProvider from "../components/options/special/main.svelte";

new Footer({
  target: document.getElementById("footer"),
});

const myHeader = new Header({
  target: document.getElementById("header"),
});
myHeader.$on("tabClicked", updateTabsVisibility);

// Global variable for store initial settings (before user changes).
let initData = {};

// Wait for the page to be loaded to execute the initialization function.
document.addEventListener("DOMContentLoaded", async function () {
  new Settings({
    target: document.querySelector('main section[data-tab="settings"]'),
  });

  new Providers({
    target: document.querySelector('main section[data-tab="search-providers"]'),
    props: {
      initData: initData,
    },
  });

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
