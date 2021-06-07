import mixpanel from "mixpanel-browser";

const analytics = {
  init: function () {
    mixpanel.init(process.env.MIXPANEL_TOKEN, {
      api_host: "https://api.mixpanel.com",
      ignore_dnt: true,
    });
  },

  track: function (name, properties) {
    mixpanel.track(name, properties);
  },

  register: function (properties) {
    mixpanel.register(properties);
  },
};

export default analytics;
