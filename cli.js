#!/usr/bin/env node

// cli.js
// ======
global.prettyjson    = require('prettyjson');
global.chalk         = require('chalk');
global.clear         = require('clear');
global.figlet        = require('figlet');
global._             = require('underscore');
global.files         = require('./lib/files');
global.anypoint_cli  = require('./lib/anypoint-cli');
global.prereqs       = require('./lib/prereqs');
global.apis          = require('./lib/apis');
global.logger        = require('./lib/logger');

// Determine how to load environment properties
if (process.env.ANYPOINT_AUTO_CLI_BUILD_TOOL != null) {
  var envPath = __dirname + '/.env_' + process.env.ANYPOINT_AUTO_CLI_BUILD_TOOL
  global.env = require('dotenv').config({path: envPath})
  logger.info('Loading properties from: ' + envPath)
  if (!files.fileExists(envPath)) {
    logger.error("Env file not found")
    process.exit(1);
  }
} else if (process.env.ANYPOINT_AUTO_CLI_CUSTOM_ENV_VARS_PATH != null){
  global.env = require('dotenv').config({path: process.env.ANYPOINT_AUTO_CLI_CUSTOM_ENV_VARS_PATH})
  logger.info('Loading properties from: ' + process.env.ANYPOINT_AUTO_CLI_CUSTOM_ENV_VARS_PATH)
  if (!files.fileExists(process.env.ANYPOINT_AUTO_CLI_CUSTOM_ENV_VARS_PATH)) {
    logger.error("Env file not found")
    process.exit(1);
  }
} else {
  logger.error("Either ANYPOINT_AUTO_CLI_BUILD_TOOL or ANYPOINT_AUTO_CLI_CUSTOM_ENV_VARS_PATH env variable needs to be provided")
  process.exit(1);
}

// Load CLI title
clear();
console.log(
  chalk.yellow(
    figlet.textSync('Anypoint Automation CLI', { horizontalLayout: 'full'})
  )
);
console.log("\n")

// Validate pre-requisites
prereqs.validatePreReqs()

const run = async () => {
  require('yargs')
    .usage('Usage: <command> [options]')
    .commandDir('cmds')
    .demandCommand()
    .help()
    .argv
}

run();
