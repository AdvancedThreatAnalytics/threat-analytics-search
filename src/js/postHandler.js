import "@fortawesome/fontawesome-free/css/all.min.css";
import "../styles/theme.scss";

import { mount } from "svelte";
import App from "../components/postHandler.svelte";

mount(App, {
  target: document.getElementById("app"),
});
