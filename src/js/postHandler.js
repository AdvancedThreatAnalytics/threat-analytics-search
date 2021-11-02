import "@fortawesome/fontawesome-free/css/all.min.css";
import "../styles/theme.scss";

import App from '../components/postHandler.svelte';

const app = new App({
    target: document.getElementById('app'),
});
