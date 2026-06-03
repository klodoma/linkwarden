import { spawn } from "node:child_process";

function launch() {
  const child = spawn("tsx", ["worker.ts"], { stdio: "inherit", shell: true });

  child.on("exit", (code, signal) => {
    console.error(
      `worker exited (code=${code} signal=${signal}) – restarting…`
    );
    setTimeout(launch, 5000);
  });
}

process.on("SIGINT", () => process.exit());

launch();
