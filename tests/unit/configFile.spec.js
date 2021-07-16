import LocalStore from "../../src/js/shared/local_store";
import { StoreKey } from "../../src/js/shared/constants";

require("./util");
const ConfigFile = require("../../src/js/shared/config_file");
const defaultSettings = require("../resources/defaultSettings.json");
const encryptedSettings = require("../resources/encryptedSettings.json");

const parseJSONFile = jest.spyOn(ConfigFile.default, "parseJSONFile");
const sanitizeSettings = jest.spyOn(ConfigFile.default, "sanitizeSettings");
const updateNow = jest.spyOn(ConfigFile.default, "updateNow");

describe("configFile.js", () => {
  beforeEach(async () => {
    await sanitizeSettings();

    // Disable console's errors (used on 'updatedNow').
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it("parseJSONFile should be called with the file content and return true", async () => {
    await updateNow();
    expect(parseJSONFile).toHaveBeenCalled();
    expect(parseJSONFile).toHaveBeenCalledWith(defaultSettings, false);
    expect(updateNow).toBeTruthy();
  });

  it("parseJSONFile should be called with decrypted file content and return true", async () => {
    var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
    settings.configEncrypted = true;
    settings.configEncryptionKey = "password";
    await LocalStore.setOne(StoreKey.SETTINGS, settings);
    fetch.mockResponseOnce(encryptedSettings.encryptedData);

    const result = await updateNow();
    expect(parseJSONFile).toHaveBeenCalled();
    expect(parseJSONFile).toHaveBeenCalledWith(defaultSettings, false);
    expect(result).toBe(true);
  });

  it("errorMsg shouldn't be null if fetch throws error", async () => {
    fetch.mockAbortOnce();

    const result = await updateNow();
    var lastConfigData = await LocalStore.getOne(StoreKey.LAST_CONFIG_DATA);
    expect(lastConfigData.errorMsg).not.toBe(null);
    expect(result).toBe(false);
  });

  it("errorMsg shouldn't be null if fetch status is 400", async () => {
    fetch.mockResponseOnce(JSON.stringify(defaultSettings), { status: 400 });

    const result = await updateNow();
    var lastConfigData = await LocalStore.getOne(StoreKey.LAST_CONFIG_DATA);
    expect(lastConfigData.errorMsg).not.toBe(null);
    expect(result).toBe(false);
  });

  it("errorMsg shouldn't be null if file is encrypted but encryption is disabled", async () => {
    var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
    settings.configEncrypted = false;
    await LocalStore.setOne(StoreKey.SETTINGS, settings);
    fetch.mockResponseOnce(encryptedSettings.encryptedData);

    const result = await updateNow();
    var lastConfigData = await LocalStore.getOne(StoreKey.LAST_CONFIG_DATA);
    expect(lastConfigData.errorMsg).not.toBe(null);
    expect(result).toBe(false);
  });

  it("errorMsg shouldn't be null if file is encrypted but encryption key is wrong", async () => {
    var settings = (await LocalStore.getOne(StoreKey.SETTINGS)) || {};
    settings.configEncrypted = true;
    settings.configEncryptionKey = "wrong password";
    await LocalStore.setOne(StoreKey.SETTINGS, settings);
    fetch.mockResponseOnce(encryptedSettings.encryptedData);

    const result = await updateNow();
    var lastConfigData = await LocalStore.getOne(StoreKey.LAST_CONFIG_DATA);
    expect(lastConfigData.errorMsg).not.toBe(null);
    expect(result).toBe(false);
  });
});
