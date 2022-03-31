<script>
import { MiscURLs } from "../../js/shared/constants";
import { onMount, tick } from "svelte";
import { createEventDispatcher } from "svelte";

const dispatch = createEventDispatcher();

const TABS = [
  {
    page: "settings",
    label: "Settings",
  },
  {
    page: "search-providers",
    label: "Search Providers",
  },
  {
    page: "security-analytics",
    label: "Security Analytics",
  },
  {
    page: "netwitness",
    label: "NetWitness",
  },
  {
    page: "carbon-black",
    label: "Carbon Black",
  },
];

const LINKS = [
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
];

const DEFAULT_TAB = "search-providers";

const HOME_URL = MiscURLs.CRITICALSTART_URL;

// TODO: once the Options page is completely implemented with Svelte, this variable should be a property with
// two way binding, making unnecessary to dispatch the "tabClicked" event.
let current;

function tabClicked(tabName) {
  current = tabName;
  dispatch("tabClicked", tabName);
}

onMount(async () => {
  await tick();
  tabClicked(DEFAULT_TAB);
});
</script>

<header class="container d-flex mb-3">
  <a
    id="logo-link"
    target="_blank"
    title="Threat Analytics @@browserName plugin notes"
    href="{HOME_URL}">
    <img src="./images/icon_128.png" alt="CRITICALSTART logo" height="90px" />
  </a>

  <div class="flex-grow-1 pl-3">
    <h1 class="mb-1">CRITICALSTART</h1>

    <nav>
      <ul class="nav nav-tabs">
        {#each TABS as tab}
          <li class="nav-item">
            <a
              href="{'#'}"
              class="nav-link {tab.page === current
                ? 'active'
                : 'text-success'}"
              data-tab="{tab.page}"
              aria-current="{tab.page === current ? 'page' : ''}"
              on:click|preventDefault="{() => tabClicked(tab.page)}"
              >{tab.label}</a>
          </li>
        {/each}
      </ul>
    </nav>
  </div>

  <div class="d-flex align-items-end">
    {#each LINKS as link}
      <div class="mx-2 pb-2">
        <a href="{link.href}" title="{link.title}" target="_blank">
          <i class="{link.icon}" aria-hidden="true"></i>
          {link.label}
        </a>
      </div>
    {/each}
  </div>
</header>
