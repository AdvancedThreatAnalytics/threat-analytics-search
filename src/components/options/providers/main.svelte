<script>
import { createEventDispatcher, onMount } from "svelte";

import AddSearchProviders from "./add.svelte";
import ContextMenuItems from "./contextMenuItems.svelte";
import Groups from "./groups.svelte";

const dispatch = createEventDispatcher();

let contextMenuComponent;
let groupComponent;

export function updateForms() {
  return Promise.all([
    groupComponent.initGroups(),
    contextMenuComponent.initProvidersAndGroups(),
  ]);
}

onMount(() => {
  updateForms();
});
</script>

<div>
  <h2>Add Search Provider</h2>

  <AddSearchProviders
    on:updateMainConfiguration="{() => dispatch('updateMainConfiguration')}" />

  <h2 class="mt-4">Manage Context Menu Items</h2>

  <ContextMenuItems
    bind:this="{contextMenuComponent}"
    on:updateMainConfiguration="{() => dispatch('updateMainConfiguration')}" />

  <h2 class="mt-3">Manage Groups</h2>

  <Groups
    bind:this="{groupComponent}"
    on:updateMainConfiguration="{() => dispatch('updateMainConfiguration')}" />
</div>
