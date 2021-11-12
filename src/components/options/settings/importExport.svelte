<script>
import _ from "lodash";
import Notiflix from "notiflix";
import { createEventDispatcher } from "svelte";
import beautify from "js-beautify";
import BSN from "bootstrap.native/dist/bootstrap-native.esm.min.js";
import ConfigFile from "../../../js/shared/config_file";
import { EXPORT_FILE_NAME } from "../../../js/shared/constants";

const dispatch = createEventDispatcher();

let editModal = null;

function closeModal() {
  editModal.dispose();
}

async function exportToFile() {
  // Generate the JSON
  let data = await ConfigFile.generateJSONFile();

  // Create a downloadable link with content. I have named the exported file to `Settings.json`
  var downloadLink = document.createElement("a");
  var blob = new Blob([JSON.stringify(data)], {
    type: "text/plain;charset=utf-8",
  });
  var url = URL.createObjectURL(blob);
  downloadLink.href = url;
  downloadLink.download = EXPORT_FILE_NAME;

  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

function fileImported(event) {
  let selectedFile = _.first(this.files);
  var reader = new FileReader();

  reader.onload = async function (event) {
    await saveSearches(event.target.result);
  };
  reader.readAsText(selectedFile);

  // Reset the value
  event.target.value = "";
}

function importFromFile() {
  document.getElementById("settings_fileInput").click();
}

async function openModal() {
  // Update text Area
  await updateJSONTextarea();
  editModal = new BSN.Modal("#settings_editModal");
  editModal.show();
}

async function saveModalChanges() {
  var changes = document.getElementById("settings_json").value;
  var success = await saveSearches(changes);

  // close Modal on success
  if (success) {
    closeModal();
  }
}

async function saveSearches(data) {
  try {
    var parsedData = JSON.parse(data);

    if (
      confirm(
        "Are you sure you want to override your local settings with these values?"
      )
    ) {
      await ConfigFile.parseJSONFile(parsedData, true);

      // Update UI according to this change
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
  var textarea = document.getElementById("settings_json");
  if (textarea) {
    if (_.isNil(newSettings)) {
      newSettings = await ConfigFile.generateJSONFile();
    }

    textarea.value = beautify(JSON.stringify(newSettings), {
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
      id="settings_fileInput"
      on:change="{fileImported}"
      type="file" />

    <div class="text-right">
      <button
        type="button"
        class="btn btn-primary mr-2"
        on:click="{importFromFile}"
        id="settings_import">
        <i class="fas fa-file-import" aria-hidden="true"></i> Import
      </button>
      <button
        type="button"
        class="btn btn-primary mr-2"
        on:click="{exportToFile}"
        id="settings_export">
        <i class="fas fa-file-export" aria-hidden="true"></i> Export
      </button>
      <button
        type="button"
        class="btn btn-secondary"
        on:click="{openModal}"
        id="settings_edit">
        <i class="fas fa-edit" aria-hidden="true"></i> Edit manually
      </button>
    </div>
  </div>
</div>

<div
  class="modal fade"
  id="settings_editModal"
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
          id="settings_closeModal"
          aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <textarea
          id="settings_json"
          class="form-control text-monospace text-small"
          rows="24">
        </textarea>
      </div>
      <div class="modal-footer">
        <button
          type="button"
          class="btn btn-secondary"
          on:click="{closeModal}"
          id="settings_discardChanges">
          Discard
        </button>
        <button
          type="button"
          class="btn btn-success mr-2"
          on:click="{saveModalChanges}"
          id="settings_saveChanges">
          Save changes
        </button>
      </div>
    </div>
  </div>
</div>
