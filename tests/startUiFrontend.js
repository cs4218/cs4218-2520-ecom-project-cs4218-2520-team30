// Alek Kwek, A0273471A
import { spawn } from "child_process";

import { PLAYWRIGHT_CLIENT_PORT } from "./playwrightDb.js";

const npmCommand = process.platform === "win32" ? "npm" : "npm";

const child = spawn(npmCommand, ["run", "client"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    DANGEROUSLY_DISABLE_HOST_CHECK: "true",
    HOST: "127.0.0.1",
    PORT: PLAYWRIGHT_CLIENT_PORT,
    BROWSER: "none",
  },
  shell: true,
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
