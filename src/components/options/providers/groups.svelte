<script>
import _ from "lodash";
import Notiflix from "notiflix";
import { createEventDispatcher } from "svelte";

import LocalStore from "../../../js/shared/local_store";
import { StoreKey } from "../../../js/shared/constants";

const dispatch = createEventDispatcher();

// Auxiliary variable to store initial settings.
let initialSettings;

// States.
let settings;
let groups = [];
let hideErrors = {};

// Methods.
async function initData() {
  initialSettings = await LocalStore.getOne(StoreKey.SETTINGS);
  initGroups();
}

export async function initGroups() {
  settings = await LocalStore.getOne(StoreKey.SETTINGS);
  groups = _.cloneDeep(settings?.providersGroups) || [];
}

async function onChange(index, key, value) {
  groups[index][key] = value;
  save();
}

async function reset() {
  if (confirm("Are you sure you want to undo all recents changes on groups?")) {
    // Reset data.
    groups = _.cloneDeep(initialSettings.providersGroups);
    save();

    Notiflix.Notify.Success("Recent changes on groups were undo");
  }
}

async function save() {
  settings.providersGroups = groups;
  await LocalStore.setOne(StoreKey.SETTINGS, settings);
  dispatch("updateMainConfiguration");
}

function onInput(index) {
  hideErrors[index] = true;
}

function onBlur(index) {
  hideErrors[index] = false;
}

initData();
</script>

<p>
  Groups are special items on the contextual menu that allows you to do a
  <em>bulk search</em>, executing multiple search providers at the same time.
</p>

<form name="edit_groups">
  <ul class="list-group">
    {#each groups as { name, enabled }, index}
      <li class="list-group-item" data-index="{index}">
        <div class="d-flex align-items-start">
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
              class:is-invalid="{!name && !hideErrors[index]}"
              value="{name}"
              on:input="{() => onInput(index)}"
              on:blur="{() => onBlur(index)}"
              on:change="{(e) => onChange(index, 'name', e.target.value)}" />
            <div class="invalid-feedback ml-1">
              Name should not be empty if the group is enabled
            </div>
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
