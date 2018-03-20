/* begin copyright text
 *
 * Copyright © 2016 PTC Inc., Its Subsidiary Companies, and /or its Partners. All Rights Reserved.
 *
 * end copyright text
 */
const fs = require('fs-extra');
const argv = require('yargs').argv;
const path = require('path');
const VESPublish = require('ves-publish');
var appPath = __dirname;
/**
 * This allows command line publish from the project dir (it is not used by studio)
 */

function readProjectSettingsSync(appBaseDir) {
  if (!appBaseDir) {
    appBaseDir = appPath;
  }
  var config = path.join(appBaseDir, 'appConfig.json');
  var data = fs.readJsonSync(config);
  return data;
}

function publish(config) {
    var vesArgs = {
        baseDir: config.path,
        name: config.settings.name,
        developer: {name: config.user.name, password: config.user.password},
        server: config.settings.thingworxServer,
        sslValidate: config.sslValidate,
        requestConfig: config.requestConfig
    };

    return VESPublish.publishApp(vesArgs, console.log, console.error).then(function() {
        var metadata = {};
        try {
            metadata = fs.readJsonSync(path.join(vesArgs.baseDir, 'dist', 'phone', 'WEB-INF', 'metadata.json'));
        } catch (e) {
            console.error('could not find a metadata.json file.', e);
        }

        return VESPublish.setAccessType(vesArgs, metadata.accessType === 'public');
    });
}

publish({
path: __dirname,
settings: readProjectSettingsSync(),
user: {name: argv.user, password: argv.password},
sslValidate: argv.sslValidate
});
