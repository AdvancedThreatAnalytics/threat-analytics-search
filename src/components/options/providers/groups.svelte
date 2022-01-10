<script>
import { createEventDispatcher } from "svelte";
import Notiflix from "notiflix";
import LocalStore from "../../../js/shared/local_store";
import { StoreKey } from "../../../js/shared/constants";

// Props.
export let initialSettings;

let groups = [];
const dispatch = createEventDispatcher();

// Methods.
export async function initialize() {
  groups = (await LocalStore.getOne(StoreKey.SETTINGS))?.providersGroups || [];
}

async function onChange(index, key, value) {
  var settings = await LocalStore.getOne(StoreKey.SETTINGS);
  settings.providersGroups[index][key] = value;
  await LocalStore.setOne(StoreKey.SETTINGS, settings);

  dispatch("updateProvidersForm");
  dispatch("updateMainConfiguration");
}

async function reset() {
  if (confirm("Are you sure you want to undo all recents changes on groups?")) {
    // Reset data.
    var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
    settings.providersGroups = initialSettings.providersGroups;
    await LocalStore.setOne(StoreKey.SETTINGS, settings);

    Notiflix.Notify.Success("Recent changes on groups were undo");

    dispatch("updateForm");
    dispatch("updateMainConfiguration");
  }
}
</script>

<p>
  Groups are special items on the contextual menu that allows you to do a
  <em>bulk search</em>, executing multiple search providers at the same time.
</p>

<form name="edit_groups">
  <ul class="list-group">
    {#each groups as { name, enabled }, index}
      <li class="list-group-item" data-index="{index}">
        <div class="d-flex align-items-center">
          <div class="p-2">
            <div class="form-check">
              <label class="form-check-label">
                <input
                  type="checkbox"
                  value="yes"
                  checked="{enabled ? 'checked' : ''}"
                  class="form-check-input"
                  id="providers_editGroups_enabled_{index}"
                  on:change="{(e) =>
                    onChange(index, 'enabled', e.target.checked)}" />
                Enabled
              </label>
            </div>
          </div>
          <div class="flex-grow-1">
            <input
              type="text"
              class="form-control"
              value="{name}"
              on:change="{(e) => onChange(index, 'name', e.target.value)}" />
          </div>
        </div>
      </li>
    {/each}
  </ul>

  <div class="text-right mt-2">
    <button
      type="button"
      class="btn btn-outline-danger"
      on:click|preventDefault="{reset}">
      <i class="fas fa-undo" aria-hidden="true"></i>
      Undo recent changes
    </button>
  </div>
</form>
