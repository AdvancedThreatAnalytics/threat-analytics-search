import mixpanel from "mixpanel-browser";

const analytics = {
  init: function () {
    mixpanel.init(process.env.MIXPANEL_TOKEN, {
      api_host: "https://api.mixpanel.com",
      ignore_dnt: true,
    });
  },

  initAndTrack: function (name, properties) {
    mixpanel.init("bf3d97d87d23b7e6cc636c5159c1e90d", {
      api_host: "https://api.mixpanel.com",
      ignore_dnt: true,
      loaded: function (mixpanel) {
        mixpanel.track(name, properties);
      },
    });
  },

  register: function (properties) {
    mixpanel.register(properties);
  },
};

export default analytics;
