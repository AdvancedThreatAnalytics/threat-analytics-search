<script>
import _ from "lodash";

import {
  StoreKey,
  CBC_CONFIG,
  NWI_CONFIG,
  RSA_CONFIG,
} from "../../js/shared/constants";
import LocalStore from "../../js/shared/local_store";
import { onMount } from "svelte";

// Inject Svelte components into the page.
import Footer from "./footer.svelte";
import Header from "./header.svelte";
import Providers from "./providers/main.svelte";
import Settings from "./settings/main.svelte";
import SpecialProvider from "./special/main.svelte";

// Global variable for store initial settings (before user changes).
let initData = {};

let providersTab;

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
  if (!lazy || !_.get(lazy, "detail")) {
    providersTab.updateForms();
  }
  chrome.runtime.sendMessage({ action: "updateContextualMenu" });
}

onMount(() => {
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
</script>

<div>
  <!-- Header -->
  <Header on:tabClicked="{updateTabsVisibility}" />

  <!-- Tabs content -->
  <main class="container">
    <section data-tab="settings">
      <Settings on:updateMainConfiguration="{mainConfigurationUpdated}" />
    </section>

    <section data-tab="search-providers">
      <Providers bind:this="{providersTab}" initData="{initData}" />
    </section>

    <section data-tab="security-analytics">
      <SpecialProvider
        configTitle="{'RSA Security Analytics Configuration'}"
        form="{'rsa'}"
        initData="{initData}"
        isRSA="{true}"
        settings="{RSA_CONFIG}"
        storageKey="{StoreKey.RSA_SECURITY}" />
    </section>

    <section data-tab="netwitness">
      <SpecialProvider
        configTitle="{'NetWitness Investigator Configuration'}"
        form="{'nwi'}"
        initData="{initData}"
        settings="{NWI_CONFIG}"
        storageKey="{StoreKey.NET_WITNESS}" />
    </section>

    <section data-tab="carbon-black">
      <SpecialProvider
        configTitle="{'Carbon Black Configuration'}"
        form="{'cbc'}"
        initData="{initData}"
        settings="{CBC_CONFIG}"
        storageKey="{StoreKey.CARBON_BLACK}" />
    </section>
  </main>

  <!-- Footer -->
  <Footer />
</div>
