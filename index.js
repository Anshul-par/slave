import dotenv from "dotenv";
dotenv.config();

// -------------------------- CRON -------------------------------- //

const cron = require("node-cron");
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { watchDirectory } from "./watchDirectory.js"; // Assuming `watchDirectory` is exported from another file

const binaryPath = `${process.cwd()}/binaries/scrap_1`;

// Log function to write logs to a file
export function writeLog(message) {
  console.log(message);

  const logFilePath = path.join(process.cwd(), "logs.txt");

  // Check if the log file exists; if not, create it
  if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, ""); // Create an empty log file
  }

  // Append the log message with a timestamp
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`);
}

// Schedule the binary execution at 8 AM every day
cron.schedule("0 8 * * *", () => {
  console.log("Running binary at 8 AM...\n");

  // Watch the data directory for new files
  watchDirectory(path.join(process.cwd()))
    .then(() => {
      const binaryProcess = spawn(binaryPath);

      binaryProcess.stdout.on("data", (data) => {
        console.log(`Binary STDOUT: ${data}`);
      });

      binaryProcess.stderr.on("data", (data) => {
        console.error(`Binary STDERR: ${data}`);
      });

      binaryProcess.on("close", (code) => {
        console.log(`Binary process exited with code ${code}`);
      });
    })
    .catch((error) => {
      console.error(`Error watching directory: ${error.message}`);
    });
});

console.log("Scheduled job to run binary at 8 AM every day.");
