<script>
import _ from "lodash";
import Notiflix from "notiflix";
import { createEventDispatcher } from "svelte";
import { Sortable } from "sortablejs";

import { isUrl } from "../../../js/shared/misc";
import LocalStore from "../../../js/shared/local_store";
import { StoreKey } from "../../../js/shared/constants";

const dispatch = createEventDispatcher();

// Auxiliary variable to store initial providers
let initialProviders = [];

// Bindings.
let listGroup;

// States.
let providers = [];
let groups = [];
let hideErrors = {};

// Methods.
export async function initData() {
  initialProviders = (await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS)) || [];
  initProvidersAndGroups();

  // Make list sortable
  Sortable.create(listGroup, { handle: ".sortable-handle", onEnd: onDragEnd });
}

// Used by parent component to re-load providers and groups on new add or edit.
export async function initProvidersAndGroups() {
  providers = (await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS)) || [];
  groups = (await LocalStore.getOne(StoreKey.SETTINGS))?.providersGroups || [];
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

async function onChange(index, key, value) {
  providers[index][key] = value;
  saveProviders();
}

function onBlur(index, key) {
  hideErrors[`${index}.${key}`] = false;
}

function onInput(index, key) {
  hideErrors[`${index}.${key}`] = true;
}

async function saveProviders() {
  await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, providers);
  dispatch("updateMainConfiguration");
}

initData();
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
                  class:is-invalid="{!item.label &&
                    !hideErrors[`${index}.label`]}"
                  placeholder="Label to be used in the context menu"
                  on:input="{() => onInput(index, 'label')}"
                  on:blur="{() => onBlur(index, 'label')}"
                  on:change="{(e) =>
                    onChange(index, 'label', e.target.value)}" />
                <div class="invalid-feedback ml-1">
                  Label should not be empty
                </div>
              </div>
              <div class="flex-2 mx-2">
                <input
                  type="text"
                  value="{item.link}"
                  class="form-control text-info"
                  class:is-invalid="{!isUrl(item.link) &&
                    !hideErrors[`${index}.link`]}"
                  placeholder="URL address to which send requests"
                  on:input="{() => onInput(index, 'link')}"
                  on:blur="{() => onBlur(index, 'link')}"
                  on:change="{(e) =>
                    onChange(index, 'link', e.target.value)}" />
                <div class="invalid-feedback ml-1">
                  {item.link
                    ? "URL should be a valid URL"
                    : "URL should not be empty"}
                </div>
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
                      class="form-check-label {group.enabled
                        ? ''
                        : 'text-muted'}"
                      for="group_{index}_{groupIndex}">
                      {group.name}
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
