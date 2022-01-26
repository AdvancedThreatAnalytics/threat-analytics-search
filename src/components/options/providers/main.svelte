<script>
import AddSearchProviders from "./add.svelte";
import ContextMenuItems from "./contextMenuItems.svelte";
import Groups from "./groups.svelte";
import { onMount } from "svelte";

let groupComponent;
let contextMenuComponent;

function mainConfigurationUpdated() {
  updateForms();
  chrome.runtime.sendMessage({ action: "updateContextualMenu" });
}

export function updateForms() {
  return Promise.all([groupComponent.initialize(), updateProvidersForm()]);
}

async function updateProvidersForm() {
  contextMenuComponent.initProvidersAndGroups();
}

onMount(() => {
  updateForms();
});
</script>

<div>
  <h2>Add Search Provider</h2>
  <AddSearchProviders on:updateMainConfiguration="{mainConfigurationUpdated}" />

  <h2 class="mt-4">Manage Context Menu Items</h2>
  <ContextMenuItems
    bind:this="{contextMenuComponent}"
    on:updateMainConfiguration="{mainConfigurationUpdated}" />

  <h2 class="mt-3">Manage Groups</h2>
  <Groups
    bind:this="{groupComponent}"
    initial-settings="{$$props.initialSettings}"
    on:updateMainConfiguration="{mainConfigurationUpdated}" />
</div>
