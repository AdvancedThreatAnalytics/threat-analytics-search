<script>
import _ from "lodash";
import Notiflix from "notiflix";
import { createEventDispatcher, onMount } from "svelte";
import { Sortable } from "sortablejs";

import { isUrl, isSearchable } from "../../../js/shared/misc";
import LocalStore from "../../../js/shared/local_store";
import { StoreKey } from "../../../js/shared/constants";

const dispatch = createEventDispatcher();

// Auxiliary variable to store initial providers.
let initialProviders = [];

// Bindings.
let listGroup;

// States.
let providers = [];
let inputErrors = {};
let groups = [];
let inputWarnings = {};

// Methods.

onMount(() => {
  initData();
});

export async function initData() {
  initialProviders = (await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS)) || [];
  initProvidersAndGroups();

  // Make list sortable
  Sortable.create(listGroup, { handle: ".sortable-handle", onEnd: onDragEnd });
}

// Used by parent component to re-load providers and groups on new add or edit.
export async function initProvidersAndGroups() {
  providers = (await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS)) || [];
  validateAllProviders();
  groups = (await LocalStore.getOne(StoreKey.SETTINGS))?.providersGroups || [];
}

function validateAllProviders() {
  for (var index = 0; index < providers.length; index++) {
    validateInput(index, "label");
    validateInput(index, "link");
  }
}

function remove(index) {
  if (confirm("Are you sure you want to remove this item?")) {
    providers.splice(index, 1);
    providers = providers;
    saveProviders();

    Notiflix.Notify.Success("Item removed");
  }
}

function reset() {
  if (
    confirm("Are you sure you want to undo all recents changes on menu items?")
  ) {
    providers = _.cloneDeep(initialProviders);
    saveProviders();

    Notiflix.Notify.Success("Recent changes on menu items were undo");
  }
}

function onDragEnd(event) {
  // Move provider
  providers.splice(event.newIndex, 0, providers.splice(event.oldIndex, 1)[0]);
  providers = providers;
  saveProviders();
}

function onChange(index, key, value) {
  providers[index][key] = value;
  saveProviders();
}

function onInput(index, key, value) {
  providers[index][key] = value;
  validateInput(index, key, true);
}

$: getError = function (index, key) {
  return inputErrors[`${index}.${key}`];
};

$: hasError = function (index, key) {
  return !_.isEmpty(getError(index, key));
};

$: getWarning = function (index) {
  return inputWarnings[index];
};

$: hasWarning = function (index) {
  return !_.isEmpty(getWarning(index));
};

// "isActive" is 'true', when user is typing on the input field.
// It is used not to add any warning or error when user is typing.
function validateInput(index, key, isActive) {
  const value = providers[index][key];
  const error = !value
    ? "The field must not be empty"
    : key === "link" && !isUrl(value)
    ? "The value must be a valid URL"
    : null;

  const warning =
    key === "link" && !error && !isSearchable(value)
      ? "The link contains neither TESTSEARCH nor TESTB64SEARCH"
      : null;

  const errKey = `${index}.${key}`;
  if (!error) {
    delete inputErrors[errKey];
  } else if (!isActive || !!inputErrors[errKey]) {
    inputErrors[errKey] = error;
  }

  if (!warning) {
    delete inputWarnings[index];
  } else if (!isActive) {
    inputWarnings[index] = warning;
  }
}

async function saveProviders() {
  await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, providers);
  dispatch("updateMainConfiguration");
}
</script>

