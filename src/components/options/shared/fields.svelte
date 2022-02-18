<script>
import _ from "lodash";

import Field from "./field.svelte";
import LocalStore from "../../../js/shared/local_store";
import { createEventDispatcher } from "svelte";
import { StoreKey } from "../../../js/shared/constants";

const dispatch = createEventDispatcher();

// Props
export let items = [];

// States
let itemsWithValues = {};

// Methods
async function getValue(key) {
  const data = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
  return _.get(data, key);
}

async function setValue(key, value) {
  const newSettings = _.clone(await LocalStore.getOne(StoreKey.SETTINGS)) || {};
  newSettings[key] = value;
  await LocalStore.setOne(StoreKey.SETTINGS, newSettings);
}

async function onChange(item, value) {
  await setValue(item.key, value);
  updateItemValue(item, value);
  dispatch("updateMainConfiguration");
}

// Set single item value
async function initItemValue(item) {
  const value = await getValue(item.key);
  updateItemValue(item, value);
}

function updateItemValue(item, value) {
  itemsWithValues = {
    ...itemsWithValues,
    [item.key]: {
      item,
      value,
    },
  };
}

// Initialize itemsWithValues
for (const item of items) {
  initItemValue(item);
}
</script>

<div>
  {#each Object.values(itemsWithValues) as pair (pair.item.key)}
    <Field
      item="{pair.item}"
      value="{pair.value}"
      on:change="{(event) => onChange(pair.item, event.detail)}"
      allItems="{itemsWithValues}" />
  {/each}
</div>
