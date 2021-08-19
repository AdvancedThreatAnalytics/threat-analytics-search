const ExtensionUtil = require("./util");
const { StoreKey } = require("../../src/js/shared/constants");

const INTERCEPT_URL = "https://criticalstart.com";
const SUCCESS = "success";
const FAIL = "fail";

function interceptor(request) {
  if (request.url().includes(INTERCEPT_URL)) {
    if (request.url().includes(SUCCESS)) {
      request.respond({
        status: 200,
        body: "Success",
      });
    } else {
      request.respond({
        status: 404,
        body: "Not Found",
      });
    }
  } else {
    request.continue();
  }
}

// HACK: the 'text' is used to indicate if the request should succeed or fail.
async function testPostHandler(sample, text) {
  // Go to options page
  const page = await ExtensionUtil.goto("options.html");

  // Set sample provider on Chrome storage.
  await page.evaluate(
    (key, value) =>
      new Promise((resolve) => {
        const payload = {};
        payload[key] = [value];
        chrome.storage.local.set(payload, resolve);
      }),
    StoreKey.SEARCH_PROVIDERS,
    sample
  );

  // Set interceptor for requests.
  await page.setRequestInterception(true);
  page.on("request", interceptor);

  const targetUrl = sample.link.replace(/TESTSEARCH/g, text);
  const requestUrl = sample.proxyEnabled ? sample.proxyUrl : targetUrl;
  const responsePromise = page.waitForResponse(requestUrl);

  // Go to post handler page.
  const handlerUrl = `postHandler.html?name=${sample.label}&data=${text}`;
  await ExtensionUtil.goto(handlerUrl, page);

  // Check if POST request is made to the target or proxy URL.
  const response = await responsePromise;
  expect(response).toBeTruthy();

  // Check if post data is sent correctly.
  const expectedData = sample.proxyEnabled
    ? JSON.stringify({ url: targetUrl, data: sample.postValue })
    : sample.postValue;
  const postData = response.request().postData() || "";
  expect(postData).toEqual(expectedData);

  // Check if request result is shown in UI.
  const iconSelector = response.ok() ? ".fas.fa-check-circle" : ".fas.fa-ban";
  const resultElem = await page.waitForSelector(iconSelector);
  expect(resultElem).toBeTruthy();
}

describe("Post Handler", () => {
  let browser;

  beforeAll(async () => {
    browser = await ExtensionUtil.load();
  });

  test("POST handler with successful response", async () => {
    const SAMPLE_PROVIDER = {
      menuIndex: -1,
      enabled: true,
      fromConfig: true,
      group: 0,
      label: "Test",
      link: `${INTERCEPT_URL}/TESTSEARCH`,
      postEnabled: false,
      postValue: "",
      proxyEnabled: false,
      proxyUrl: "",
    };

    await testPostHandler(SAMPLE_PROVIDER, SUCCESS);
  });

  test("POST handler with unsuccessful response", async () => {
    const SAMPLE_PROVIDER = {
      menuIndex: -1,
      enabled: true,
      fromConfig: true,
      group: 0,
      label: "Test",
      link: `${INTERCEPT_URL}/TESTSEARCH`,
      postEnabled: true,
      postValue: "",
      proxyEnabled: false,
      proxyUrl: "",
    };

    await testPostHandler(SAMPLE_PROVIDER, FAIL);
  });

  test("POST handler with Proxy URL and POST values", async () => {
    const SAMPLE_PROVIDER = {
      menuIndex: -1,
      enabled: true,
      fromConfig: true,
      group: 0,
      label: "Test",
      link: `${INTERCEPT_URL}/TESTSEARCH`,
      postEnabled: true,
      postValue: '{ "key": "value" }',
      proxyEnabled: true,
      proxyUrl: `${INTERCEPT_URL}/proxy/${SUCCESS}`,
    };

    await testPostHandler(SAMPLE_PROVIDER, SUCCESS);
  });

  afterAll(async () => {
    await browser.close();
  });
});
