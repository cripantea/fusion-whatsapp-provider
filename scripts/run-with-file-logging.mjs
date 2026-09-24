import { closeSync, existsSync, openSync, renameSync, statSync, writeSync } from "node:fs";
import { spawn } from "node:child_process";

const [, , logFile, command, ...args] = process.argv;
if (!logFile || !command) {
  console.error("Usage: node run-with-file-logging.mjs <log-file> <command> [...args]");
  process.exit(2);
}

const maxBytes = Number(process.env.LOG_MAX_BYTES ?? 10 * 1024 * 1024);
const maxFiles = Number(process.env.LOG_MAX_FILES ?? 5);

function rotate() {
  for (let index = maxFiles - 1; index >= 1; index -= 1) {
    const source = index === 1 ? logFile : `${logFile}.${index - 1}`;
    const destination = `${logFile}.${index}`;
    if (existsSync(source)) renameSync(source, destination);
  }
}

let bytesWritten = existsSync(logFile) ? statSync(logFile).size : 0;
if (bytesWritten >= maxBytes) {
  rotate();
  bytesWritten = 0;
}
let fileDescriptor = openSync(logFile, "a");
const child = spawn(command, args, { stdio: ["inherit", "pipe", "pipe"] });

function writeToFile(chunk) {
  if (bytesWritten + chunk.length > maxBytes) {
    closeSync(fileDescriptor);
    rotate();
    fileDescriptor = openSync(logFile, "a");
    bytesWritten = 0;
  }
  writeSync(fileDescriptor, chunk);
  bytesWritten += chunk.length;
}

function duplicate(stream, destination) {
  stream.on("data", (chunk) => {
    destination.write(chunk);
    writeToFile(chunk);
  });
}

duplicate(child.stdout, process.stdout);
duplicate(child.stderr, process.stderr);

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  closeSync(fileDescriptor);
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
