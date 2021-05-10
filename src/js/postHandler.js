import "@fortawesome/fontawesome-free/css/all.min.css";
import "bootstrap/dist/css/bootstrap.min.css";

import _ from "lodash";
import Mustache from "mustache";

import {
  StoreKey,
  LocalStore
} from "./utils";

// Wait for the page to be loaded to execute the initialization function.
document.addEventListener("DOMContentLoaded", function() {
  init();
});

/**
 * Updates the screen using Mustache.
 *
 * @param {object} params - An object with the variable's values.
 */
function updateUI(params) {
  // Add default values to parameters and parse them to string if need.
  params = _.transform(_.assign({
    targetURL: '-',
    reqData: null,
    response: null,
    loading: false,
    error: false
  }, params), function(result, value, key) {
    result[key] = _.isObject(value) ? JSON.stringify(value, null, 4) : value;
  });

  // Add 'computed' properties.
  params.busy = params.loading + '';
  params.resultClass = params.error && !params.loading ? "text-danger" : "";
  params.succeeded = !params.loading && !params.error && !_.isEmpty(params.response);

  // Replace template.
  var template = document.getElementById('template').innerHTML;
  var rendered = Mustache.render(template, params);
  document.getElementById('target').innerHTML = rendered;

  // Add click listener to retry button (if rendered).
  var retryBtn = document.getElementById('retryBtn');
  if(!_.isNil(retryBtn)) {
     retryBtn.addEventListener('click', init);  
  }
}

/**
 * Initialize the screen.
 */
async function init() {
  // Parse URL's query parameters.
  var matches = location.href.match(/postHandler.html\?name=(.*)&data=(.*)/);
  var name = matches[1];
  name = decodeURIComponent(name);
  var selectionText = matches[2];
  selectionText = decodeURIComponent(selectionText);

  // Find menu's item.
  var menuItems = await LocalStore.getOne(StoreKey.SEARCH_PROVIDERS);
  var itemIndex = _.findIndex(menuItems, function(item) {
    return item.label === name;
  });
  var menuItem = menuItems[itemIndex]

  // Prepare request's parameters and URL.
  var reqData = menuItem.postValue;
  reqData = reqData.replace(/TESTSEARCH/g, selectionText);
  reqData = reqData.replace(/%s/g, selectionText);

  var targetURL = menuItem.link.replace(/TESTSEARCH/g, selectionText);
  targetURL = targetURL.replace(/%s/g, selectionText);

  // Update UI with parameters.
  var initParams = {
    targetURL: targetURL,
    reqData: reqData,
    loading: true
  }
  updateUI(initParams);

  try {
    // Execute request.
    var proxyURL = null;
    if (menuItem.proxyEnabled === true) {
      proxyURL = menuItem.proxyUrl;
    }
    var response = await makeRequest(targetURL, reqData, proxyURL);

    // Update UI with response.
    updateUI(_.assign({}, initParams, {
      response: response,
      loading: false
    }));
  } catch (err) {
    // Update UI with error.
    updateUI(_.assign({}, initParams, {
      response: err + '',
      loading: false,
      error: true
    }));
  }
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
  var response;

  // Execute request.
  if (_.isEmpty(proxyURL)) {
    response = await fetch(targetURL, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: _.isObject(reqData) ? JSON.stringify(reqData) : null
    });
  } else {
    response = await fetch(proxyURL, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "url": targetURL,
        "data": reqData
      })
    });

  }

  // Parse response.
  var data = await response.text();
  if (response.status < 200 || response.status >= 300) {
    throw new Error(data);
  }
  return JSON.parse(data);
}
