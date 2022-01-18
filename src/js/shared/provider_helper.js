import _ from "lodash";
import Notiflix from "notiflix";
import LocalStore from "./local_store";

function providerTabHelper(initData, storageKey) {
  const tab = {
    rsaAutofillerParser: function (link) {
      try {
        if (!_.isEmpty(link)) {
          var ssl = link.search(/https:/) == 0 ? true : false;
          var temp = link.match(/:\/\/([^:/?]*)(:(\d+)|[/?])/);
          var hostname = temp ? (temp[1] ? temp[1] : "") : "";
          var port = temp ? (temp[3] ? temp[3] : "") : "";
          temp = link.match(/investigation\/([^/]*)\//);
          var devId = temp ? (temp[1] ? temp[1] : "") : "";

          return [
            { key: "RSAConfigEnable", value: true },
            { key: "RSAConfigUseHttps", value: ssl },
            { key: "RSAConfigHost", value: hostname },
            { key: "RSAConfigPort", value: port },
            { key: "RSAConfigDevId", value: devId },
          ];
        }
      } catch (err) {
        // Do nothing.
      }
      return null;
    },

    nwiAutofillerParser: function (link) {
      try {
        if (!_.isEmpty(link)) {
          var temp = link.match(/:\/\/([^:/?]*)(:(\d+)|[/?])/);
          var hostname = temp ? (temp[1] ? temp[1] : "") : "";
          var port = temp ? (temp[3] ? temp[3] : "") : "";
          temp = link.match(/collection=([^&]*)/);
          var collectionName = temp ? (temp[1] ? temp[1] : "") : "";

          return [
            { key: "NWIConfigEnable", value: true },
            { key: "NWIConfigHost", value: hostname },
            { key: "NWIConfigPort", value: port },
            { key: "NWIConfigCollectionName", value: collectionName },
          ];
        }
      } catch (err) {
        // Do nothing.
      }
      return null;
    },

    // --- Utilities --- //

    _updateLocalStoreData: async function (field, newValues, override) {
      // Get current data.
      var fullData = (await LocalStore.getOne(storageKey)) || {};
      var subData = fullData[field] || {};

      // Update values.
      if (override) {
        subData = newValues;
      } else {
        _.forEach(newValues, function (item) {
          subData[item.key] = item.value;
        });
      }

      // Save new values.
      fullData[field] = subData;
      await LocalStore.setOne(storageKey, fullData);

      chrome.runtime.sendMessage({ action: "updateContextualMenu" });
    },

    _undoChanges: async function (field, name, resetForm) {
      if (
        confirm(`Are you sure you want to undo all recents changes on ${name}?`)
      ) {
        // Reset data.
        var oldData = initData[storageKey];
        await tab._updateLocalStoreData(field, oldData[field], true);

        // Reset form and show confirmation message.
        resetForm();
        Notiflix.Notify.Success(`Recent changes on ${name} were undo`);
      }
    },
  };

  return tab;
}

export default providerTabHelper;
