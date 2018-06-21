// deploy-to-dev.js
// ================
exports.command = chalk.cyan('deploy') + chalk.yellow(' [options]')
exports.aliases = 'deploy'
exports.desc = 'Trigger deployment automation'
exports.builder = {
  to: {
    alias: 't',
    description: 'Target environment (e.g. dev / test / prod)',
    demand: '-t or --to is required'
  },
  from: {
    alias: 'f',
    description: 'Promote from environment (e.g. dev / test)'
  },
  assetId: {
    alias: 'a',
    description: 'Asset ID in Exchange (e.g. proc-demo-api-impl)'
  },
  assetVersion: {
    alias: 'v',
    description: 'Asset Version in Exchange (e.g. 1.0.0)'
  }
}

exports.handler = function (argv) {

  // Validate that deployment to dev can't be promoted from another environment
  if (argv.to == "dev" && argv.from != null) {
    logger.error("Environment [" + argv.to + "] can't be promoted from [" + argv.from + "] as its the lowest environment.")
    process.exit(1);
  }

  // Initial deployment can't be promoted
  if (argv.to == "dev") {
    logger.info('Deploying to ' + chalk.red('[' + argv.to + ']') + ' environment...');

    // Load required project files
    var projectArtifactId   = files.readXMLFileAsJSON("pom.xml").project.artifactId[0]
    var projectVersion      = files.readXMLFileAsJSON("pom.xml").project.version[0]
    var deployableArchive   = "./target/" + projectArtifactId + "-" + projectVersion + ".zip"
    var isApi = (files.fileExists("apiDeploymentValues.json")) ? true : false

    logger.trace('Application summary:')
    var appSummary = {
      'name': projectArtifactId,
      'version' : projectVersion,
      'location' : deployableArchive,
      'isAPI' : isApi
    }
    console.log(prettyjson.render(appSummary))

    // Infer application name from projectArtifactId + environment suffix
    var cloudhubApplicationName = projectArtifactId + "-" + process.env.CONST_APP_DEPLOYMENT_ENV_SUFFIX_DEV
    // CLI: Get Application List
    var cloudhubApplicationList = anypoint_cli.getApplicationList(
                                              process.env.ANYPOINT_USERNAME,
                                              process.env.ANYPOINT_PASSWORD,
                                              process.env.ANYPOINT_ENV_DEV_NAME)
    //console.log(prettyjson.render(cloudhubApplicationList))

    // Verify if app already exists
    var appExists = appExistsInAppList(cloudhubApplicationName, cloudhubApplicationList)

    // Load properties and additional properties from env variable (ADDITIONAL_PROPERTIES)
    var properties = [
      "\"mule.env\\=" + process.env.CONST_APP_DEPLOYMENT_ENV_SUFFIX_DEV + "\"",
      "\"anypoint.platform.client_id\\=" + process.env.ANYPOINT_ENV_DEV_CLIENT_ID + "\"",
      "\"anypoint.platform.client_secret\\=" + process.env.ANYPOINT_ENV_DEV_CLIENT_SECRET + "\"",
      "\"mule.key\\=" + process.env.APP_PROPS_ENCRYPTION_KEY_DEV + "\"",
      "\"mule.config.server.url\\=" + process.env.SPRING_CLOUD_CONFIG_SERVER + "\""
    ]

    // If application is an API
    if (isApi) {
      logger.info('Loading apiDeploymentValues.json...')
      var apiDeploymentValues = files.readFileAsJSON("apiDeploymentValues.json")
      logger.trace('Data loaded from apiDeploymentValues.json:')
      console.log(prettyjson.render(apiDeploymentValues))

      // GET: API Details from API Manager
      logger.info('Getting API details from API Manager...')
      var apiDetails = apis.apiDetails(
                                apiDeploymentValues,
                                process.env.ANYPOINT_ORG_ID,
                                process.env.ANYPOINT_ENV_DEV_ID,
                                process.env.ANYPOINT_USERNAME,
                                process.env.ANYPOINT_PASSWORD)
      // Add API specific properties
      properties = properties.concat([
        "\"api.name\\=" + apiDetails.name + "\"",
        "\"api.version\\=" + apiDetails.autodiscoveryInstanceName + "\""
      ])
    }

    // Add ADDITIONAL_DEPLOYMENT_PROPERTIES
    if (process.env.ADDITIONAL_DEPLOYMENT_PROPERTIES != null && process.env.ADDITIONAL_DEPLOYMENT_PROPERTIES != "") {
        properties = properties.concat(process.env.ADDITIONAL_DEPLOYMENT_PROPERTIES.split(","))
    }

    // CLI: Deploy Application
    var deployAppResult = anypoint_cli.deployApplication(
                                      process.env.ANYPOINT_USERNAME,
                                      process.env.ANYPOINT_PASSWORD,
                                      process.env.ANYPOINT_ENV_DEV_NAME,
                                      cloudhubApplicationName,
                                      deployableArchive,
                                      properties,
                                      appExists)

    console.log(deployAppResult)
  }
  // Promote from DEV to TEST
  else if (argv.from == "dev" && argv.to == "test") {
    logger.info('Promoting from ' + chalk.red('[' + argv.from + ']') + ' to ' + chalk.red('[' + argv.to + ']'));

    if (argv.assetVersion == null) {
      logger.info('Getting latest asset version from exchange...')
      var assetVersion = apis.getAssetInfo(process.env.ANYPOINT_ORG_ID,
                                        argv.assetId,
                                        process.env.ANYPOINT_USERNAME,
                                        process.env.ANYPOINT_PASSWORD).version
      if (assetVersion == null) {
        logger.error('Asset not found')
        process.exit(1);
      }
    } else {
      logger.info('Using provided asset version: ' + argv.assetVersion)
      var assetVersion = argv.assetVersion
    }

    // Load required project files
    var isApi = (files.fileExists("apiDeploymentValues.json")) ? true : false

    logger.trace('Application promotion summary:')
    var appSummary = {
      'to' : argv.to,
      'from' : argv.from,
      'isAPI' : isApi,
      'assetId': argv.assetId,
      'assetVersion': assetVersion
    }
    console.log(prettyjson.render(appSummary))

    // Infer application names for Source and Target environments
    var cloudhubApplicationNameSource = argv.assetId + "-" + process.env.CONST_APP_DEPLOYMENT_ENV_SUFFIX_DEV
    var cloudhubApplicationNameTarget = argv.assetId + "-" + process.env.CONST_APP_DEPLOYMENT_ENV_SUFFIX_TEST

    // CLI: Get Application List from Target environment
    var cloudhubApplicationListTarget = anypoint_cli.getApplicationList(
                                            process.env.ANYPOINT_USERNAME,
                                            process.env.ANYPOINT_PASSWORD,
                                            process.env.ANYPOINT_ENV_TEST_NAME)
    //console.log(prettyjson.render(cloudhubApplicationListTarget))

    // Verify if app already exists in Target environment
    var appExistsInTarget = appExistsInAppList(cloudhubApplicationNameTarget, cloudhubApplicationListTarget)

    // If application is an API the Promotion process will run
    if (isApi) {
      logger.info('Loading apiDeploymentValues.json...')
      var apiDeploymentValues = files.readFileAsJSON("apiDeploymentValues.json")
      logger.trace('Data loaded from apiDeploymentValues.json:')
      console.log(prettyjson.render(apiDeploymentValues))

      // GET: API Details from API Manager in DEV
      logger.info('Getting API definition details from API Manager [DEV]...')
      var apiDetailsSource = apis.apiDetails(
                                apiDeploymentValues,
                                process.env.ANYPOINT_ORG_ID,
                                process.env.ANYPOINT_ENV_DEV_ID,
                                process.env.ANYPOINT_USERNAME,
                                process.env.ANYPOINT_PASSWORD)

      logger.info('Getting API definition details from API Manager [TEST]...')
      var apiDetailsTarget = apis.apiDetails(
                                apiDeploymentValues,
                                process.env.ANYPOINT_ORG_ID,
                                process.env.ANYPOINT_ENV_TEST_ID,
                                process.env.ANYPOINT_USERNAME,
                                process.env.ANYPOINT_PASSWORD)

      // apiDetailsSource are mandatory
      if (apiDetailsSource.status == "error") {
        logger.error("Could not get API definition details from source environment API Manager: " + argv.from)
        process.exit(1);
      }

      // API Manager promotion:
      // Promote if API doesn't exist
      if (apiDetailsTarget.errors != null && apiDetailsTarget.errors[0].code == "404") {
        logger.info("API definition does not exists in target environment API Manager. Promoting API...")
        promotionDetails = apis.apiPromote(apiDeploymentValues, apiDetailsSource, process.env.ANYPOINT_ORG_ID, process.env.ANYPOINT_ENV_TEST_ID, process.env.ANYPOINT_USERNAME, process.env.ANYPOINT_PASSWORD)
      } else if (apiDetailsSource.productVersion == apiDetailsTarget.productVersion &&
                 apiDetailsSource.assetLabel == apiDetailsTarget.assetLabel &&
                 apiDetailsSource.instanceLabel == apiDetailsTarget.instanceLabel) {
        // Skip promotion if API already registered
        logger.info("API definition already exists in target environment API Manager. It will not be Promoted.")
      } else {
        // Promote if API version differs from existing one
        logger.info("API definition already exists in target environment API Manager but has a different assets version. Promoting API...")
        promotionDetails = apis.apiPromote(apiDeploymentValues, apiDetailsSource, process.env.ANYPOINT_ORG_ID, process.env.ANYPOINT_ENV_TEST_ID, process.env.ANYPOINT_USERNAME, process.env.ANYPOINT_PASSWORD)
      }
    }

    // PREPARE DEPLOYMENT PROCESS
    // Download asset
    logger.info("Downloading asset...")
    apis.downloadAsset(argv.assetId,
                       assetVersion,
                       ".zip",
                       process.env.ANYPOINT_ORG_ID,
                       process.env.ANYPOINT_USERNAME,
                       process.env.ANYPOINT_PASSWORD)

    var appDeploymentInfo = {
      deploymentType: "zip",
      zip: {
        filePath: argv.assetId + "-" + assetVersion + ".zip"
      }
    }
    // Define base application properties
    var properties = {
      "mule.env": process.env.CONST_APP_DEPLOYMENT_ENV_SUFFIX_TEST,
      "anypoint.platform.client_id": process.env.ANYPOINT_ENV_TEST_CLIENT_ID,
      "anypoint.platform.client_secret": process.env.ANYPOINT_ENV_TEST_CLIENT_SECRET,
      "mule.key": process.env.APP_PROPS_ENCRYPTION_KEY_TEST,
      "mule.config.server.url": process.env.SPRING_CLOUD_CONFIG_SERVER
    }
    // Define API related properties
    if (isApi) {
        var apiProperties = {
          "api.name": apiDetailsTarget.name,
          "api.version": apiDetailsTarget.autodiscoveryInstanceName
        }
        _.extend(properties, apiProperties)
    }
    // Define additional properties
    if (process.env.ADDITIONAL_DEPLOYMENT_PROPERTIES != null && process.env.ADDITIONAL_DEPLOYMENT_PROPERTIES != "") {
        _.extend(properties, parseProperties(process.env.ADDITIONAL_DEPLOYMENT_PROPERTIES))
    }
    // Application details
    var appData = {
      properties: properties,
      region: process.env.DEPLOYMENT_CONFIG_REGION,
      workers: {
        type: {
          name: getWorkerSizeNameFromVCores(process.env.DEPLOYMENT_CONFIG_WORKER_SIZE)
        },
        amount: process.env.DEPLOYMENT_CONFIG_WORKER_COUNT
      },
      muleVersion: {
        version: process.env.DEPLOYMENT_CONFIG_RUNTIME
      },
      monitoringEnabled: true,
      monitoringAutoRestart: true
    }
    if (appExistsInTarget) {
      // MODIFY APPLICATION
      logger.trace("appData...")
      console.log(prettyjson.render(appData))
      // Call Application update
      var responseModify = apis.appModify(cloudhubApplicationNameTarget, appData, false, appDeploymentInfo, process.env.ANYPOINT_ORG_ID, process.env.ANYPOINT_ENV_TEST_ID, process.env.ANYPOINT_USERNAME, process.env.ANYPOINT_PASSWORD)
      logger.trace(responseModify)
    } else {
      // CREATE APPLICATION
      // Adding application name for creation
      appData.domain = cloudhubApplicationNameTarget;
      logger.trace("appData...")
      console.log(prettyjson.render(appData))
      // Call Application Create
      var responseCreate = apis.appCreate(appData, appDeploymentInfo, process.env.ANYPOINT_ORG_ID, process.env.ANYPOINT_ENV_TEST_ID, process.env.ANYPOINT_USERNAME, process.env.ANYPOINT_PASSWORD)
      logger.trace(responseCreate)
    }
    logger.warn("DEPLOYMENT FINISHED SUCCESSFULLY")
  } else {
    logger.error("Environment [" + argv.to + "] not supported")
    process.exit(1);
  }
}

