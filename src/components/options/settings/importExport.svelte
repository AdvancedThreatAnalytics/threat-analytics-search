<script>
import _ from "lodash";
import beautify from "js-beautify";
import BSN from "bootstrap.native/dist/bootstrap-native.esm.min.js";
import Notiflix from "notiflix";
import { createEventDispatcher } from "svelte";

import ConfigFile from "../../../js/shared/config_file";
import { EXPORT_FILE_NAME } from "../../../js/shared/constants";

const dispatch = createEventDispatcher();

// Auxiliary variables.
let editModal = null;

// Bindings.
let fileInput;
let modalElem;
let modalTextarea;

function closeModal() {
  editModal.dispose();
}

async function exportToFile() {
  // Generate the JSON.
  const data = await ConfigFile.generateJSONFile();

  // Create a downloadable link with content. I have named the exported file to 'Settings.json'.
  const downloadLink = document.createElement("a");
  const blob = new Blob([JSON.stringify(data)], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  downloadLink.href = url;
  downloadLink.download = EXPORT_FILE_NAME;

  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

function fileImported(event) {
  const selectedFile = _.first(this.files);
  const reader = new FileReader();

  reader.onload = async function (event) {
    await saveSearches(event.target.result);
  };
  reader.readAsText(selectedFile);

  // Reset the value.
  event.target.value = "";
}

function importFromFile() {
  fileInput.click();
}

async function openModal() {
  // Update textarea.
  await updateJSONTextarea();
  editModal = new BSN.Modal(modalElem);
  editModal.show();
}

async function saveModalChanges() {
  const success = await saveSearches(modalTextarea.value);

  // Close modal on success.
  if (success) {
    closeModal();
  }
}

async function saveSearches(data) {
  try {
    const parsedData = JSON.parse(data);

    if (
      confirm(
        "The defined Merge Settings Options will not be applied. If you continue, all current settings will be overridden by the settings you are importing."
      )
    ) {
      await ConfigFile.parseJSONFile(parsedData, true);

      // Update UI according to this change.
      dispatch("updateMainConfiguration");

      Notiflix.Notify.Success("New configuration saved");
      return true;
    }
  } catch (err) {
    console.error(err);
    Notiflix.Notify.Failure(
      "Configuration couldn't be saved. Please verify that the file is valid."
    );
    return false;
  }
}

async function updateJSONTextarea(newSettings) {
  if (modalTextarea) {
    if (_.isNil(newSettings)) {
      newSettings = await ConfigFile.generateJSONFile();
    }

    modalTextarea.value = beautify(JSON.stringify(newSettings), {
      indent_size: 2,
    });
  }
}
</script>

<div class="row">
  <div class="col-md-10 offset-md-1">
    <h2 class="text-center mt-3">Export/Import Search Options</h2>

    <p>
      Use Import and Export to share settings using a file. Otherwise, click
      Edit to modify the settings manually. This requires knowing JSON
      formatting well. We also recommend exporting a copy of your settings prior
      to doing this.
    </p>

    <input
      class="d-none"
      bind:this="{fileInput}"
      on:change="{fileImported}"
      type="file" />

    <div class="text-right">
      <button
        type="button"
        class="btn btn-primary mr-2"
        on:click="{importFromFile}">
        <i class="fas fa-file-import" aria-hidden="true"></i> Import
      </button>
      <button
        type="button"
        class="btn btn-primary mr-2"
        on:click="{exportToFile}">
        <i class="fas fa-file-export" aria-hidden="true"></i> Export
      </button>
      <button type="button" class="btn btn-secondary" on:click="{openModal}">
        <i class="fas fa-edit" aria-hidden="true"></i> Edit manually
      </button>
    </div>
  </div>
</div>

<div
  class="modal fade"
  bind:this="{modalElem}"
  tabindex="-1"
  role="dialog"
  aria-labelledby="settingsEditModal"
  aria-hidden="true">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Edit Changes</h5>
        <button
          type="button"
          class="close"
          on:click="{closeModal}"
          aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

      <div class="modal-body">
        <textarea
          bind:this="{modalTextarea}"
          class="form-control text-monospace text-small"
          rows="24">
        </textarea>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" on:click="{closeModal}">
          Discard
        </button>
        <button
          type="button"
          class="btn btn-success mr-2"
          on:click="{saveModalChanges}">
          Save changes
        </button>
      </div>
    </div>
  </div>
</div>
