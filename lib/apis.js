const request = require('sync-request');
const requestAsync = require('request');

module.exports = {
  //=================//
  //== CUSTOM APIs ==//
  //=================//
  /**
   * Gets the API details using APIM Experience API (api-manager-exp)
   *
   * @param apiDeploymentValues
   *  Content extracted from the apiDeploymentValues.json
   * @param orgId
   *  Organization Id
   * @param envId
   *  Environment Id
   * @param anypointUser
   *  Anypoint platform user
   * @param anypointPassword
   *  Anypoint platform password
   * @return
   *  API details from API Manager
   */
   apiDetails : (apiDeploymentValues, orgId, envId, anypointUser, anypointPassword) => {
     logger.info("Calling api-manager-exp GET:/retrieve...", true)
     var url = process.env.API_URL_API_MANAGER_EXP + '/api/apimanager/retrieve/organization/' + orgId + '/environment/' + envId;
     logger.trace(url, true)
     var queryParams = {
       assetId: apiDeploymentValues.apiName,
       pVer: apiDeploymentValues.apiVersion,
       instanceLabel: (apiDeploymentValues.instanceLabel != null) ? apiDeploymentValues.instanceLabel : null,
       assetVersion: apiDeploymentValues.assetVersion
     }
     // Cleaning null instanceLabel
     if (queryParams.instanceLabel == null) {
       delete queryParams['instanceLabel']
     }
     var headers = {
       'Content-Type': 'application/json',
       authorization: 'Basic ' + new Buffer(anypointUser + ':' + anypointPassword, 'ascii').toString('base64')
     }
     logger.trace("Query Parameters:")
     console.log(prettyjson.render(queryParams))

     try {
       var res = request('GET', url, {
         headers: headers,
         qs: queryParams
       });
     } catch (e){
       logger.error(e)
       logger.error("Could not get API details from envId: " + envId)
       process.exit(1)
     }
     logger.trace("\nResponse from api-manager-exp:")
     var jsonResp = JSON.parse(res.body)
     console.log(prettyjson.render(jsonResp))
     return jsonResp
   },
   /**
    * Promote API registration in APIM using APIM Experience API (api-manager-exp)
    *
    * @param apiDeploymentValues
    *  Content extracted from the apiDeploymentValues.json
    * @param apiDetailsSource
    *  API details from APIM in source environment
    * @param orgIdTarget
    *  Target Organization Id
    * @param envIdTarget
    *  Target Environment Id
    * @param anypointUser
    *  Anypoint platform user
    * @param anypointPassword
    *  Anypoint platform password
    * @return
    *  Result of API promotion
    */
   apiPromote : (apiDeploymentValues, apiDetailsSource, orgIdTarget, envIdTarget, anypointUser, anypointPassword) => {
     logger.info("Calling api-manager-exp POST:/promote...", true)
     var url = process.env.API_URL_API_MANAGER_EXP + '/api/apimanager/promote/organization/' + orgIdTarget + '/environment/' + envIdTarget;
     logger.trace(url, true)
     var headers = {
       'Content-Type': 'application/json',
       authorization: 'Basic ' + new Buffer(anypointUser + ':' + anypointPassword, 'ascii').toString('base64')
     }
     var body = {
       instanceLabel: apiDetailsSource.instanceLabel,
       promote: {
         originApiId: apiDetailsSource.apiId,
         policies:{
            allEntities: apiDeploymentValues.promotePolicies
         },
         tiers: {
           allEntities: apiDeploymentValues.promoteTiers
         },
         alerts: {
           allEntities: apiDeploymentValues.promoteAlerts
         }
       }
     }
     // Cleaning null instanceLabel
     if (body.instanceLabel == null) {
       delete body['instanceLabel']
     }
     logger.trace("Sending body:")
     console.log(prettyjson.render(body))
     try {
       var res = request('POST', url, {
         headers: headers,
         json: body
       });
     } catch (e){
       logger.error(e)
       logger.error("Could not promote API to target environment")
       process.exit(1)
     }
     logger.trace("\nResponse from api-manager-exp")
     var jsonResp = JSON.parse(res.body)
     console.log(prettyjson.render(jsonResp))
     return jsonResp
   },
   //============================//
   //== Anypoint Platform APIs ==//
   //============================//
   /**
    * Gets the Application details from CloudHub
    *
    * @param appName
    *  CloudHub application name
    * @param orgId
    *  Organization Id
    * @param envId
    *  Environment Id
    * @param anypointUser
    *  Anypoint platform user
    * @param anypointPassword
    *  Anypoint platform password
    * @return
    *  Application details per environment from CloudHub
    */
    appEnvDetails : (appName, orgId, envId, anypointUser, anypointPassword) => {
      logger.info("Calling CloudHub API GET:/environments/{envId}/applications...", true)
      var url = 'https://anypoint.mulesoft.com/cloudhub/api/environments/' + envId + '/applications/' + appName;
      logger.trace(url, true)
      var headers = getSecurityHeaders(orgId, envId, anypointUser, anypointPassword)
      try {
        var res = request('GET', url, {
          headers: headers
        });
      } catch (e){
        logger.error(e)
        logger.error("Could not get Application details from envId: " + envId)
        process.exit(1)
      }
      logger.trace("\nResponse from CloudHub API GET:/environments/{envId}/applications")
      var jsonResp = JSON.parse(res.body)
      console.log(prettyjson.render(jsonResp))
      return jsonResp
    },
   /**
    * Gets the Application details from CloudHub
    *
    * @param appName
    *  CloudHub application name
    * @param orgId
    *  Organization Id
    * @param envId
    *  Environment Id
    * @param anypointUser
    *  Anypoint platform user
    * @param anypointPassword
    *  Anypoint platform password
    * @return
    *  Application details from CloudHub
    */
    appDetails : (appName, orgId, envId, anypointUser, anypointPassword) => {
      logger.info("Calling CloudHub API GET:/applications...", true)
      var url = 'https://anypoint.mulesoft.com/cloudhub/api/v2/applications/' + appName;
      logger.trace(url, true)
      var headers = getSecurityHeaders(orgId, envId, anypointUser, anypointPassword)

      try {
        var res = request('GET', url, {
          headers: headers
        });
      } catch (e){
        logger.error(e)
        logger.error("Could not get Application details from envId: " + envId)
        process.exit(1)
      }
      logger.trace("\nResponse from CloudHub API GET:/applications")
      var jsonResp = JSON.parse(res.body)
      console.log(prettyjson.render(jsonResp))
      return jsonResp
    },
    /**
     * Creates a new Application in CloudHub based on a deployment artifact from a zip file or from a sandbox
     *
     * @param appData
     *  CloudHub application details
     * @param appDeploymentInfo
     *  Deployment info object that indicates if the update includes a new deployment artifact:
     *  {
     *    deploymentType: enum(zip, sandbox),
     *    zip: {
     *      filePath: "/blah"
     *    },
     *    sandbox: {
     *      appName: "my-app-dev",
     *      envId: "874c1957-5b22-47ea-956a-70243b6103a8"
     *    }
     *  }
     * @param orgId
     *  Organization Id
     * @param envId
     *  Environment Id
     * @param anypointUser
     *  Anypoint platform user
     * @param anypointPassword
     *  Anypoint platform password
     * @return
     *  Creation details
     */
    appCreate : (appData, appDeploymentInfo, orgId, envId, anypointUser, anypointPassword) => {
      logger.info("Calling CloudHub API POST:/applications...", true)
      var url = 'https://anypoint.mulesoft.com/cloudhub/api/v2/applications/';
      logger.trace(url, true)
      // Create base request
      var req = {}
      // Requires new deployment artifact?
      if (appDeploymentInfo == null) {
        logger.error("appDeploymentInfo is required")
        process.exit(1)
      }
      if (appDeploymentInfo.deploymentType == "zip") {
        logger.info("Deploying application from Zip file: " + appDeploymentInfo.zip.filePath)
        if (!files.fileExists(appDeploymentInfo.zip.filePath)) {
          logger.error(appDeploymentInfo.zip.filePath + " does not exist")
          process.exit(1)
        }
        // Extend request
        req.formData = {
          appInfoJson: JSON.stringify(appData),
          autoStart: 'true',
          file: files.loadFileAsStream(appDeploymentInfo.zip.filePath)
        };
      } else if (appDeploymentInfo.deploymentType == "sandbox") {
        logger.info("Deploying application from Sandbox...")
        logger.trace("Source application details")
        console.log(prettyjson.render(appDeploymentInfo.sandbox))
        if (appDeploymentInfo.sandbox.appName == null || appDeploymentInfo.sandbox.envId == null) {
          logger.error("appDeploymentInfo.sandbox.appName and appDeploymentInfo.sandbox.envId are required")
          process.exit(1)
        }
        var sourceAppData = apis.appEnvDetails(appDeploymentInfo.sandbox.appName, orgId, appDeploymentInfo.sandbox.envId, anypointUser, anypointPassword)
        // Extend request
        req.json = {
          applicationInfo: appData,
          applicationSource: {
              source: "SANDBOX",
              fileSource: sourceAppData.applicationId,
              fileChecksum: sourceAppData.fileHash
          },
          autoStart: true
        }
      } else {
        logger.error("appDeploymentInfo.deploymentType should be zip or sandbox")
        process.exit(1)
      }
      console.log('\n')
      // Extend request
      req.url = url
      req.headers = getSecurityHeaders(orgId, envId, anypointUser, anypointPassword)

      //POST application
      requestAsync.post(req, function callBack(err, response, body) {
        if (err) {
          logger.error(err);
          logger.error("Could not create Application " + req.applicationInfo.domain + " in envId: " + envId)
          process.exit(1)
        }
        logger.trace("\nResponse from CloudHub API POST:/applications")
        logger.trace("\nCode: " + response.statusCode)
        console.log(prettyjson.render(body))
      });
      return "\nExecuting appCreate() operation..."
    },
    /**
     * Updates the Application details from CloudHub and optionally updates the deployment
     * artifact from a zip file or from a sandbox
     *
     * @param appName
     *  CloudHub application name
     * @param updatedAppData
     *  CloudHub application details with updated values. If null, the current data will be used.
     * @param merge
     *  Boolean that indicates if updatedAppData should replace or merge with current appData
     * @param appDeploymentInfo
     *  Deployment info object that indicates if the update includes a new deployment artifact:
     *  {
     *    deploymentType: enum(zip, sandbox),
     *    zip: {
     *      filePath: "/blah"
     *    },
     *    sandbox: {
     *      appName: "my-app-dev",
     *      envId: "874c1957-5b22-47ea-956a-70243b6103a8"
     *    }
     *  }
     *  If null, no artifact will be deployed.
     * @param orgId
     *  Organization Id
     * @param envId
     *  Environment Id
     * @param anypointUser
     *  Anypoint platform user
     * @param anypointPassword
     *  Anypoint platform password
     * @return
     *  Update details
     */
    appModify : (appName, updatedAppData, merge, appDeploymentInfo, orgId, envId, anypointUser, anypointPassword) => {
      logger.info("Calling CloudHub API PUT:/applications...", true)
      var url = 'https://anypoint.mulesoft.com/cloudhub/api/v2/applications/' + appName;
      logger.trace(url, true)
      // Create base request
      var req = {}
      // Get current application details
      var currentAppData = apis.appDetails(appName, orgId, envId, anypointUser, anypointPassword)
      // No application detail updates
      if (updatedAppData == null) {
        updatedAppData = currentAppData
      } else {
        // Should current and new data be merged?
        if (merge) {
          // Merge important nested objects first
          var mergedAppData = currentAppData;
          _.extend(mergedAppData.properties, updatedAppData.properties);
          _.extend(mergedAppData.workers.type, updatedAppData.workers.type);
          _.extend(mergedAppData.workers.amount, updatedAppData.workers.amount);
          _.extend(mergedAppData.muleVersion, updatedAppData.muleVersion);
          // Lastly merge everything else
          _.extend(currentAppData, mergedAppData);
          updatedAppData = currentAppData;
        }
      }
      // Requires new deployment artifact?
      if (appDeploymentInfo != null) {
        if (appDeploymentInfo.deploymentType == "zip") {
          logger.info("Uploading application from Zip file...")
          if (!files.fileExists(appDeploymentInfo.zip.filePath)) {
            logger.error(appDeploymentInfo.zip.filePath + " does not exist")
            process.exit(1)
          }
          // Extend request
          req.formData = {
            appInfoJson: JSON.stringify(updatedAppData),
            file: files.loadFileAsStream(appDeploymentInfo.zip.filePath),
          };
        } else if (appDeploymentInfo.deploymentType == "sandbox") {
          logger.info("Uploading application from Sandbox...")
          logger.trace("Source application details")
          console.log(prettyjson.render(appDeploymentInfo.sandbox))
          if (appDeploymentInfo.sandbox.appName == null || appDeploymentInfo.sandbox.envId == null) {
            logger.error("appDeploymentInfo.sandbox.appName and appDeploymentInfo.sandbox.envId are required")
            process.exit(1)
          }
          var sourceAppData = apis.appEnvDetails(appDeploymentInfo.sandbox.appName, orgId, appDeploymentInfo.sandbox.envId, anypointUser, anypointPassword)
          // Extend request
          req.json = {
            applicationInfo: updatedAppData,
            applicationSource: {
                source: "SANDBOX",
                fileSource: sourceAppData.applicationId,
                fileChecksum: sourceAppData.fileHash
            }
          }
        } else {
          logger.error("appDeploymentInfo.deploymentType should be zip or sandbox")
          process.exit(1)
        }
      } else {
        logger.info("Updating application details without deployment artifact...")
        // Extend request
        req.formData = {
          appInfoJson: JSON.stringify(updatedAppData)
        };
      }
      console.log('\n')
      // Extend request
      req.url = url
      req.headers = getSecurityHeaders(orgId, envId, anypointUser, anypointPassword)

      //PUT application
      requestAsync.put(req, function callBack(err, response, body) {
        if (err) {
          logger.error(err);
          logger.error("Could not update Application " + appName + " details to envId: " + envId)
          process.exit(1)
        }
        logger.trace("\nResponse from CloudHub API PUT:/applications")
        logger.trace("\nCode: " + response.statusCode)
        console.log(prettyjson.render(body))
      });
      return "\nExecuting appModify() operation..."
    },
    /**
     * Gets Anypoint AuthToken
     *
     * @param anypointUser
     *  Anypoint platform user
     * @param anypointPassword
     *  Anypoint platform password
     * @return
     *  Anypoint AuthToken
     */
     getAuthToken : (anypointUser, anypointPassword) => {
       var url = 'https://anypoint.mulesoft.com/accounts/login';
       logger.trace("Calling Anypoint Login API POST:/login...")
       logger.trace(url, true)
       var body = {
         "username": anypointUser,
         "password": anypointPassword
       }
       try {
         var res = request('POST', url, {
           json: body
         });
       } catch (e){
         logger.error(e)
         logger.error("Could not get authToken")
         process.exit(1)
       }
       logger.trace("Response from Anypoint Login API POST:/login")
       var jsonResp = JSON.parse(res.body)
       console.log(prettyjson.render(jsonResp))
       return jsonResp.access_token
     },
    downloadAsset : (assetName, assetVersion, extension, orgId,anypointUser,anypointPassword) => {
      var assetFullName = assetName + '-' + assetVersion;
     	var url = 'https://maven.anypoint.mulesoft.com/api/v1/organizations/' + orgId + '/maven/' + orgId + '/' + assetName + '/'+ assetVersion +'/' + assetFullName + extension;
     	logger.trace(url, true)
       var headers = {
         authorization: 'Basic ' + new Buffer(anypointUser + ':' + anypointPassword, 'ascii').toString('base64')
       }

       try {
         var res = request('GET', url, {
           headers: headers
         });
       } catch (e){
         logger.error(e)
         logger.error("Could not get download asset: " + assetFullName)
         process.exit(1)
       }
       files.writeFileFromBuffer(assetFullName + '.zip', res.getBody());
     	 return "File downloaded";
    },
    /**
     * Get asset info from Exchange
     *
     * @param orgId
     *  Organization Id
     * @param assetId
     *  Asset Id
     * @param anypointUser
     *  Anypoint platform user
     * @param anypointPassword
     *  Anypoint platform password
     * @return
     *  Anypoint AuthToken
     */
     getAssetInfo : (orgId, assetId, anypointUser, anypointPassword) => {
       var url = 'https://anypoint.mulesoft.com/exchange/api/v1/assets/'+ orgId + '/' + assetId;
       logger.trace("Calling Anypoint Exchange Assets API GET:/assets...")
       logger.trace(url, true)
       var headers = {
         'Authorization': 'bearer ' + apis.getAuthToken(anypointUser, anypointPassword);
       }
       try {
         var res = request('GET', url, {
           headers: headers
         });
       } catch (e){
         logger.error(e)
         logger.error("Could not get Exchange asset info")
         process.exit(1)
       }
       logger.trace("Response from Anypoint Exchange Assets API GET:/assets")
       var jsonResp = JSON.parse(res.body)
       console.log(prettyjson.render(jsonResp))
       return jsonResp
     }
}
function getSecurityHeaders(orgId, envId, anypointUser, anypointPassword) {
  var authToken = apis.getAuthToken(anypointUser, anypointPassword);
  return {
    'X-ANYPNT-ORG-ID': orgId,
    'X-ANYPNT-ENV-ID': envId,
    'Authorization': 'bearer ' + authToken
  }
}
