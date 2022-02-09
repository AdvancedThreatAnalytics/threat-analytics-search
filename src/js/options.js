import "@fortawesome/fontawesome-free/css/all.min.css";
import "notiflix/dist/notiflix-2.7.0.min.css";
import "../styles/theme.scss";

import "../css/main.css";

import Options from "../components/options/main.svelte";

new Options({
  target: document.getElementById("options"),
});
