/**
 * Utility for simplify interactions with the local storage.
 *
 * @deprecated: use LocalStore instead, since the local storage can't be used on service workers.
 */
const Storage = {
  setItem: function (key, value) {
    try {
      window.localStorage.removeItem(key);
      window.localStorage.setItem(key, value);
    } catch (err) {
      console.error(err);
    }
  },

  getItem: function (key) {
    var value;
    try {
      value = window.localStorage.getItem(key);
    } catch (err) {
      console.error(err);
      value = "null";
    }
    return value;
  },

  clearAll: function () {
    window.localStorage.clear();
  },
};

export default Storage;
