export const MiscURLs = {
  ABOUT_US_URL: "https://www.criticalstart.com/company/",
  CRITICALSTART_URL: "https://www.criticalstart.com",
  EXTENSION_HOME_URL:
    "https://github.com/AdvancedThreatAnalytics/threat-analytics-search",
  INSTALLED_URL:
    "https://www.criticalstart.com/threat-analytics-chrome-plugin/",
  ISSUES_URL:
    "https://github.com/AdvancedThreatAnalytics/threat-analytics-search/issues",
  RELEASES_URL:
    "https://github.com/AdvancedThreatAnalytics/threat-analytics-search/releases",
};

export const StoreKey = {
  CARBON_BLACK: "carbon_black",
  LAST_CONFIG_DATA: "last_config_data",
  NET_WITNESS: "netwitness_investigator",
  RSA_SECURITY: "rsa_security_analytics",
  SEARCH_PROVIDERS: "search_providers",
  SETTINGS: "settings",
};

export const CONFIG_FILE_OPTIONS = [
  {
    key: "configurationURL",
    label: "File URL",
    type: "input",
    validateEmpty: true,
    validateUrl: true,
  },
  { key: "configEncrypted", label: "Encrypted", type: "checkbox" },
  {
    key: "configEncryptionKey",
    label: "Encryption Key",
    type: "input",
    validateEmpty: true,
    validateOn: "configEncrypted",
  },
  {
    key: "autoUpdateConfig",
    label: "Update periodically (once per week)",
    type: "checkbox",
  },
  {
    key: "lastConfigUpdate",
    label: "Last Updated on:",
    type: "text",
  },
];

export const CBC_CONFIG = [
  {
    key: "CBCConfigEnable",
    type: "checkbox",
    label: "Enable Carbon Black Settings",
  },
  { key: "CBCConfigUseHttps", type: "checkbox", label: "HTTPS (SSL) Enabled" },
  {
    key: "CBCConfigHost",
    type: "text",
    label: "Carbon Black Hostname or IP Address",
  },
  {
    key: "CBCConfigPort",
    type: "text",
    label:
      "Port Number (Leave blank if port 80 and HTTP or port 443 and HTTPS)",
  },
  {
    key: "CBCConfigURLVersion",
    type: "text",
    label: "Carbon Black URL Version (Default is 1)",
  },
  {
    key: "CBCConfigNewTab",
    type: "checkbox",
    label: "Switch Focus to New Tab",
  },
  {
    key: "CBCConfigPopup",
    type: "checkbox",
    label: "Enable debug popup window",
  },
];

export const NWI_CONFIG = [
  {
    key: "NWIConfigEnable",
    type: "checkbox",
    label: "Enable NetWitness Investigator Settings",
  },
  {
    key: "NWIConfigExampleLink",
    type: "text",
    label:
      "Paste example link from NetWitness Investigator to autofill settings",
    autofiller: true,
    placeholder: "e.g. https://netwitness.com:81/?collection=12",
  },
  { key: "NWIConfigHost", type: "text", label: "Host (IP Address/Hostname)" },
  { key: "NWIConfigPort", type: "text", label: "Port Number" },
  { key: "NWIConfigCollectionName", type: "text", label: "Collection Name" },
  {
    key: "NWIConfigGMT",
    type: "checkbox",
    label: "Use GMT time (no time zone adjustment)",
  },
  {
    key: "NWIConfigRange1",
    type: "number",
    label: "Search Range 1 in Hour(s)",
  },
  {
    key: "NWIConfigRange2",
    type: "number",
    label: "Search Range 2 in Hour(s)",
  },
  {
    key: "NWIConfigRange3",
    type: "number",
    label: "Search Range 3 in Hour(s)",
  },
  {
    key: "NWIConfigRange4",
    type: "number",
    label: "Search Range 4 in Hour(s)",
  },
  {
    key: "NWIConfigPopup",
    type: "checkbox",
    label: "Enable debug popup window",
  },
];

// TODO: Should rename field names to just 'key' and 'label'.
export const MERGE_DROPDOWN_ITEMS = [
  { key: "merge", label: "Merge" },
  { key: "override", label: "Override" },
  { key: "ignore", label: "Ignore" },
];

