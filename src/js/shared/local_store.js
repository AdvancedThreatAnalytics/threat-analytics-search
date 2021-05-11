/**
 * Utility to wrap calls to Chrome local storage in Promises.
 */
const LocalStore = {
  set: function (keysAndValues) {
    return new Promise(function (resolve, reject) {
      chrome.storage.local.set(keysAndValues, function () {
        if (typeof chrome.runtime !== "undefined" && chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },

  setOne: function (key, value) {
    var payload = {};
    payload[key] = value;
    return LocalStore.set(payload);
  },

  get: function (keys) {
    return new Promise(function (resolve, reject) {
      chrome.storage.local.get(keys, function (result) {
        if (typeof chrome.runtime !== "undefined" && chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  },

  getOne: function (key) {
    return LocalStore.get([key]).then(function (result) {
      return result[key];
    });
  },

  clear: function () {
    return new Promise(function (resolve, reject) {
      chrome.storage.local.clear(function () {
        if (typeof chrome.runtime !== "undefined" && chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },
};

export default LocalStore;
