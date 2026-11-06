import { createViewStore } from "../store/views.js";
import { config } from "../config.js";

// Single store for the process, persisted under DATA_DIR.
export const views = createViewStore(config.dataDir);
