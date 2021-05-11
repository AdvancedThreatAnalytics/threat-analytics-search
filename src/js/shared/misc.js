import _ from "lodash";

export function getGroupProviders(groupIndex, providers) {
  var mask = Math.pow(2, groupIndex);
  return _.filter(providers, function (item) {
    // Note that the group's value (from providers) uses each bit of the number for indicate to
    // which groups it belongs; so "1" (0b0001) it's for group 1, "2" (0b0010) it's for group 2,
    // "3" (0b0011) it's for groups 1 and 2, and "4" (0b0100) it's for group 3.
    return item.enabled && item.group & mask;
  });
}

export function getProviderTargetURL(provider, selectionText) {
  var targetURL;

  if (provider.postEnabled === true || provider.postEnabled === "true") {
    targetURL =
      "postHandler.html?name=" + provider.label + "&data=" + selectionText;
  } else {
    targetURL = provider.link.replace(/TESTSEARCH/g, selectionText);
    targetURL = targetURL.replace(/%s/g, selectionText);
    targetURL = targetURL.replace(
      /TESTB64SEARCH/g,
      encodeURIComponent(btoa(selectionText))
    );
  }

  return targetURL;
}

export function isDate(date) {
  return new Date(date) !== "Invalid Date" && !isNaN(new Date(date));
}

export default {
  getGroupProviders,
  getProviderTargetURL,
  isDate,
};
