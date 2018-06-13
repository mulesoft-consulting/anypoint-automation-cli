module.exports = {
  validatePreReqs : () => {
    var commandExistsSync = require('command-exists').sync;

    if (commandExistsSync('anypoint-cli')) {
    } else {
      logger.error("anypoint-cli is required but it's not installed")
      process.exit(1);
    }
    if (process.env.ANYPOINT_USERNAME == null) {
      logger.error("Environment variables not set correctly")
      process.exit(1);
    }
  }
}