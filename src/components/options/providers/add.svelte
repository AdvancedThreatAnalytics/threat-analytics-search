<script>
  import _ from "lodash";
  import Notiflix from "notiflix";
  import LocalStore from "../../../js/shared/local_store";
  import { MiscURLs, StoreKey } from "../../../js/shared/constants";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  // Constants
  const DEFAULT = {
    label: "",
    link: "",
    postEnabled: false,
    postValue: null,
    proxyEnabled: false,
    proxyUrl: null
  };

  // States
  let editData = _.clone(DEFAULT);

  // Methods
  async function add (event) {
    event.preventDefault();

    if (validate()) {
      // Add new provider
      const searchProviders = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
      searchProviders.push({
        menuIndex: -1,
        enabled: true,
        fromConfig: false,
        group: 0,
        ...editData
      });
      await LocalStore.setOne(StoreKey.SEARCH_PROVIDERS, searchProviders);

      // Clear form
      clear();

      Notiflix.Notify.Success("Option added successfully");
      dispatch("updateMainConfiguration");
    }
  }

  function validate() {
    let errMsg;
    if (_.isEmpty(editData.label) || _.isEmpty(editData.link)) {
      errMsg = "The display name and the link are required values";
    } else if (editData.postEnabled && _.isEmpty(editData.postValue)) {
      errMsg = "If POST is enabled you must provide a value";
    } else if (editData.proxyEnabled && _.isEmpty(editData.proxyUrl)) {
      errMsg = "If proxy is enabled you must provide the Proxy's URL";
    }

    if (!_.isNil(errMsg)) {
      Notiflix.Notify.Failure(errMsg);
      return false;
    }

    return true;
  }

  function clear() {
    editData = _.clone(DEFAULT);
  }
</script>

<div>
  <p>
    To add a new search option, enter the search term as "TESTSEARCH" and copy
    the complete (including http://) URL of the results page to the 'Link'
    field below. You can also use "%s" to denote search terms, or
    "TESTB64SEARCH" if you need the term Base64 encoded first. This could be
    useful when you are copy-pasting from {process.env.BROWSER_NAME} settings or trying to
    use CyberChef.
  </p>
  <p>
    Most users will not need to use the POST function. The POST function is
    useful when you want to POST (versus GET) a search term to an application
    or API. You copy the destination URL to the 'Link' field and add the raw
    POST data in the 'Add POST value' field. The HTTP POST will come from the
    {process.env.BROWSER_NAME} extension by default, which some applications/API's may not
    allow. In that case use a PROXY to send the POST.
  </p>
  <p>
    For more information visit
    <a id="extension_home_url" target="_blank" href="{MiscURLs.EXTENSION_HOME_URL}">
      {MiscURLs.EXTENSION_HOME_URL}}
    </a>.
  </p>
</div>

<div class="border rounded py-2 px-3">
  <form name="add_provider">
    <div class="row">
      <div class="col-md-4">
        <div class="form-group mb-0">
          <label class="mb-1" for="providers_name">
            Display name
          </label>
          <input
            type="text"
            class="form-control"
            name="label"
            placeholder="Label to be used in the context menu"
            id="providers_name"
            bind:value={editData.label}
          />
        </div>
      </div>
      <div class="col-md-8">
        <div class="form-group mb-0">
          <label class="mb-1" for="providers_link">Link</label>
          <input
            type="text"
            class="form-control"
            name="link"
            placeholder="URL address to which send requests"
            id="providers_link"
            bind:value={editData.link}
          />
        </div>
      </div>
    </div>
    <div class="row mt-2">
      <div class="col-md-4 align-self-center">
        <div class="form-check ml-2">
          <label class="form-check-label">
            <input
              type="checkbox"
              class="form-check-input"
              name="postEnabled"
              bind:checked={editData.postEnabled}
            />
            Add POST value
          </label>
        </div>
      </div>
      <div class="col-md-8">
        <input
          type="text"
          class="form-control text-monospace"
          name="postValue"
          placeholder="JSON object to send in POST request"
          disabled="{!editData.postEnabled}"
          bind:value={editData.postValue}
        />
      </div>
    </div>
    <div class="row mt-2">
      <div class="col-md-4 align-self-center">
        <div class="form-check ml-2">
          <label class="form-check-label">
            <input
              type="checkbox"
              class="form-check-input"
              name="proxyEnabled"
              bind:checked={editData.proxyEnabled}
            />
            Use Proxy
          </label>
        </div>
      </div>
      <div class="col-md-8">
        <input
          type="text"
          class="form-control"
          name="proxyUrl"
          placeholder="URL address of Proxy server"
          disabled="{!editData.proxyEnabled}"
          bind:value={editData.proxyUrl}
        />
      </div>
    </div>
    <div class="text-right mt-2">
      <button type="submit" class="btn btn-success" on:click={add}>
        <i class="fas fa-plus-circle" aria-hidden="true"></i> Add new option
      </button>
    </div>
  </form>
</div>