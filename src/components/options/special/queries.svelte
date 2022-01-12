<script>
import _ from "lodash";
import Notiflix from "notiflix";
import { onMount } from "svelte";
import { Sortable } from "sortablejs";

import LocalStore from "../../../js/shared/local_store";
import providerTabHelper from "../../../js/shared/provider_helper";

// Props.
export let initData = {};
export let form = "";
export let storageKey = null;

// Computed variables.
$: items = [];
$: newLabel = "";
$: newQuery = "";

const providerHelper = providerTabHelper(initData, storageKey);

async function addQuery() {
  // Validate values.
  if (!newLabel || !newQuery) {
    Notiflix.Notify.Failure("The label and the query are required values");
    return;
  }

  // Add new option.
  var queries = _.get(await LocalStore.getOne(storageKey), "queries", []);
  queries.push({
    menuIndex: -1,
    label: newLabel,
    query: newQuery,
    enabled: true,
  });
  await providerHelper._updateLocalStoreData("queries", queries, true);

  // Clear form.
  newLabel = "";
  newQuery = "";

  // Update UI according to this change and show success message.
  initialize();
  Notiflix.Notify.Success("Query added successfully");
}

async function initialize() {
  items = _.get(await LocalStore.getOne(storageKey), "queries", []);

  // Make list sortable.
  Sortable.create(
    document.querySelector(`form[name="${form}Queries"] ul.list-group`),
    { handle: ".sortable-handle", onEnd: onQueryDragged }
  );
}

async function onQueryInputChanged(event) {
  if (event.target.type === "checkbox") {
    const targetName = _.get(event, "target.name");
    items[targetName].enabled = event.target.checked;
  }
  await providerHelper._updateLocalStoreData("queries", items, true);
}

async function onQueryDragged(event) {
  // Move query.
  var queries = _.get(await LocalStore.getOne(storageKey), "queries", []);
  queries.splice(event.newIndex, 0, queries.splice(event.oldIndex, 1)[0]);
  await providerHelper._updateLocalStoreData("queries", queries, true);

  // NOTE: Updating the form is required because the 'index' is being used as unique ID for each item.
  initialize();
}

async function removeQuery(index) {
  if (confirm("Are you sure you want to remove this query?")) {
    // Remove query.
    var queries = _.get(await LocalStore.getOne(storageKey), "queries", []);
    queries.splice(index, 1);
    await providerHelper._updateLocalStoreData("queries", queries, true);

    // Update UI according to this change and show success message.
    initialize();
    Notiflix.Notify.Success("Query removed");
  }
}

function undoQueriesChanges() {
  return providerHelper._undoChanges("queries", "queries", initialize);
}

onMount(async () => {
  await initialize();
});
</script>

<h3>Manage Pivot Queries</h3>

<form name="{form}Queries">
  <ul class="list-group">
    {#each items as item, index}
      <li class="list-group-item sortable pl-1 pr-2 py-3" data-index="{index}">
        <div class="d-flex align-items-center">
          <div class="sortable-handle p-2">
            <i class="fas fa-arrows-alt text-large" aria-hidden="true"></i>
          </div>

          <div class="flex-1 mx-2">
            <input
              type="text"
              bind:value="{item.label}"
              class="form-control text-black"
              placeholder="Label to be used in the context menu"
              name="label_{index}"
              on:change="{onQueryInputChanged}" />
          </div>

          <div class="flex-2 mx-2">
            <input
              type="text"
              bind:value="{item.query}"
              class="form-control text-info"
              placeholder="Query to be used on the requests"
              name="query_{index}"
              on:change="{onQueryInputChanged}" />
          </div>

          <div class="form-check mx-2">
            <input
              type="checkbox"
              value="yes"
              checked="{item.enabled ? 'checked' : ''}"
              class="form-check-input"
              name="{index}"
              id="{form}_enabled_{index}"
              on:click="{onQueryInputChanged}" />
            <label class="form-check-label" for="{form}_enabled_{index}">
              Enabled
            </label>
          </div>

          <div>
            <button
              type="button"
              class="btn btn-outline-danger py-0 px-1"
              title="Delete"
              name="delete_{index}"
              on:click="{() => removeQuery(index)}">
              <i class="fas fa-minus-circle" aria-hidden="true"></i>
              Delete
            </button>
          </div>
        </div>
      </li>
    {/each}

    <li class="list-group-item pl-1 pr-2">
      <div class="d-flex align-items-center">
        <div class="px-2 py-3">
          <i
            class="fas fa-plus text-extra-large text-primary"
            aria-hidden="true"></i>
        </div>

        <div class="flex-1 mx-2">
          <input
            type="text"
            bind:value="{newLabel}"
            class="form-control text-black"
            placeholder="Label to be used in the context menu"
            name="label_new"
            on:change="{onQueryInputChanged}" />
        </div>

        <div class="flex-2 mx-2">
          <input
            type="text"
            bind:value="{newQuery}"
            class="form-control text-info"
            placeholder="Query to be used on the requests"
            name="query_new"
            on:change="{onQueryInputChanged}" />
        </div>

        <div>
          <button
            type="button"
            class="btn btn-success"
            title="Add"
            name="add_new"
            on:click="{addQuery}">
            <i class="fas fa-plus-circle" aria-hidden="true"></i>
            Add new query
          </button>
        </div>
      </div>
      <div
        class="alert alert-info text-small py-1 px-2 mt-2 ml-1 mb-0"
        role="alert">
        To add a new query, replace the search term with "TESTSEARCH" in your
        query and copy the query to the 'Query' field below.
      </div>
    </li>
  </ul>
  <div class="text-right mt-2">
    <button
      type="reset"
      class="btn btn-outline-danger"
      on:click="{undoQueriesChanges}">
      <i class="fas fa-undo" aria-hidden="true"></i> Undo recent changes</button>
  </div>
</form>
