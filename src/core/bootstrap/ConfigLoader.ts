import * as fs from "fs";
import * as cluster from "cluster";
import merge = require("lodash/merge");
import { APP_PATH, isDebugMode, isCli } from "../../init";
import { config } from "../../config";
import chalk from "chalk";

export { config };

if (fs.existsSync(APP_PATH + "/config.js")) {
    // Load user-defined configurations.
    let m = require(APP_PATH + "/config.js");

    if (typeof m.config == "object") {
        merge(config, m.config);
    } else if (typeof m.default == "object") {
        merge(config, m.default);
    } else if (typeof m.env == "string") {
        merge(config, m);
    }
}

/** Whether the program is running in development mode. */
export const isDevMode = config.env == "dev" || config.env == "development"
    || isDebugMode;

if (cluster.isMaster && isDevMode && !isDebugMode && !isCli) {
    console.log("You program is running in development mode without "
        + "'--inspect' flag, please consider changing to debug environment.");
    console.log("For help, see " + chalk.yellow("https://sfnjs.com/docs/debug"));
}

if (cluster.isMaster && isDebugMode) {
    cluster.setupMaster({
        execArgv: process.execArgv.map(flag => flag.split("=")[0])
    });
}