export const MERGE_OPTIONS = [
  {
    key: "mergeSearchProviders",
    label: "Search Providers",
    type: "dropdown",
    menuItems: MERGE_DROPDOWN_ITEMS,
  },
  {
    key: "mergeGroups",
    label: "Override Group names",
    type: "checkbox",
  },
  {
    key: "mergeRSA.config",
    label: "Override Security Analytics Configuration",
    type: "checkbox",
  },
  {
    key: "mergeRSA.queries",
    label: "Security Analytics Queries",
    type: "dropdown",
    menuItems: MERGE_DROPDOWN_ITEMS,
  },
  {
    key: "mergeNWI.config",
    label: "Override Netwitness Configuration",
    type: "checkbox",
  },
  {
    key: "mergeNWI.queries",
    label: "Netwitness Queries",
    type: "dropdown",
    menuItems: MERGE_DROPDOWN_ITEMS,
  },
  {
    key: "mergeCBC.config",
    label: "Override Carbon Black Configuration",
    type: "checkbox",
  },
  {
    key: "mergeCBC.queries",
    label: "Carbon Black Queries",
    type: "dropdown",
    menuItems: MERGE_DROPDOWN_ITEMS,
  },
];

export const NWI_RANGE_LENGTH = 4;

export const RSA_CONFIG = [
  {
    key: "RSAConfigEnable",
    type: "checkbox",
    label: "Enable RSA Security Analytics Settings",
  },
  {
    key: "RSAConfigExampleLink",
    type: "text",
    label:
      "Paste example link from Security Analytics Investigation to autofill settings",
    autofiller: true,
    placeholder: "e.g. https://security.com:81/investigation/12/",
  },
  {
    key: "RSAConfigHost",
    type: "text",
    label: "Security Analytics Host (IP Address/Hostname)",
  },
  {
    key: "RSAConfigPort",
    type: "text",
    label:
      "Port Number (leave blank if port 80 and HTTP or port 443 and HTTPS)",
  },
  { key: "RSAConfigDevId", type: "text", label: "Device ID" },
  { key: "RSAConfigUseHttps", type: "checkbox", label: "HTTPS (SSL) Enabled" },
  {
    key: "RSAConfigRange1",
    type: "number",
    label: "Search Range 1 in Hour(s)",
  },
  {
    key: "RSAConfigRange2",
    type: "number",
    label: "Search Range 2 in Hour(s)",
  },
  {
    key: "RSAConfigRange3",
    type: "number",
    label: "Search Range 3 in Hour(s)",
  },
  {
    key: "RSAConfigRange4",
    type: "number",
    label: "Search Range 4 in Hour(s)",
  },
  {
    key: "RSAConfigNewTab",
    type: "checkbox",
    label: "Switch Focus to New Tab",
  },
  {
    key: "RSAConfigPopup",
    type: "checkbox",
    label: "Enable debug popup window",
  },
];

export const RSA_RANGE_LENGTH = 4;

export const SEARCH_RESULT_OPTIONS = [
  {
    key: "useGroups",
    label: "Enable groups",
    type: "checkbox",
  },
  {
    key: "resultsInBackgroundTab",
    label: "Open results in a background tab",
    type: "checkbox",
  },
  {
    key: "enableAdjacentTabs",
    label: "The new tab should be next to the current tab",
    type: "checkbox",
  },
  {
    key: "openGroupsInNewWindow",
    label: "Open group tabs in new window",
    type: "checkbox",
  },
  {
    key: "enableOptionsMenuItem",
    label: "Show link to extension options at the end of context menu",
    type: "checkbox",
  },
];

export const EXPORT_FILE_NAME = "Settings.json";

export default {
  MiscURLs,
  StoreKey,
  CBC_CONFIG,
  CONFIG_FILE_OPTIONS,
  MERGE_DROPDOWN_ITEMS,
  MERGE_OPTIONS,
  NWI_CONFIG,
  NWI_RANGE_LENGTH,
  RSA_CONFIG,
  RSA_RANGE_LENGTH,
  SEARCH_RESULT_OPTIONS,
  EXPORT_FILE_NAME,
};
