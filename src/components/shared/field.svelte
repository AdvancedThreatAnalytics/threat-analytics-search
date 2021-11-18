<script>
import BSN from "bootstrap.native/dist/bootstrap-native.esm.min.js";
import { createEventDispatcher, onMount } from "svelte";

export let item = {};
export let value = null;

const dispatch = createEventDispatcher();

const isCheckbox = item.type === "checkbox";
const isInput = item.type === "input";
const isDropdown = item.type === "dropdown";

function onChange(newValue) {
  if (newValue !== value) {
    dispatch("change", newValue);
  }

  dropdown.toggle();
}

let dropdown = null;
onMount(() => {
  if (isDropdown) {
    // Initialize dropdown
    dropdown = new BSN.Dropdown(
      document.getElementById(`settings_${item.key}`)
    );

    // Initialize popover
    const providers =
      item.key === "mergeSearchProviders" ? "search providers" : "queries";
    new BSN.Tooltip(document.getElementById(item.key), {
      customClass: "ml-1",
      title: `<div class='text-left'><div><strong>Merge:</strong> Adds ${providers} that aren't already in current list of ${providers}.</div><div><strong>Override:</strong> Replaces local ${providers} with new settings.</div><div><strong>Ignore:</strong> Keeps current list and ignores any incoming changes.</div></div>`,
    });
  }
});
</script>

<!-- The checkbox field -->
{#if isCheckbox}
  <li class="list-group-item">
    <div class="form-check">
      <input
        type="checkbox"
        class="form-check-input"
        name="{item.key}"
        id="settings_{item.key}"
        checked="{value ? 'checked' : ''}"
        on:change="{(e) => onChange(e.target.checked)}" />
      <label class="form-check-label" for="settings_{item.key}">
        {item.label}
      </label>
    </div>
  </li>

  <!-- The input field -->
{:else if isInput}
  <li class="list-group-item">
    <div class="form-group mb-0">
      <label class="mb-1" for="settings_{item.key}">
        {item.label}
      </label>
      <input
        type="text"
        class="form-control"
        name="{item.key}"
        id="settings_{item.key}"
        value="{value}"
        on:input="{(e) => onChange(e.target.value)}" />
    </div>
  </li>

  <!-- The dropdown field -->
{:else if isDropdown}
  <li class="list-group-item">
    <span class="dropdown">
      <button
        class="btn btn-outline-dark dropdown-toggle"
        type="button"
        name="{item.key}"
        id="settings_{item.key}"
        data-bs-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false">
        {item.menuItems.find((item) => item.key === value)?.label}
      </button>
      <div
        class="dropdown-menu"
        tabindex="-1"
        aria-labelledby="settings_{item.key}">
        {#each item.menuItems as menuItem}
          <button
            on:click="{() => onChange(menuItem.key)}"
            class="dropdown-item"
            name="{item.key}"
            value="{menuItem.key}"
            type="button">
            {menuItem.label}
          </button>
        {/each}
      </div>
    </span>
    <span class="form-check-label">
      {item.label}
    </span>
    <a data-placement="right" id="{item.key}" data-toggle="tooltip"
      ><i class="fas fa-info-circle text-info" aria-hidden="true"></i></a>
  </li>
{/if}