<form name="manage_providers">
  <ul bind:this="{listGroup}" role="list" class="list-group">
    {#each providers as item, index (item)}
      <li role="listitem" class="list-group-item sortable pl-1 pr-2 py-3">
        <div class="d-flex align-items-center">
          <div class="sortable-handle px-2 py-3 mr-1">
            <i class="fas fa-arrows-alt text-extra-large" aria-hidden="true"
            ></i>
          </div>

          <div class="flex-1">
            <div class="d-flex align-items-start">
              <div class="flex-1">
                <input
                  type="text"
                  value="{item.label}"
                  class="form-control text-black"
                  class:is-invalid="{hasError(index, 'label')}"
                  placeholder="Label to be used in the context menu"
                  name="label_{index}"
                  on:input="{(e) => onInput(index, 'label', e.target.value)}"
                  on:blur="{() => validateInput(index, 'label')}"
                  on:change="{(e) =>
                    onChange(index, 'label', e.target.value)}" />
                {#if hasError(index, "label")}
                  <div class="invalid-feedback ml-1">
                    {getError(index, "label")}
                  </div>
                {/if}
              </div>
              <div class="flex-2 mx-2">
                <input
                  type="text"
                  value="{item.link}"
                  class="form-control text-info"
                  class:is-invalid="{hasError(index, 'link')}"
                  placeholder="URL address to which send requests"
                  on:input="{(e) => onInput(index, 'link', e.target.value)}"
                  on:blur="{() => validateInput(index, 'link')}"
                  on:change="{(e) =>
                    onChange(index, 'link', e.target.value)}" />
                {#if hasError(index, "link")}
                  <div class="invalid-feedback ml-1">
                    {getError(index, "link")}
                  </div>
                {/if}
                {#if hasWarning(index)}
                  <div class="text-warning text-small ml-1 mt-1">
                    {getWarning(index)}
                  </div>
                {/if}
              </div>
              <div class="form-check mx-2">
                <input
                  type="checkbox"
                  value="yes"
                  checked="{item.enabled ? 'checked' : ''}"
                  class="form-check-input"
                  id="providers_enabled_{index}"
                  on:change="{(e) =>
                    onChange(index, 'enabled', e.target.checked)}" />
                <label class="form-check-label" for="providers_enabled_{index}">
                  Enabled
                </label>
              </div>
              <div>
                <button
                  type="button"
                  class="btn btn-outline-danger py-0 px-1"
                  title="Delete"
                  on:click="{() => remove(index)}">
                  <i class="fas fa-minus-circle" aria-hidden="true"></i>
                  Delete
                </button>
              </div>
            </div>

            {#if item.postEnabled}
              <div class="mt-2 d-flex align-items-center">
                <span class="text-nowrap mr-2">POST Value</span>
                <input
                  type="text"
                  value="{item.postValue}"
                  class="form-control text-monospace"
                  placeholder="JSON object to send in POST request"
                  on:change="{(e) =>
                    onChange(index, 'postValue', e.target.value)}" />
              </div>
            {/if}

            {#if item.proxyEnabled}
              <div class="mt-2 d-flex align-items-center">
                <span class="text-nowrap mr-2">Proxy URL</span>
                <input
                  type="text"
                  value="{item.proxyUrl}"
                  class="form-control"
                  placeholder="URL address of Proxy server"
                  on:change="{(e) =>
                    onChange(index, 'proxyUrl', e.target.value)}" />
              </div>
            {/if}

            <div class="d-flex align-items-center justify-content-between mt-2">
              <div class="d-flex align-items-center pl-1">
                <div class="text-muted">Groups:</div>
                {#each groups as group, groupIndex}
                  <div class="form-check mx-2">
                    <input
                      type="checkbox"
                      value="{groupIndex + 1}"
                      checked="{item.group & Math.pow(2, groupIndex)
                        ? 'checked'
                        : ''}"
                      class="form-check-input"
                      id="group_{index}_{groupIndex}"
                      disabled="{group.enabled ? '' : 'disabled'}"
                      on:change="{() =>
                        onChange(
                          index,
                          'group',
                          item.group ^ Math.pow(2, groupIndex)
                        )}" />
                    <label
                      class="form-check-label"
                      class:text-muted="{!group.enabled}"
                      class:font-italic="{!group.name}"
                      for="group_{index}_{groupIndex}">
                      {group.name || "(not set)"}
                    </label>
                  </div>
                {/each}
              </div>
              <div>
                Source:
                {#if item.fromConfig}
                  <span
                    class="text-secondary"
                    title="This provider was added by the configuration file">
                    <i class="fas fa-file-alt" aria-hidden="true"></i>
                    Config
                  </span>
                {:else}
                  <span
                    class="text-secondary"
                    title="This provider was defined by an user">
                    <i class="fas fa-user" aria-hidden="true"></i>
                    User
                  </span>
                {/if}
              </div>
            </div>
          </div>
        </div>
      </li>
    {/each}
  </ul>

  <div class="text-right mt-2">
    <button type="button" class="btn btn-outline-danger" on:click="{reset}">
      <i class="fas fa-undo" aria-hidden="true"></i>
      Undo recent changes
    </button>
  </div>
</form>
