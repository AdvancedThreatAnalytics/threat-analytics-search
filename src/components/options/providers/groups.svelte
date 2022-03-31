<script>
import _ from "lodash";
import Notiflix from "notiflix";
import { createEventDispatcher } from "svelte";

import LocalStore from "../../../js/shared/local_store";
import { StoreKey } from "../../../js/shared/constants";

const dispatch = createEventDispatcher();

// States.
let initialGroups;
let groups = [];
let inputErrors = {};

// Methods.
async function initData() {
  const settings = await LocalStore.getOne(StoreKey.SETTINGS);
  initialGroups = settings?.providersGroups || [];
  initGroups();
}

export async function initGroups() {
  const settings = await LocalStore.getOne(StoreKey.SETTINGS);
  groups = _.cloneDeep(settings?.providersGroups) || [];
  validateAll();
}

function validateAll() {
  for (var index = 0; index < groups.length; index++) {
    validateName(index);
  }
}

function onChange(index, key, value) {
  groups[index][key] = value;
  validateName(index);
  save();
}

function onInput(index, value) {
  groups[index].name = value;
  validateName(index, true);
}

function hasErrors(index) {
  return !_.isEmpty(inputErrors[index]);
}

// When "lazy" is 'true', errors are only updated if there was a previous error.
function validateName(index, lazy) {
  const value = groups[index].name;
  const enabled = groups[index].enabled;
  const error =
    enabled && !value
      ? "The field must not be empty if the group is enabled"
      : null;

  if (!error) {
    delete inputErrors[index];
  } else if (!lazy || !!inputErrors[index]) {
    inputErrors[index] = error;
  }
}

async function reset() {
  if (confirm("Are you sure you want to undo all recents changes on groups?")) {
    // Reset data.
    groups = _.cloneDeep(initialGroups);
    save();

    Notiflix.Notify.Success("Recent changes on groups were undo");
  }
}

async function save() {
  const settings = await LocalStore.getOne(StoreKey.SETTINGS);
  settings.providersGroups = groups;
  await LocalStore.setOne(StoreKey.SETTINGS, settings);
  dispatch("updateMainConfiguration");
}

initData();
</script>

<p>
  Groups are special items on the contextual menu that allows you to do a
  <em>bulk search</em>, executing multiple search providers at the same time.
</p>

<form name="edit_groups">
  <ul class="list-group">
    {#each groups as group, index (group)}
      <li class="list-group-item" data-index="{index}">
        <div class="d-flex align-items-start">
          <div class="p-2">
            <div class="form-check">
              <label class="form-check-label">
                <input
                  type="checkbox"
                  value="yes"
                  checked="{group.enabled ? 'checked' : ''}"
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
              class:is-invalid="{hasErrors(index)}"
              value="{group.name}"
              on:input="{(e) => onInput(index, e.target.value)}"
              on:change="{(e) => onChange(index, 'name', e.target.value)}" />
            {#if hasErrors(index)}
              <div class="invalid-feedback ml-1">
                {inputErrors[index]}
              </div>
            {/if}
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
