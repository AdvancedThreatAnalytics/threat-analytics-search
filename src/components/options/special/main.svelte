<script>
import Settings from "./settings.svelte";
import Queries from "./queries.svelte";

let settings;
let queries;

export function updateForms() {
  return Promise.all([settings.initialize(), queries.initialize()]);
}
</script>

<Settings {...$$props} bind:this="{settings}" />
<Queries {...$$props} bind:this="{queries}" />