// Reusable functions
function appExistsInAppList(cloudhubApplicationName, cloudhubApplicationList) {
  return (_.find(cloudhubApplicationList, function(app) {
    return _.contains(app.Application.split(' '), cloudhubApplicationName);
  }) != null) ? true : false
}

/**
 * Parses strings of format key:value into object with respective
 * keys and values.
 *
 * @param {String} propStrings - String containing CSV pairs to be parsed.
 * @param {Object} appProps - Object to be updated with parsed data.
 * @returns {Object} - Containing original and parsed properties.
 */
function parseProperties (propStrings) {
  var appProps = {}
  propStrings = propStrings.split(',')
  _.each(propStrings, function (p) {
    var parts = splitPropertyArg(p)
    appProps[parts[0]] = parts[1]
  })
  return appProps
}

/**
 * Split key:value or key=value pair by separator.
 *
 * @param {String} p - String to be split.
 * @throws {Error} - If input has invalid format.
 * @returns {Array} - Split values of format [key, value]
 */
function splitPropertyArg (p) {
  p = p.replace('\\=', '=').replace('\\:', ':').replace('=', ':')
  var found = p.indexOf(':')
  if (found < 0) {
    throw new Error('Invalid property format, expected name:value but was ' + p)
  }
  return [p.substring(0, found).trim(), p.substring(found + 1).trim()]
}

function getWorkerSizeNameFromVCores (vCores) {
  switch (vCores) {
    case "0.1":
      return 'Micro'
    case "0.2":
      return 'Small'
    case "1":
      return 'Medium'
    case "2":
      return 'Large'
    case "4":
      return 'xLarge'
    default:
      throw new Error('Invalid workerSize. Valid values are 0.1, 0.2, 1, 2, 4')
  }
}
