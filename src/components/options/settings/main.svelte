<script>
import _ from "lodash";
import Notiflix from "notiflix";
import { DateTime } from "luxon";
import { createEventDispatcher, onMount } from "svelte";

import ConfigFile from "../../../js/shared/config_file";
import Fields from "../shared/fields.svelte";
import ImportExport from "./importExport.svelte";
import LocalStore from "../../../js/shared/local_store";
import {
  CONFIG_FILE_OPTIONS,
  MERGE_OPTIONS,
  SEARCH_RESULT_OPTIONS,
  StoreKey,
} from "../../../js/shared/constants";

const dispatch = createEventDispatcher();

// Bindings.
let lastConfigUpdate;
let lastConfigUpdateError;

onMount(() => {
  updateLastConfigUpdate();
});

function mainConfigurationUpdated(lazy) {
  if (!lazy) {
    updateLastConfigUpdate();
  }
  dispatch("updateMainConfiguration", lazy);
}

async function updateLastConfigUpdate() {
  var lastConfig = await LocalStore.getOne(StoreKey.LAST_CONFIG_DATA);

  let date = _.get(lastConfig, "date", "-");
  lastConfigUpdateError = _.get(lastConfig, "errorMsg", "");
  lastConfigUpdate = DateTime.fromSeconds(date / 1000).toLocaleString(
    DateTime.DATETIME_SHORT_WITH_SECONDS
  );
}

async function updateNow() {
  var success = await ConfigFile.updateNow();
  if (success) {
    // Update UI according to this change
    mainConfigurationUpdated();

    Notiflix.Notify.Success("The settings were refreshed");
  } else {
    // Update Last Config label to show error details.
    updateLastConfigUpdate();

    Notiflix.Notify.Failure(
      "The settings couldn't be updated, please check the URL or the file content"
    );
  }
}
</script>

<div>
  <form name="settings">
    <div class="row">
      <div class="col-lg-6">
        <div>
          <h2 class="mb-3">Configuration File Options</h2>
          <ul class="list-group">
            <Fields
              items="{CONFIG_FILE_OPTIONS}"
              on:updateMainConfiguration="{() =>
                mainConfigurationUpdated(true)}" />
            <li class="list-group-item d-flex">
              <div class="flex-1">
                <label class="mb-1" for="last-updated-on"
                  >Last Updated on:</label>
                <div id="last-updated-on">{lastConfigUpdate}</div>
                {#if !!lastConfigUpdateError}
                  <div class="text-danger">{lastConfigUpdateError}</div>
                {/if}
              </div>
              <div>
                <button
                  type="button"
                  class="btn btn-success"
                  on:click="{updateNow}">
                  <i class="fas fa-sync"></i> Update Now
                </button>
              </div>
            </li>
          </ul>
        </div>

        <div class="mt-4">
          <h2 class="mb-3">Search Results Options</h2>
          <Fields
            items="{SEARCH_RESULT_OPTIONS}"
            on:updateMainConfiguration="{() =>
              mainConfigurationUpdated(true)}" />
        </div>
      </div>

      <div class="col-lg-6">
        <h2 class="mb-2">Merge Settings Options</h2>
        <p>
          The Merge Settings Options will only be applied when you update using
          the Configuration File Options, not when you import using the
          Export/Import Search Options.
        </p>
        <Fields
          items="{MERGE_OPTIONS}"
          on:updateMainConfiguration="{() => mainConfigurationUpdated(true)}" />
      </div>
    </div>
  </form>

  <!-- Export/Import Search Options -->
  <ImportExport
    on:updateMainConfiguration="{() => mainConfigurationUpdated(false)}" />
</div>
