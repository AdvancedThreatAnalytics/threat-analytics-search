<script>
import _ from "lodash";
import Notiflix from "notiflix";
import { createEventDispatcher } from "svelte";

import { isUrl } from "../../../js/shared/misc"
import LocalStore from "../../../js/shared/local_store";
import { MiscURLs, StoreKey } from "../../../js/shared/constants";

const dispatch = createEventDispatcher();

// Constants.
const DEFAULT = {
  label: "",
  link: "",
  postEnabled: false,
  postValue: null,
  proxyEnabled: false,
  proxyUrl: null,
};

// States.
let editData = _.clone(DEFAULT);
let errors = {};

// Methods.
async function add() {
  if (validate()) {
    // Add new provider
    const searchProviders = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
    searchProviders.push({
      menuIndex: -1,
      enabled: true,
      fromConfig: false,
      group: 0,
      ...editData,
    });
    await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, searchProviders);

    // Clear form
    clear();

    Notiflix.Notify.Success("Option added successfully");
    dispatch("updateMainConfiguration");
  }
}

function validate() {
  errors = {};
  const errMsg = "Some fields are empty or have invalid values";

  if (_.isEmpty(editData.label)) {
    errors.label = true;
  }

  if (!isUrl(editData.link)) {
    errors.link = true;
  }

  if (editData.postEnabled && (_.isEmpty(editData.postValue) || !isJson(editData.postValue))) {
    errors.postValue = true;
  }

  if (editData.proxyEnabled && !isUrl(editData.proxyUrl)) {
    errors.proxyUrl = true;
  }

  if (!_.isEmpty(errors)) {
    Notiflix.Notify.Failure(errMsg);
    return false;
  }

  return true;
}

function isJson(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }

  return true;
}

function onInput(name) {
  delete errors[name];
  errors = errors;
}

function clear() {
  editData = _.clone(DEFAULT);
  errors = {};
}
</script>

<div>
  <p>
    To add a new search option, enter the search term as "TESTSEARCH" and copy
    the complete (including http://) URL of the results page to the 'Link' field
    below. You can also use "%s" to denote search terms, or "TESTB64SEARCH" if
    you need the term Base64 encoded first. This could be useful when you are
    copy-pasting from {process.env.BROWSER_NAME} settings or trying to use CyberChef.
  </p>
  <p>
    Most users will not need to use the POST function. The POST function is
    useful when you want to POST (versus GET) a search term to an application or
    API. You copy the destination URL to the 'Link' field and add the raw POST
    data in the 'Add POST value' field. The HTTP POST will come from the
    {process.env.BROWSER_NAME} extension by default, which some applications/API's
    may not allow. In that case use a PROXY to send the POST.
  </p>
  <p>
    For more information visit
    <a
      id="extension_home_url"
      target="_blank"
      href="{MiscURLs.EXTENSION_HOME_URL}">
      {MiscURLs.EXTENSION_HOME_URL}}
    </a>.
  </p>
</div>

<div class="border rounded py-2 px-3">
  <form name="add_provider">
    <div class="row">
      <div class="col-md-4">
        <div class="form-group mb-0">
          <label class="mb-1" for="providers_name"> Display name </label>
          <input
            type="text"
            class="form-control"
            class:is-invalid={errors.label}
            name="label"
            placeholder="Label to be used in the context menu"
            id="providers_name"
            bind:value="{editData.label}"
            on:input={(e) => onInput("label")} />
          <div class="invalid-feedback ml-1">
            Display name should not be empty
          </div>
        </div>
      </div>
      <div class="col-md-8">
        <div class="form-group mb-0">
          <label class="mb-1" for="providers_link">Link</label>
          <input
            type="text"
            class="form-control"
            class:is-invalid={errors.link}
            name="link"
            placeholder="URL address to which send requests"
            id="providers_link"
            bind:value="{editData.link}"
            on:input={(e) => onInput("link")} />
          <div class="invalid-feedback ml-1">
            {editData.link ? "Link should be a valid URL" : "Link should not be empty"}
          </div>
        </div>
      </div>
    </div>

    <div class="row mt-2">
      <div class="col-md-4">
        <div class="form-check ml-2 mt-2">
          <label class="form-check-label">
            <input
              type="checkbox"
              class="form-check-input"
              name="postEnabled"
              bind:checked="{editData.postEnabled}" />
            Add POST value
          </label>
        </div>
      </div>
      <div class="col-md-8">
        <input
          type="text"
          class="form-control text-monospace"
          class:is-invalid={errors.postValue}
          name="postValue"
          placeholder="JSON object to send in POST request"
          disabled="{!editData.postEnabled}"
          bind:value="{editData.postValue}"
          on:input={(e) => onInput("postValue")} />
        <div class="invalid-feedback ml-1">
          {editData.postValue ? "Value should be a valid JSON object" : "Value should not be empty if post is enabled"}
        </div>
      </div>
    </div>

    <div class="row mt-2">
      <div class="col-md-4">
        <div class="form-check ml-2 mt-2">
          <label class="form-check-label">
            <input
              type="checkbox"
              class="form-check-input"
              name="proxyEnabled"
              bind:checked="{editData.proxyEnabled}" />
            Use Proxy
          </label>
        </div>
      </div>
      <div class="col-md-8">
        <input
          type="text"
          class="form-control"
          class:is-invalid={errors.proxyUrl}
          name="proxyUrl"
          placeholder="URL address of Proxy server"
          disabled="{!editData.proxyEnabled}"
          bind:value="{editData.proxyUrl}"
          on:input={(e) => onInput("proxyUrl")} />
        <div class="invalid-feedback ml-1">
          {editData.proxyUrl ? "URL should be a valid URL" : "URL should not be empty if proxy is enabled"}
        </div>
      </div>
    </div>

    <div class="text-right mt-2">
      <button
        type="submit"
        class="btn btn-success"
        on:click|preventDefault="{add}">
        <i class="fas fa-plus-circle" aria-hidden="true"></i> Add new option
      </button>
    </div>
  </form>
</div>
