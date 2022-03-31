<script>
import _ from "lodash";
import { onMount } from "svelte";

import LocalStore from "../js/shared/local_store";
import { StoreKey } from "../js/shared/constants";

// Declare variables.
let targetURL = "-";
let reqData = null;

let loading = true;
let response = null;
let error = null;

// Wait for the component to be mounted before executing the initialization function.
onMount(() => {
  initialize();
});

/**
 * Executes the POST request and updates the UI accordingly.
 */
async function initialize() {
  // Parse URL's query parameters.
  const matches = location.href.match(/postHandler.html\?name=(.*)&data=(.*)/);
  let name = matches[1];
  name = decodeURIComponent(name);
  let selectionText = matches[2];
  selectionText = decodeURIComponent(selectionText);

  // Find menu's item.
  const menuItems = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
  const menuItem = _.find(menuItems, (item) => item.label === name);

  // Prepare request's parameters and URL.
  reqData = menuItem.postValue;
  reqData = reqData.replace(/TESTSEARCH/g, selectionText);
  reqData = reqData.replace(/%s/g, selectionText);

  targetURL = menuItem.link.replace(/TESTSEARCH/g, selectionText);
  targetURL = targetURL.replace(/%s/g, selectionText);

  // Update flag.
  loading = true;

  try {
    // Execute request.
    let proxyURL = null;
    if (menuItem.proxyEnabled === true) {
      proxyURL = menuItem.proxyUrl;
    }

    // Update result.
    response = await makeRequest(targetURL, reqData, proxyURL);
    error = null;
  } catch (err) {
    response = null;
    error = err;
  }

  // Update flag.
  loading = false;
}

function toString(item) {
  return _.isObject(item) && !_.isError(item)
    ? JSON.stringify(item)
    : item + "";
}

/**
 * Execute a POST request.
 *
 * @param {string} targetURL - The URL to which to send the request.
 * @param {object} reqData - The parameters to send in the body, if any.
 * @param {string} proxyURL - The URL of the proxy to use, if any.
 *
 * @returns {string|object} A promise with the request's response.
 */
async function makeRequest(targetURL, reqData, proxyURL) {
  let result;

  // Execute request.
  if (_.isEmpty(proxyURL)) {
    result = await fetch(targetURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: reqData,
    });
  } else {
    result = await fetch(proxyURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: targetURL,
        data: reqData,
      }),
    });
  }

  // Parse response.
  const data = await result.text();
  if (result.status < 200 || result.status >= 300) {
    throw new Error(data);
  }

  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}
</script>

<div>
  <table class="table" aria-busy="{loading}">
    <tbody>
      <tr>
        <td class="font-weight-bold">URL</td>
        <td><a href="{targetURL}" target="_blank">{targetURL}</a></td>
      </tr>
      <tr>
        <td class="font-weight-bold">Data</td>
        <td>
          {#if reqData}
            <span>{reqData}</span>
          {:else}
            <em>No data sent</em>
          {/if}
        </td>
      </tr>
      <tr>
        <td class="font-weight-bold">
          <div class="text-nowrap">
            Result

            {#if loading}
              <i class="fas fa-sync fa-spin text-info" aria-hidden="true"></i>
            {:else if error}
              <i class="fas fa-ban text-danger" aria-hidden="true"></i>
            {:else}
              <i class="fas fa-check-circle text-success" aria-hidden="true"
              ></i>
            {/if}
          </div>

          {#if error}
            <div class="text-center mt-1">
              <button
                type="button"
                class="btn btn-primary px-1 py-0"
                title="Retry request"
                on:click="{initialize}">
                Retry
              </button>
            </div>
          {/if}
        </td>

        <td class="w-100">
          {#if loading}
            <span class="text-info"> Executing... </span>
          {:else if error}
            <pre class="text-danger">{toString(error)}</pre>
          {:else}
            <pre>{toString(response)}</pre>
          {/if}
        </td>
      </tr>
    </tbody>
  </table>
</div>
