<script>
import BSN from "bootstrap.native/dist/bootstrap-native.esm.min.js";
import { createEventDispatcher, onMount } from "svelte";

const dispatch = createEventDispatcher();

// Props
export let item = {};
export let value = null;

// Auxiliary variables
let dropdown = null;

// Bindings
let dropdownButton;
let popoverIcon;
let popoverTitle;

// Computed variables
$: isCheckbox = item.type === "checkbox";
$: isInput = item.type === "input";
$: isDropdown = item.type === "dropdown";
$: providers =
  item.key === "mergeSearchProviders" ? "search providers" : "queries";

// Methods
function onChange(newValue) {
  if (newValue !== value) {
    dispatch("change", newValue);
  }

  if (isDropdown) {
    dropdown.toggle();
  }
}

// Hooks
onMount(() => {
  if (isDropdown) {
    // Initialize dropdown
    dropdown = new BSN.Dropdown(dropdownButton);

    // Initialize popover
    new BSN.Tooltip(popoverIcon, {
      title: popoverTitle.outerHTML,
      customClass: "ml-1",
    });
  }
});
</script>

<!-- The checkbox field -->
{#if isCheckbox}
  <li class="list-group-item">
    <div class="form-check">
      <label class="form-check-label">
        <input
          type="checkbox"
          class="form-check-input"
          name="{item.key}"
          checked="{value ? 'checked' : ''}"
          on:change="{(e) => onChange(e.target.checked)}" />

        {item.label}
      </label>
    </div>
  </li>

  <!-- The input field -->
{:else if isInput}
  <li class="list-group-item">
    <div class="form-group mb-0">
      <label class="mb-1 w-100">
        {item.label}
        <input
          type="text"
          class="form-control"
          name="{item.key}"
          value="{value}"
          on:input="{(e) => onChange(e.target.value)}" />
      </label>
    </div>
  </li>

  <!-- The dropdown field -->
{:else if isDropdown}
  <li class="list-group-item">
    <span class="dropdown">
      <button
        bind:this="{dropdownButton}"
        class="btn btn-outline-dark dropdown-toggle"
        type="button"
        name="{item.key}"
        data-bs-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false">
        {item.menuItems.find((item) => item.key === value)?.label}
      </button>
      <div class="dropdown-menu" tabindex="-1">
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
    <i
      bind:this="{popoverIcon}"
      class="fas fa-info-circle text-info"
      aria-hidden="true"
      data-toggle="tooltip"
      data-placement="right"></i>
    <div class="d-none">
      <div bind:this="{popoverTitle}" class="text-left">
        <div>
          <strong>Merge:</strong>
          Adds {providers} that aren't already in current list of {providers}.
        </div>
        <div>
          <strong>Override:</strong>
          Replaces local {providers} with new settings.
        </div>
        <div>
          <strong>Ignore:</strong>
          Keeps current list and ignores any incoming changes.
        </div>
      </div>
    </div>
  </li>
{/if}
