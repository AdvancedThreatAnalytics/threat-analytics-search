<script>
import { HEADER, MiscURLs } from "../../js/shared/constants";
import _ from "lodash";

export let current;

let href = MiscURLs.CRITICALSTART_URL;
let links = HEADER.LINKS;

$: tabs = _.map(HEADER.TABS, function (tab) {
  return _.assign(
    {
      classes: tab.page === current ? "active" : "text-success",
      attributes: tab.page === current ? "page" : "",
    },
    tab
  );
});
</script>

<header class="container d-flex mb-3">
  <a
    id="logo-link"
    target="_blank"
    title="Threat Analytics @@browserName plugin notes"
    href="{href}">
    <img src="./images/icon_128.png" alt="CRITICALSTART logo" height="90px" />
  </a>
  <div class="flex-grow-1 pl-3">
    <h1 class="mb-1">CRITICALSTART</h1>
    <nav>
      {#if !tabs}
        <div>Loading...</div>
      {:else}
        <ul class="nav nav-tabs">
          {#each tabs as tab}
            <li class="nav-item">
              <a
                class="nav-link {tab.classes}"
                data-tab="{tab.page}"
                href="{tab.href}"
                aria-current="{tab.attributes}">{tab.label}</a>
            </li>
          {/each}
        </ul>
      {/if}
    </nav>
  </div>

  <div class="d-flex align-items-end">
    {#if !links}
      <div>Loading...</div>
    {:else}
      {#each links as link}
        <div class="mx-2 pb-2">
          <a href="{link.href}" title="{link.title}" target="_blank">
            <i class="{link.icon}" aria-hidden="true"></i>
            {link.label}
          </a>
        </div>
      {/each}
    {/if}
  </div>
</header>
