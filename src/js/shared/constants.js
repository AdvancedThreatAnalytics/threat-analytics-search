export const MiscURLs = {
  ABOUT_US_URL: "https://www.criticalstart.com/company/",
  EXTENSION_HOME_URL: "https://github.com/AdvancedThreatAnalytics/threat-analytics-search",
  INSTALLED_URL: "https://www.criticalstart.com/threat-analytics-chrome-plugin/",
  ISSUES_URL: "https://github.com/AdvancedThreatAnalytics/threat-analytics-search/issues",
};

export const BasicConfig = {
  CONFIG_URL: 0,
  USE_GROUPS: 1,
  ENCRYPTED: 2,
  ENCRIPTION_KEY: 3,
  AUTO_UPDATE: 4,
};

export const StoreKey = {
  CARBON_BLACK: "carbon_black",
  LAST_CONFIG_DATA: "last_config_data",
  NET_WITNESS: "netwitness_investigator",
  RSA_SECURITY: "rsa_security_analytics",
  SEARCH_PROVIDERS: "search_providers",
  SETTINGS: "settings",
};

export const CBC_CONFIG = [
  { key: "CBCConfigEnable", type: "checkbox", label: "Enable Carbon Black Settings" },
  { key: "CBCConfigUseHttps", type: "checkbox", label: "HTTPS (SSL) Enabled" },
  { key: "CBCConfigHost", type: "text", label: "Carbon Black Hostname or IP Address" },
  { key: "CBCConfigPort", type: "text", label: "Port Number (Leave blank if port 80 and HTTP or port 443 and HTTPS)" },
  { key: "CBCConfigURLVersion", type: "text", label: "Carbon Black URL Version (Default is 1)" },
  { key: "CBCConfigNewTab", type: "checkbox", label: "Switch Focus to New Tab" },
  { key: "CBCConfigPopup", type: "checkbox", label: "Enable debug popup window" },
];

export const NWI_CONFIG = [
  { key: "NWIConfigEnable", type: "checkbox", label: "Enable NetWitness Investigator Settings" },
  { key: "NWIConfigExampleLink", type: "text", label: "Paste example link from NetWitness Investigator to autofill settings", autofiller: true, placeholder: "e.g. https://netwitness.com:81/?collection=12" },
  { key: "NWIConfigHost", type: "text", label: "Host (IP Address/Hostname)" },
  { key: "NWIConfigPort", type: "text", label: "Port Number" },
  { key: "NWIConfigCollectionName", type: "text", label: "Collection Name" },
  { key: "NWIConfigGMT", type: "checkbox", label: "Use GMT time (no time zone adjustment)" },
  { key: "NWIConfigRange1", type: "number", label: "Search Range 1 in Hour(s)" },
  { key: "NWIConfigRange2", type: "number", label: "Search Range 2 in Hour(s)" },
  { key: "NWIConfigRange3", type: "number", label: "Search Range 3 in Hour(s)" },
  { key: "NWIConfigRange4", type: "number", label: "Search Range 4 in Hour(s)" },
  { key: "NWIConfigPopup", type: "checkbox", label: "Enable debug popup window" },
];

export const NWI_RANGE_LENGTH = 4;

export const RSA_CONFIG = [
  { key: "RSAConfigEnable", type: "checkbox", label: "Enable RSA Security Analytics Settings" },
  { key: "RSAConfigExampleLink", type: "text", label: "Paste example link from Security Analytics Investigation to autofill settings", autofiller: true, placeholder: "e.g. https://security.com:81/investigation/12/" },
  { key: "RSAConfigHost", type: "text", label: "Security Analytics Host (IP Address/Hostname)" },
  { key: "RSAConfigPort", type: "text", label: "Port Number (leave blank if port 80 and HTTP or port 443 and HTTPS)" },
  { key: "RSAConfigDevId", type: "text", label: "Device ID" },
  { key: "RSAConfigUseHttps", type: "checkbox", label: "HTTPS (SSL) Enabled" },
  { key: "RSAConfigRange1", type: "number", label: "Search Range 1 in Hour(s)" },
  { key: "RSAConfigRange2", type: "number", label: "Search Range 2 in Hour(s)" },
  { key: "RSAConfigRange3", type: "number", label: "Search Range 3 in Hour(s)" },
  { key: "RSAConfigRange4", type: "number", label: "Search Range 4 in Hour(s)" },
  { key: "RSAConfigNewTab", type: "checkbox", label: "Switch Focus to New Tab" },
  { key: "RSAConfigPopup", type: "checkbox", label: "Enable debug popup window" },
];

export const RSA_RANGE_LENGTH = 4;

export const exportFileName = "Settings.json";

export default {
  MiscURLs,
  BasicConfig,
  StoreKey,
  CBC_CONFIG,
  NWI_CONFIG,
  NWI_RANGE_LENGTH,
  RSA_CONFIG,
  RSA_RANGE_LENGTH,
  exportFileName
};
