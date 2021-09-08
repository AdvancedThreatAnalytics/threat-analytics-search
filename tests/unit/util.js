const chrome = require("sinon-chrome");
global.chrome = chrome;
global.atob = require("atob");
global.btoa = require("btoa");
const _ = require("lodash");
require("jest-fetch-mock").enableMocks();

const defaultSettings = require("../resources/defaultSettings.json");

const chromeStorageMock = (function () {
  var store = {};

  return {
    get: function (key, callback) {
      callback(store || {});
    },
    set: function (object, callback) {
      _.assign(store, object);
      callback();
    },
    clear: function (callback) {
      store = {};
      callback();
    },
  };
})();

Object.defineProperty(chrome.storage, "local", {
  value: chromeStorageMock,
});

chrome.contextMenus.create.callsFake((obj) => obj.id);

fetch.mockResponse(JSON.stringify(defaultSettings));
