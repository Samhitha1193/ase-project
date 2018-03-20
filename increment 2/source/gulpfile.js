/* begin copyright text
 *
 * Copyright © 2016 PTC Inc., Its Subsidiary Companies, and /or its Partners. All Rights Reserved.
 *
 * end copyright text
 */
var gulp = require('gulp');
var gulpShared = require('./gulp-shared');
var fs = require('fs-extra');
var argv = require('yargs').argv;
const VESPublish = require('ves-publish');
const path = require('path');

if (!fs.readJsonSync) {
  fs.readJsonSync = function(filePath) {
    var fileContent = fs.readFileSync(filePath);
    try {
      var jsonContent = JSON.parse(fileContent);
      return jsonContent;
    }
    catch (e) {
      console.log('File could not be parsed as JSON', filePath, e);
    }

  };
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

gulp.task('default', function() {});
gulp.task('init', gulpShared.init);
gulp.task('clean', gulpShared.clean);
// copy src and src-scaffold files into dist when project is built (when project is saved)
gulp.task('copy-src', gulp.series('clean', gulpShared.copySrc));
gulp.task('build', gulp.series('clean', 'copy-src', gulpShared.buildApp));

// copy Home.html file into project src when project is first created
gulp.task('init-src', gulpShared.init);

gulp.task('build-app', gulp.series('copy-src', gulpShared.buildApp));

/**
 * This gulp task allows command line publish from the project dir (it is not used by studio)
 */
gulp.task('publish', function() {
  var config = {
    path: __dirname,
    settings: gulpShared.readProjectSettingsSync(),
    user: {name: argv.user, password: argv.password},
    sslValidate: argv.sslValidate
  };
  return publish(config);
});
