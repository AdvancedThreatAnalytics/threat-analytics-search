import { MiscURLs } from "./constants";

const analytics = {
  track: function (event, properties) {
    const encodedParams = new URLSearchParams();
    encodedParams.set(
      "data",
      JSON.stringify({
        event,
        properties: {
          ...properties,
          distinct_id: "" + chrome.runtime.id,
          token: "" + process.env.MIXPANEL_TOKEN,
        },
      })
    );
    const options = {
      method: "POST",
      headers: {
        Accept: "text/plain",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: encodedParams,
    };
    fetch(MiscURLs.MIXPANEL_TRACK_URL, options).catch((err) =>
      console.error("error:" + err)
    );
  },
};

export default analytics;
