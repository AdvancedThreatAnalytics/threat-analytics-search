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
import { fade } from "svelte/transition";

// Inject Svelte components into the page.
import Footer from "./footer.svelte";
import Header from "./header.svelte";
import Providers from "./providers/main.svelte";
import Settings from "./settings/main.svelte";
import SpecialProvider from "./special/main.svelte";

// Global variable for store initial settings (before user changes).
let initData = {};

let currentTab;
let providersTab;

function updateTabsVisibility(data) {
  currentTab = _.get(data, "detail");
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
    {#if currentTab === "settings"}
      <section transition:fade="{{ duration: 100 }}">
        <Settings on:updateMainConfiguration="{mainConfigurationUpdated}" />
      </section>
    {:else if currentTab === "search-providers"}
      <section transition:fade="{{ duration: 100 }}">
        <Providers
          bind:this="{providersTab}"
          initialSettings="{initData[StoreKey.SETTINGS]}"
          on:updateMainConfiguration="{mainConfigurationUpdated}" />
      </section>
    {:else if currentTab === "security-analytics"}
      <section transition:fade="{{ duration: 100 }}">
        <SpecialProvider
          configTitle="{'RSA Security Analytics Configuration'}"
          form="{'rsa'}"
          initData="{initData}"
          isRSA="{true}"
          settings="{RSA_CONFIG}"
          storageKey="{StoreKey.RSA_SECURITY}" />
      </section>
    {:else if currentTab === "netwitness"}
      <section transition:fade="{{ duration: 100 }}">
        <SpecialProvider
          configTitle="{'NetWitness Investigator Configuration'}"
          form="{'nwi'}"
          initData="{initData}"
          settings="{NWI_CONFIG}"
          storageKey="{StoreKey.NET_WITNESS}" />
      </section>
    {:else if currentTab === "carbon-black"}
      <section transition:fade="{{ duration: 100 }}">
        <SpecialProvider
          configTitle="{'Carbon Black Configuration'}"
          form="{'cbc'}"
          initData="{initData}"
          settings="{CBC_CONFIG}"
          storageKey="{StoreKey.CARBON_BLACK}" />
      </section>
    {/if}
  </main>

  <!-- Footer -->
  <Footer />
</div>
