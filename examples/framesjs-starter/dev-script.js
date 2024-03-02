const { spawn } = require("child_process");

const scriptName = process.env.FJS_MONOREPO ? "dev:monorepo" : "dev:starter";
const child = spawn("npm", ["run", scriptName], { stdio: "inherit" });

child.on("error", (error) => {
  console.error(`spawn error: ${error}`);
});
