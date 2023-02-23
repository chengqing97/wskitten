#!/usr/bin/env node

import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { io } from "socket.io-client";
import { program } from "commander";
import { version } from "./package.json";
import chalk from "chalk";

program
  .name("wskitten")
  .version(version)
  .option("-c, --connect <URL>", "connect to a Socket.io server")
  .option("-a, --auth <JSON>", "credentials in stringified JSON format");

let { connect, auth } = program.parse().opts();

if (!connect) program.help();

if (!connect.match(/\w+:\/\/.*$/i)) connect = `ws://${connect}`;

const socket = io(connect);

try {
  if (auth) socket.auth = JSON.parse(auth);
} catch (error: any) {
  console.log(chalk.red(error.message));
  process.exit(1);
}

socket.on("connect", async () => {
  console.log(chalk.green("Connected (press CTRL+C to quit)"));
  const rl = readline.createInterface({ input: stdin, output: stdout });
  rl.on("SIGINT", process.exit);
  while (true) {
    const message = await rl.question("> ");
    const array = message.split(":").map((s) => s.trim());
    if (array.length === 0) continue;
    socket.emit(array[0], array.slice(1));
  }
});

socket.onAny((event, data) => {
  process.stdout.write("\r\x1b[K");
  process.stdout.write(`< ${event}: ${JSON.stringify(data)}`);
  process.stdout.write("\n> ");
});

socket.on("connect_error", (err) => {
  console.log(chalk.red.bold("error"), err.message);
  process.exit();
});

socket.on("disconnect", () => {
  process.stdout.write("\r\x1b[K");
  console.log(chalk.yellow("Disconnected"));
  process.exit();
});

socket.connect();
