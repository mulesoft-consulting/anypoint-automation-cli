const child_process = require('child_process')

module.exports = {
  getApplicationList : (anypointUser, anypointPassword, anypointEnvironmentName) => {
    var cmd = 'anypoint-cli --username=' + anypointUser + ' --password=' + anypointPassword + ' --environment=' + anypointEnvironmentName + ' runtime-mgr cloudhub-application list -o=json'
    logger.info('Executing CMD: ' + hidePasswords(cmd, [anypointPassword]))

    //Hack to overcome issue with Anypoint CLI not printing the complete stdout
    var outputFileName = "anypoint_cli_getApplicationList_output.json"
    child_process.execSync(cmd + ' > ' + outputFileName)
    console.log('Application List received (too big to show).')
    return files.readFileAsJSON(outputFileName);
  },

  deployApplication : (anypointUser, anypointPassword, anypointEnvironmentName, appName, appZipPath, properties, appExists) => {
    var cmd = 'anypoint-cli'    +
              ' --username='    + anypointUser +
              ' --password='    + anypointPassword +
              ' --environment=' + anypointEnvironmentName +
              ' --runtime='     + process.env.DEPLOYMENT_CONFIG_RUNTIME +
              ' --workers='     + process.env.DEPLOYMENT_CONFIG_WORKER_COUNT +
              ' --workerSize='  + process.env.DEPLOYMENT_CONFIG_WORKER_SIZE +
              ' --region='      + process.env.DEPLOYMENT_CONFIG_REGION +
              ' runtime-mgr cloudhub-application ' + ((appExists) ? 'modify' : 'deploy') + ' -o=json' +
              _.reduce(properties, function(acc, prop){ return acc + ' --property ' + prop; }, '') +
              ' ' + appName + ' ' + appZipPath

    logger.info('Executing CMD: ' + hidePasswords(cmd, [anypointPassword]))

    return child_process.execSync(cmd).toString()
    //return "mock child_process.execSync(cmd).toString()"
  }
}

function hidePasswords(str, hideArray) {
  hideArray.forEach(function(pass){
    str = str.replace(pass, "******")
  });
  return str;
}
