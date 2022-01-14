<script>
  import {
    StoreKey,
  } from "../../../js/shared/constants";
  import AddSearchProviders from "./add.svelte";
  import ContextMenuItems from "./contextMenuItems.svelte";
  import Groups from "./groups.svelte";
  import { createEventDispatcher, onMount } from "svelte";

  const dispatch = createEventDispatcher();

  // Props.
  export let initialSettings;

  let groupComponent;
  let contextMenuComponent;

  function mainConfigurationUpdated() {
    updateForms();
    dispatch("updateMainConfiguration");
  }

  function updateForms() {
    return Promise.all([
      groupComponent.initialize(),
      updateProvidersForm(),
    ]);
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
    <AddSearchProviders on:updateMainConfiguration={mainConfigurationUpdated} />

    <h2 class="mt-4">Manage Context Menu Items</h2>
    <ContextMenuItems bind:this={contextMenuComponent} on:updateMainConfiguration={mainConfigurationUpdated} />

    <h2 class="mt-3">Manage Groups</h2>
    <Groups bind:this={groupComponent} initialSettings={initialSettings} on:updateMainConfiguration={mainConfigurationUpdated} on:updateMainConfiguration={updateForms} on:updateMainConfiguration={updateProvidersForm}/>
</div>