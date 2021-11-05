<script>
import { DateTime } from "luxon";

import { MiscURLs } from "../../js/shared/constants";

const year = DateTime.now().year;
const HOME_URL = MiscURLs.CRITICALSTART_URL;
</script>

<footer class="text-center mt-3 pb-2">
  <hr class="my-2" />
  <small class="text-muted">
    Copyright 2015-{year} &copy; CRITICALSTART. All rights reserved.
    <br /><a href="{HOME_URL}" target="_blank">{HOME_URL}</a>
  </small>
</footer>
