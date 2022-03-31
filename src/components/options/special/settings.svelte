<script>
import _ from "lodash";
import { onMount } from "svelte";

import LocalStore from "../../../js/shared/local_store";
import providerTabHelper from "../../../js/shared/provider_helper";

// Props.
export let form = "";
export let configTitle = "";
export let initData = {};
export let isRSA = false;
export let settings = [];
export let storageKey = null;

let items = [];

const providerHelper = providerTabHelper(initData, storageKey);

export async function initialize() {
  var provData = (await LocalStore.getOne(storageKey)) || {};

  items = _.map(settings, function (item) {
    var value = _.get(provData.config, item.key);
    return _.assignIn(
      {
        isCheckbox: item.type === "checkbox",
        value: value || "",
        checked: value === true || value === "true" ? "checked" : "",
        placeholder: item.placeholder || "",
      },
      item
    );
  });
}

async function onConfigAutofillerChanged(event) {
  // Parse input value.
  var newValue = _.get(event, "target.value");
  var parsedValues = isRSA
    ? providerHelper.rsaAutofillerParser(newValue)
    : providerHelper.nwiAutofillerParser(newValue);
  if (!_.isEmpty(parsedValues)) {
    // Add also autofiller value.
    parsedValues.push({
      key: _.get(event, "target.name"),
      value: newValue,
    });

    // Save values.
    await providerHelper._updateLocalStoreData("config", parsedValues);

    // Reset form.
    await initialize();
  }
}

async function onConfigInputChanged(event) {
  const targetName = _.get(event, "target.name");
  if (!_.isEmpty(targetName)) {
    // Save new value.
    await providerHelper._updateLocalStoreData("config", [
      {
        key: targetName,
        value:
          event.target.type === "checkbox"
            ? event.target.checked
            : event.target.value,
      },
    ]);
  }
}

async function undoConfigChanges(event) {
  event.preventDefault();
  providerHelper._undoChanges("config", "configuration", initialize);
}

onMount(async () => {
  await initialize();
});
</script>

<h2>{configTitle}</h2>

<form name="{form}Config">
  <div class="row">
    {#each items as item, index (item)}
      <div class="col-md-6 align-self-end">
        {#if item.isCheckbox}
          <div class="form-check my-3">
            <input
              type="checkbox"
              class="form-check-input"
              name="{item.key}"
              id="checkbox_{item.key}"
              checked="{item.checked ? 'checked' : ''}"
              value="yes"
              on:click="{onConfigInputChanged}" />
            <label class="form-check-label" for="checkbox_{item.key}">
              {item.label}
            </label>
          </div>
        {:else if item.autofiller}
          <div class="mt-2">
            <label class="mb-0" for="autofiller_{item.key}">{item.label}</label>
            <input
              type="{item.type}"
              class="form-control"
              name="{item.key}"
              id="autofiller_{item.key}"
              placeholder="{item.placeholder}"
              value="{item.value}"
              on:change="{onConfigAutofillerChanged}" />
          </div>
        {:else}
          <div class="mt-2">
            <label class="mb-0" for="subSettings_{item.key}"
              >{item.label}</label>
            <input
              type="{item.type}"
              class="form-control"
              name="{item.key}"
              id="subSettings_{item.key}"
              placeholder="{item.placeholder}"
              value="{item.value}"
              on:change="{onConfigInputChanged}" />
          </div>
        {/if}
      </div>
    {/each}
  </div>
  <div class="text-right">
    <button
      type="reset"
      class="btn btn-outline-danger"
      on:click="{undoConfigChanges}">
      <i class="fas fa-undo" aria-hidden="true"></i> Undo recent changes</button>
  </div>
</form>
