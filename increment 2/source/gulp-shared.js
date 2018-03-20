/* begin copyright text
 *
 * Copyright © 2016 PTC Inc., Its Subsidiary Companies, and /or its Partners. All Rights Reserved.
 *
 * end copyright text
 */
var gulp = require('gulp');
var fs = require('fs-extra');
var gulpDebug = require('gulp-debug'); // jshint ignore:line
var path = require('path');
var del = require('del');
var argv = require('yargs').argv;
var _ = require('lodash');
var $ = require('cheerio');
var swig = require('swig');
const log = require('studio-log').getLogger('ar-extension:gulp-shared');
var AdmZip = require('adm-zip');
var Q = require('q');
const ves_extension = require('ves-ar-extension');
const preservetime = ves_extension.preservetime;

// TODO fixup remaining jshint errors and remove this comment:
/* jshint latedef: false */

swig.setDefaults({
  autoescape: false,
  cache: false,
  varControls: ['<%=', '=%>']
});

var appPath = __dirname;
var srcPath = path.join(appPath, 'src');
var srcScaffoldPath = path.join(appPath, 'src-scaffold');

function getScaffoldDir(params) {
  var scaffoldDir;
  if (params.settings && params.settings.scaffoldDirectory) {
    scaffoldDir = params.settings.scaffoldDirectory;
  }
  else {
    scaffoldDir = ves_extension.scaffoldDirectory;
    if (!scaffoldDir && params.NODE_MODULE_DIR) {
      scaffoldDir = path.join(params.NODE_MODULE_DIR, 'ves-ar-extension', 'src', 'src-scaffold');
    }
    else if (!scaffoldDir) {
      scaffoldDir = path.join(appPath, 'src-scaffold');
    }
  }
  return scaffoldDir;
}

const APP_CONFIG_PROPERTIES_TO_COPY = ['projectType', 'viewType', 'version'];
function copySrc(cb, appBaseDir, scaffoldDir, params) {
  log.debug('copySrc');
  if (!appBaseDir) {
    appBaseDir = appPath;
  }

  const settings = params ? params.settings : fs.readJsonSync('appConfig.json');
  const distPhonePath = path.join(appBaseDir, 'dist', 'phone');
  fs.ensureDirSync(distPhonePath);
  fs.writeJsonSync(path.join(distPhonePath, 'appConfig.json'), _.pick(settings, APP_CONFIG_PROPERTIES_TO_COPY), {spaces: 2});

  if (!params) {
    params = {};
    if (!params.NODE_MODULE_DIR && fs.existsSync(path.join('..', 'node_modules')) ) {
      params.NODE_MODULE_DIR = path.join('..', 'node_modules');
    }
  }
  if (!params.settings) {
    params.settings = settings;
  }
  scaffoldDir = getScaffoldDir(params);
  if(settings.thumbnail) {
    // copy thumbnail to public dir DT-6919
    fs.copySync(appBaseDir + '/src/phone/resources/' + settings.thumbnail, appBaseDir + '/dist/phone/public/' + settings.thumbnail, {clobber: true, overwrite: true});
  }
   // if view template has a resources folder - copy it
  if(settings.viewTemplatePath) {
    var viewTemplateResorcesPath = path.join(path.dirname(settings.viewTemplatePath), 'resources');
    if (fs.existsSync(viewTemplateResorcesPath)) {
      fs.copySync(viewTemplateResorcesPath, appBaseDir + '/src/phone/resources', {clobber: true, overwrite: true});
    }
  }

  var srcDeferred = Q.defer();
  var resourceDeferred = Q.defer();
  var sharedDeferred = Q.defer();
  var sharedjsonDeferred = Q.defer();
  var runtimeDeferred = Q.defer();
  var cssDeferred = Q.defer();
  var tmlDeferred = Q.defer();
  var scaffoldDeferred = Q.defer();
  var runtimeFilesDeferred = Q.defer();

  gulp.src(appBaseDir + '/src/phone/components/*')
    //.pipe(gulpDebug({title: 'copy-src-components'}))
    .pipe(gulp.dest(appBaseDir + '/dist/phone/app/components/'))
    .on('end', srcDeferred.resolve)
    .on('error', srcDeferred.reject);

  gulp.src([scaffoldDir + '/phone/resources/**/*', appBaseDir + '/src/phone/resources/**/*'])
    //.pipe(gulpDebug({title: 'copy-src-components'}))
    .pipe(gulp.dest(appBaseDir + '/dist/phone/app/resources/'))
    .pipe(preservetime())
    .on('end', resourceDeferred.resolve)
    .on('error', resourceDeferred.reject);

  gulp.src([appBaseDir + '/src/shared/**/*', '!' + appBaseDir + '/src/shared/**/*.scss'])
    //.pipe(gulpDebug({title: 'copy-src-shared'}))
    .pipe(gulp.dest(appBaseDir + '/dist/phone/app/shared/'))
    .on('end', sharedDeferred.resolve)
    .on('error', sharedDeferred.reject);

  gulp.src(appBaseDir + '/src/shared/components/*.json')
    //.pipe(gulpDebug({title: 'JSON'}))
    .pipe(gulp.dest(appBaseDir + '/dist/phone/WEB-INF/'))
    .on('end', sharedjsonDeferred.resolve)
    .on('error', sharedjsonDeferred.reject);

  gulp.src([appBaseDir + '/extensions/combined-extension-runtime-libs.js'])
    //.pipe(gulpDebug({title: 'cp-ext'}))
    .pipe(gulp.dest(appBaseDir + '/dist/phone/extensions/'))
    .on('end', runtimeDeferred.resolve)
    .on('error', runtimeDeferred.reject);

    gulp.src([appBaseDir + '/extensions/runtime/*'])
    //.pipe(gulpDebug({title: 'cp-ext'}))
    .on('end', runtimeFilesDeferred.resolve)
    .on('error', runtimeFilesDeferred.reject)
    .pipe(gulp.dest(appBaseDir + '/dist/phone/extensions/runtime'));

  // exclude the design time css files, those are not needed in the runtime
  gulp.src([appBaseDir + '/css/*.css', '!' + appBaseDir + '/css/*-designtime.css'])
    .pipe(gulp.dest(appBaseDir + '/dist/phone/css/'))
    .on('end', cssDeferred.resolve)
    .on('error', cssDeferred.reject);

  gulp.src([scaffoldDir + '/tml/**/*'])
    //.pipe(gulpDebug({title: 'copy-tml'}))
    .pipe(gulp.dest(appBaseDir + '/dist/tml/'))
    .pipe(preservetime())
    .on('end', tmlDeferred.resolve)
    .on('error', tmlDeferred.reject);

  gulp.src([
          scaffoldDir + '/phone/**/*',
    '!' + scaffoldDir + '/phone/resources/**/*',
    '!' + scaffoldDir + '/phone/lib/js/ptc/thingview/libthingview.js',
    '!' + scaffoldDir + '/**/components/*',
          appBaseDir  + '/src/phone/**/*',
    '!' + appBaseDir  + '/src/phone/resources/**/*',
    '!' + appBaseDir  + '/src/**/components/*'])
    //.pipe(gulpDebug({title: 'cp-src-3'}))
    .pipe(gulp.dest(appBaseDir + '/dist/phone/'))
    .pipe(preservetime())
    .on('end', scaffoldDeferred.resolve)
    .on('error', scaffoldDeferred.reject);

  return Q.all([ srcDeferred.promise,
    resourceDeferred.promise,
    sharedDeferred.promise,
    sharedjsonDeferred.promise,
    runtimeDeferred.promise,
    cssDeferred.promise,
    tmlDeferred.promise,
    scaffoldDeferred.promise,
    runtimeFilesDeferred.promise
  ]);
}

function clean(cb, appBaseDir) {
  log.debug('clean');
  if (!appBaseDir) {
    appBaseDir = appPath;
  }
  var distPath = path.join(appBaseDir, 'dist');
  var syncResult = del.sync([distPath], {force: true});
  if (cb && typeof cb === 'function') {
    cb();
  }
  return syncResult;
}

function init(templatesPath, params) {
  if (!templatesPath) {
    templatesPath = path.join(srcScaffoldPath, 'templates');
  }

  var settingsFile = path.join(appPath, 'appConfig.json');
  var settings = fs.readJsonSync(settingsFile);
  try {
    var isEyewear = (settings.projectType === 'eyewear');

    settings.targets.phone.components[0].viewType = settings.viewType;
    fs.writeJsonSync(settingsFile, settings, {spaces: 2});

    // Initialize Home.json
    const viewTemplate = getViewTemplate(settings, isEyewear, templatesPath);
    var componentsPath = path.join(srcPath, 'phone/components');
    if (!fs.existsSync(componentsPath)) {
      fs.mkdirSync(componentsPath);
    }
    fs.writeJsonSync(path.join(componentsPath, 'Home.json'), viewTemplate, {spaces: 2});

    // Initialize Home.js
    var viewJsFilePath = path.join(templatesPath, 'view.js.template');
    var output = swig.renderFile(viewJsFilePath, {});
    if (output) {
        fs.writeFileSync(path.join(componentsPath, 'Home.js'), output, 'utf8');
    }

    if(isEyewear) {
      let eyewearData = fs.readJsonSync(path.join(templatesPath, 'data-for-eyewear.json'));
      let dataPath = path.join(srcPath, 'shared/components/Data.json');
      let data = fs.readJsonSync(dataPath);
      // add the data from the eyewear data file to the main data file
      data.children = data.children.concat(eyewearData.children);
      fs.writeJsonSync(dataPath, data, {spaces: 2});
      if (params && params.projectConfig) {
        fs.copySync(path.join(params.projectConfig.defaultResourcesPath, 'src'), srcPath, {preserveTimestamps: true, overwrite: true});
      }
    }
  } catch (err) {
    log.error(err);
  }
}

function getViewTemplate(settings, isEyewear, templatesPath) {
    var jsonViewTemplate;
    if(settings.viewTemplatePath) {
       jsonViewTemplate = fs.readJsonSync(settings.viewTemplatePath);
    } else {
      var viewTemplateName;
      switch (settings.viewType) {
          case 'ar':
            viewTemplateName = isEyewear ? 'home-ar-eyewear.json' : 'home-ar.json';
            break;

          case 'desktop':
            viewTemplateName = 'home-desktop.json';
            break;

          case 'mobile-2D':
            viewTemplateName = 'home-2d.json';
            break;

          default:
            viewTemplateName = 'home-custom.json';
      }
      jsonViewTemplate = fs.readJsonSync(path.join(templatesPath, viewTemplateName));
    }
    if(!jsonViewTemplate.attributes.viewtype) {
      jsonViewTemplate.attributes.viewtype = settings.viewType;
    }
    return jsonViewTemplate;
}

/**
 * Retrieves the app params from the Data.json file
 * @param data Contents of the Data.json file as a JSON object
 * @return {{}} JSON Object where the key is the param id and the value is the app param attributes
 */
function getAppParams (data) {
  let params = {};
  let appParams = _.filter(data.children, { 'name': 'twx-app-param'});
  _.each(appParams, function(appParam) {
    params[appParam.attributes.id] = appParam.attributes;
  });

  return params;
}

/**
 * Iterates on the views and determines whether the default route is found,
 *  and whether the angular debug info is needed.
 * @param templateLocals  Object with computed values for the template compile
 * @param defaultRoute  String name of the default View
 * @param appBaseDir String base directory path to the app
 * @param target String name of the target directory
 * @returns {boolean}
 * @private
 */
function _processViews(templateLocals, defaultRoute, appBaseDir, target) {
  var defaultRouteFound = false;
  _.each(templateLocals.views, function(view) {
    if (view.fileName === defaultRoute) {
      defaultRouteFound = true;
    }
    var scriptFile = path.join(appBaseDir, 'src', target, 'components', view.fileName + '.js');
    if (fs.existsSync(scriptFile)) {
      view.script = fs.readFileSync(scriptFile);
      if (view.script && view.script.indexOf("scope()") > 0) {
        //backwards compatibility for custom JS
        templateLocals.angularDebugEnabled = true;
      }
    } else {
      log.info('no script for ' + view.fileName);
    }
  });
  return defaultRouteFound;
}

/**
 * Saves the metadata content into the 3 metadata file locations [sync]
 * @param {Object} metadata
 * @param {Object} saveConfig
 */
function saveNewMetaDataContent(metadata, saveConfig) {
  fs.writeJsonSync(path.join(saveConfig.srcSharedRoot, 'components', 'metadata.json'), metadata, {spaces: 2});
  fs.writeJsonSync(path.join(saveConfig.destTargetRoot, 'app', 'shared', 'components', 'metadata.json'), metadata, {spaces: 2});
  fs.writeJsonSync(path.join(saveConfig.destTargetRoot, 'WEB-INF', 'metadata.json'), metadata, {spaces: 2});
}

/**
 * Updates both src/ and dist/ copies of the metadata.json file with the extra requires: 'spatial-tracking' if
 *  the spatial target was found in a view.
 * @param {object} metadata Metadata.json file contents
 * @param {booelan} hasSpatialTarget
 * @param {object} saveConfig
 */
function updateMetadataWithSpatialRequires(metadata, hasSpatialTarget, saveConfig) {
  var modifiedMetadata = false;
  if (hasSpatialTarget && metadata.requires && metadata.requires.indexOf('spatial-tracking') === -1) {
    metadata.requires.push('spatial-tracking');
    modifiedMetadata = true;
  }
  else if (!hasSpatialTarget && metadata.requires && metadata.requires.indexOf('spatial-tracking') > -1) {
    metadata.requires.splice(metadata.requires.indexOf('spatial-tracking'), 1);
    modifiedMetadata = true;
  }

  if (modifiedMetadata) {
     log.debug('Updating metadata.json file to change spatial-tracking requires');
     saveNewMetaDataContent(metadata, saveConfig);
  }
}

/**
 * Updates both src/ and dist/ copies of the metadata.json file with the extra requires: 'assisted-reality' for
 * assisted-reality projects.
 * @param {object} metadata Metadata.json file contents
 * @param {object} saveConfig
 */
function updateMetadataWithAssistedRealityRequires(metadata, saveConfig) {
  var modifiedMetadata = false;
  if (metadata.requires && saveConfig && saveConfig.projectSettings && saveConfig.projectSettings.projectType === 'HMT' &&
    metadata.requires.indexOf('assisted-reality') < 0) {
    metadata.requires.push('assisted-reality');
    modifiedMetadata = true;
  }

  if (modifiedMetadata) {
    log.debug('Updating metadata.json file to change assisted-reality requires');
    saveNewMetaDataContent(metadata, saveConfig);
  }
}

/**
 * Build the app
 *
 * Called when saving a project from Studio UI, may also be called via CLI `gulp build`.
 * When executed via gulp a cb param is sent but all other params are undefined and will use default values.
 *
 * @param {function} cb - unused - a callback func (only sent in when run as gulp task) but never gets called?
 * @param {string} appBaseDir - such as '<Studio projects dir>/MyProj/', defaults to __dirname
 * @param {string} scaffoldDir - unused
 * @param {object} params - config obj sent from Studio, defaults to empty obj with empty builderSettings plus settings read in from appConfig.json
 * @return {Promise} resolved when build is complete
 */
function buildApp(cb, appBaseDir, scaffoldDir, params) {
  const buildAppPromise = new Promise(function(resolve, reject) {
    log.debug('build');
    if (!params) {
      params = {
        builderSettings: {}
      };
    }
    if (!appBaseDir) {
      appBaseDir = appPath;
    }

    twxAppBuilder = require(path.resolve(appBaseDir, 'extensions', 'combined-widgets.js'));
    if (params.settings === undefined) {
      var settingsFile = path.join(appBaseDir, 'appConfig.json');
      params.settings = fs.readJsonSync(settingsFile);
    }
    const settings = params.settings;

    const buildAppPromises = [];
    if(fs.existsSync(appPath)) {
      // generate distribution files

      ['phone'].forEach(function(target) {
        // an object containing useful information about the save operation
        var saveConfig = {
          destTargetRoot: path.join(appBaseDir, 'dist', target),
          srcTargetRoot: path.join(appBaseDir, 'src', target),
          srcSharedRoot: path.join(appBaseDir, 'src', 'shared'),
          views: _.get(settings, 'targets['+target+'].components', []),
          fragments: _.get(settings, 'targets.shared.fragments', []),

          projectSettings: settings
        };

        // compile all the twxml into html starting with fragments (to be injected into components)
        compileTwxmlToHtml(
          path.join(saveConfig.srcSharedRoot, 'fragments'),
          path.join(saveConfig.destTargetRoot, 'app', 'shared', 'fragments'),
          saveConfig,
          params)
          .then(function(sharedResult) {
            const compileTwxmlToHtmlPromise = compileTwxmlToHtml(
              path.join(saveConfig.srcTargetRoot, 'components'),
              path.join(saveConfig.destTargetRoot, 'app', 'components'),
              saveConfig,
              params,
              sharedResult.contentMap);
            compileTwxmlToHtmlPromise.then(function(result) {
              const needsMenuLayout = result.needsMenuLayout;
              compileSharedTwxmlToHtml(path.join(saveConfig.srcSharedRoot, 'components'),
                  path.join(saveConfig.destTargetRoot, 'app', 'shared', 'components'));

              if (settings.projectType === 'eyewear') {
                compileVoiceRecGrammarFiles(_.assign(saveConfig, {scaffoldDir: getScaffoldDir(params)}));
              }

          // generate any additional files for distribution
          var runtimeExtensions = getRuntimeExtensionsInfo(appBaseDir);
          var sharedMetadataJsonPath = path.join(saveConfig.srcSharedRoot, 'components', 'metadata.json');
          var tmlPathPrefix = argv.tmlPathPrefix || saveConfig.projectSettings.tmlPathPrefix || 'tml';
          var offlineSave = saveConfig.projectSettings.offlineSave || false;
          var deviceHTMLContents = fs.readFileSync(path.join(saveConfig.destTargetRoot, 'app', 'shared', 'components', 'Device.html'), 'utf8');
          var dataHTMLContents = fs.readFileSync(path.join(saveConfig.destTargetRoot, 'app', 'shared', 'components', 'Data.html'), 'utf8');
          // use 'saveConfig' as the 'this' object in the loop.

          _.forEach(settings.targets[target].components, function(view) {
            addEscapedInlineHTML(saveConfig, view, 'view');
          });
          _.forEach(settings.targets.shared.fragments, function(fragment) {
            addEscapedInlineHTML(saveConfig, fragment, 'fragment');
          });

          var metadata = fs.readJsonSync(sharedMetadataJsonPath);
          var defaultRoute = (metadata.experiences && metadata.experiences.length > 0) ? metadata.experiences[0].viewName : settings.targets[target].components[0].fileName;
          updateMetadataWithSpatialRequires(metadata, result.hasSpatialTarget, saveConfig);
          updateMetadataWithAssistedRealityRequires(metadata, saveConfig);

          var dataFile = fs.readJsonSync(path.join(saveConfig.destTargetRoot, 'app', 'shared', 'components', 'Data.json'));
          var appParams = getAppParams(dataFile);
          var enableVoiceCommands = _.find(dataFile.children, {name: 'twx-app-event'}) !== undefined;

          var templateLocals = {
            theme: settings.theme || 'twx-light',
            mainNavigationMenuStyle: settings.mainNavigationMenuStyle,
            views: settings.targets[target].components,
            fragments: settings.targets.shared.fragments,
            uuid: Date.now(),
            extensions: runtimeExtensions,
            defaultRoute: defaultRoute,
            metadata: JSON.stringify(metadata),
            parameters: JSON.stringify(appParams),
            offlineSave: offlineSave,
            tmlPathPrefix: tmlPathPrefix,
            deviceHTMLContents: deviceHTMLContents,
            dataHTMLContents: dataHTMLContents,
            enableVoiceCommands: enableVoiceCommands,
            projectType: settings.projectType,
            angularDebugEnabled: false
          };

          // support for offline experience DT-15090
          templateLocals.designedForOffline = settings.designedForOffline;

          // add the thumbnail info to the templateLocals only if the project has one defined
          if (settings.thumbnail) {
            templateLocals['thumbnail'] = {
              href: 'public/' + settings.thumbnail,
              type: 'image/' + path.extname(settings.thumbnail).substr(1) /* should produce a string like image/png */
            };
          }

          var defaultRouteFound = _processViews(templateLocals, defaultRoute, appBaseDir, target);

          if (!defaultRouteFound) {
            //Default to the first view if none found on url
            templateLocals.defaultRoute = templateLocals.views[0].fileName;
          }
          generateIndex(path.join(appBaseDir, 'dist', target), templateLocals, null, params, needsMenuLayout);

          generateAppJs(appBaseDir, path.join(appBaseDir, 'dist', target), templateLocals, runtimeExtensions);
             });
           buildAppPromises.push(compileTwxmlToHtmlPromise);
          });
        });
      Promise.all(buildAppPromises).then(resolve, reject);
    } else {
      const msg = appPath + ' does not exist';
      log.error(msg);
      reject(msg);
    }
  });

  return buildAppPromise;
}

function readProjectSettingsSync(appBaseDir) {
  if (!appBaseDir) {
    appBaseDir = appPath;
  }
  var config = path.join(appBaseDir, 'appConfig.json');
  var data = fs.readJsonSync(config);
  return data;
}

function getServer(appBaseDir) {
  var projectData = readProjectSettingsSync(appBaseDir);
  return projectData.thingworxServer;
}

function generateIndex(appPath, locals, callback, params, needsMenuLayout) {
  if (!params) {
    params = {};
  }
  locals.menu = (locals.mainNavigationMenuStyle === 'leftSideMenu' && (locals.views && locals.views.length > 1)) || needsMenuLayout === true;
  if(locals.views) {
    locals.views.forEach(function(view) {
      view.escapedTitle = _.escape(view.title);
    });
  }
  const indexTemplate = params.settings.indexTemplate || 'index_sidemenu_nav.html.template';
  var output = swig.renderFile(path.join(appPath, '_builder', indexTemplate), locals);
  if (output) {
    fs.writeFileSync(path.join(appPath, 'index.html'), output, 'utf8');

    var tmlRenderer = '<script src="lib/js/ptc/thingview/thingview.js"></script>\n' +
                      '<script src="lib/twx-mobile-widgets-3d-ng.js"></script>\n ';

    var desktopOutput = output.replace('<!-- VuforiaImpl -->', tmlRenderer);
    desktopOutput = desktopOutput.replace('//desktop-ready-replacement', 'window.ionic.Platform.ready(setupWrapper);');
    var settingObj = {};
    Object.keys(params.builderSettings).forEach(function(k) {
      if (k.toLowerCase().indexOf('enabled') >= 0 || k.toLowerCase().indexOf('mode') >= 0) {
        settingObj[k] = params.builderSettings[k];
      }
    });
    desktopOutput = desktopOutput.replace('//<builder-settings>', 'window.builderSettings = ' + JSON.stringify(settingObj));

    var $desktopIndex = $('<div></div>').html(desktopOutput);
    // for eyewear projects, add the app events overlay to the preview page
    if(params.settings.projectType === 'eyewear') {
      var appEventsOverlay = '<div id="app-events">' +
        '<div class="header" ng-click="events.expanded = (events.expanded !== undefined ? !events.expanded : false)"><span class="iconChevron" ng-class="events.expanded === false? \'collapsed\' : \'expanded\'"></span> <span>Application Events</span></div> ' +
        '  <div class="contents" ng-hide="events.expanded === false"> ' +
        '    <span class="app-event" title="{{appEvent.voiceAlias ? (appEvent.name + \'  (\' + appEvent.voiceAlias + \')\')  : appEvent.name}}" ng-repeat="appEvent in appEvents" ng-click="app.fn.triggerAppEvent(appEvent.name)">{{appEvent.name}} <span class="voice-desc"><i class="icon-voice"></i> ({{appEvent.voiceAlias}})</span></span>' +
        '    <span class="empty-app-events" ng-if="appEvents.length === 0">No Application Events to execute</span>' +
        '  </div>' +
        '</div>';
      $desktopIndex.find('ion-nav-view').append(appEventsOverlay);
      $desktopIndex.find('head').append('<link rel="stylesheet" href="css/app-preview.css?v' + locals.uuid + '">');
    }

    fs.writeFileSync(path.join(appPath, 'index-desktop.html'), $desktopIndex.html(), 'utf8');
    if (callback) {
      callback();
    }
  }
}

function generateAppJs(appBaseDir, distPhonePath, locals) {
  locals.thingworxServer = getServer();
  locals.requires = [];
  locals.requires = locals.requires.concat(getRuntimeExtensionsInfo(appBaseDir).runtimeAngularModulesRequires);
  if (locals.projectType === 'eyewear') {
    locals.requires.splice(locals.requires.indexOf('chartjs-ng'), 1);
    locals.requires.splice(locals.requires.indexOf('ngJustGage'), 1);
  }
  locals.requires = JSON.stringify(locals.requires);

  var theAppPath = path.join(distPhonePath, 'app');
  fs.ensureDirSync(theAppPath);

  var output = swig.renderFile(path.join(distPhonePath, '_builder', 'app.js.template'), locals);
  if (output) {
    fs.writeFileSync(path.join(theAppPath, 'app.js'), output, 'utf8');
  }
}

function getRuntimeExtensionsInfo() {
  var runtimeExtensions = {};
  try {
    runtimeExtensions = require(appPath + '/extensions/runtimeExtensions.json');
  } catch (e) {
    log.error("could not load extensions/runtimeExtensions.json", e);
  }
  return runtimeExtensions;
}

/**
 * Compiles view json to html and writes file to dist
 *
 * @param {string} srcPath - path to src location, such as 'MyProj/src/phone/components/'
 * @param {string} stagePath - path to dist location, such as 'MyProj/dist/phone/app/components/'
 * @param {object} saveConfig - an object containing useful information about the save operation
 *    Includes properties such as: destTargetRoot, srcTargetRoot, srcSharedRoot, views, projectSettings
 * @param {object} params - config obj sent from Studio
 * @param {object} sharedContent -stores fragment views in sharedContent map
 * @return {Promise} resolved with boolean indicating whether or not the app needs a menu layout
 */
function compileTwxmlToHtml(srcPath, stagePath, saveConfig, params, sharedContent) {
  return new Promise(function(resolve, reject) {
    fs.ensureDirSync(stagePath);
    var needsMenuLayout = false;
    var hasSpatialTarget = false;
    var htmlBeautify = require('js-beautify').html;
    const compileViewPromises = [];
    const modelData =  {};
    var views = sharedContent ? saveConfig.views : saveConfig.fragments; //meh... probably a better way
    if (!sharedContent) {
      sharedContent = {};
    }
    _.each(views, function (view) {
      const srcFile = path.join(srcPath, view.fileName + '.json');
      if (fs.existsSync(srcFile)) {
        var targetFile = path.join(stagePath, view.fileName + '.html');
        var key = view.fileName;
        var contents = fs.readFileSync(srcFile, 'utf8');
        const compileViewPromise = compileViewContents(JSONToXML(contents), view.fileName, view.name, saveConfig, params, sharedContent)
            .then(function(viewPromiseResults) {
              modelData[view.name] = viewPromiseResults.modelData;
              var compiledContents = viewPromiseResults.compiledContents;
              if (saveConfig.projectSettings && saveConfig.projectSettings.autoIndent) {
                compiledContents = htmlBeautify(compiledContents, {indent_size: 1});
              }
              fs.writeFileSync(targetFile, compiledContents);
              needsMenuLayout = needsMenuLayout ||
                  compiledContents.indexOf('original-widget="twx-view-header"') > 0 ||
                  compiledContents.indexOf('ion-footer-bar') > 0;

              hasSpatialTarget = hasSpatialTarget || compiledContents.indexOf('twx-dt-target-spatial') > 0;

              var contentsMinusViewTag = '<div>' + $(compiledContents).find('ion-content').html() + '</div>';
              var contentMap = {
                key: key,
                contents: contentsMinusViewTag
              };
              sharedContent[key] = contentsMinusViewTag;
              return Promise.resolve(contentMap);

            });
        compileViewPromises.push(compileViewPromise);
      } else {
        log.error(srcFile, 'does not exist');
      }
    });

    const gltfHelper = ves_extension.gltfHelper;
    Promise.all(compileViewPromises)
      .then(function () {
        return gltfHelper.handleModelData(modelData, params);
      }, reject)
      .then(function () {
        resolve({
          needsMenuLayout: needsMenuLayout,
          hasSpatialTarget: hasSpatialTarget,
          contentMap: sharedContent

        }, reject);
      });
  });

}

function compileSharedTwxmlToHtml(srcPath, stagePath) {
  var files = fs.readdirSync(srcPath);
  fs.ensureDirSync(stagePath);

  _.each(files, function(file) {
    if (_.endsWith(file, '.json') && !file.includes('metadata.json')) {
      var srcFile = path.join(srcPath, file);
      var targetFile = path.join(stagePath, file.replace('.json', '.html'));
      var contents = fs.readFileSync(srcFile, 'utf8');
      var compiledContents = JSONToXML(contents);
      fs.writeFileSync(targetFile, compiledContents);
    }
  });
}

/**
 * Takes an input a file path.
 * Returns as output a data url of base mimetype image or null if the file does not exist.
 *
 * The following extensions are supported and will return the correct mime type:
 * - svg
 * - png
 * - jpg
 * - jpeg
 * - gif
 *
 * Any other extension will return image/unknown.
 */
function encodeAsDataURL(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  var ext = path.extname(filePath).toLowerCase();
  var prefix = 'data:';
  switch (ext) {
    case '.svg':
      prefix += 'image/svg+xml;base64,';
      break;
    case '.png':
      prefix += 'image/png;base64,';
      break;
    case '.jpg':
    case '.jpeg':
      prefix += 'image/jpeg;base64,';
      break;
    case '.gif':
      prefix += 'image/gif;base64,';
      break;
    default:
      prefix += 'image/unknown;base64,';
      break;
  }

  return prefix + fs.readFileSync(filePath).toString('base64');
}

/**
 * Allows client to show/highlight clickable elements
 * @param {*} Widget element
 * @param {*} widgetDef
 * @return true if the widget has a click-expression or click event bindings
 */
function hasClickInteraction($target, widgetDef) {
  return !!(widgetDef.category === 'ar' && ($target.find('[src-event="click"]').length > 0 ||
    $target.attr('click-expression')));
}

/**
 * Looks up the runtime template for the widget.  Tries html/widget.runtime.html
 * or widgetDef.runtimeTemplate
 *
 * @param {*} widgetDef Widget Definition instance
 * @param {*} widgetProperties Widget Properties Object
 * @param {*} twxWidgetEl cheerio element, to pass into runtime template function
 * @param {*} fullOriginalDoc view document, to pass into runtime template function
 * @param {*} $ Cheerio instance to pass into template function
 * @param {Object} projectSettings project appConfig object
 * @returns {String} template html
 */
function getRuntimeTemplate(widgetDef, widgetProperties, twxWidgetEl, fullOriginalDoc, $, projectSettings) {
  var template;
  if (typeof widgetDef.runtimeTemplate === 'string') {
    template = widgetDef.runtimeTemplate;
  }
  else {
    template = widgetDef.runtimeTemplate(widgetProperties, twxWidgetEl, fullOriginalDoc, $, projectSettings);
  }

  return template;
}

/**
 * Will handle relative urls for the resources, adding the right base path.
 * It will also inline the images as needed depending on the project settings.
 * @param {String} propValue current value
 * @param {Object} saveConfig
 * @param {Object} property metadata
 * @returns the new property value with relative base path as necessary.
 */
function handleResourceUrl(propValue, saveConfig, property) {
  if (!propValue.startsWith('http') && !propValue.startsWith('data:image')) {
    if (saveConfig.projectSettings.offlineSave === true &&
      property.inlineForOffline === true) {
      // inline the resource.
      // TODO: handle null which can occur when the file doesn't exist on disk or cannot be read.
      propValue = encodeAsDataURL(path.join(saveConfig.destTargetRoot, 'app', 'resources', propValue));
    } else {
      propValue = 'app/resources/' + encodeURI(propValue);
    }
  }
  return propValue;
}
/**
 * Compiles view contents from xml to html
 * For each widget: init widget property values, extract PVI if necessary, handle GLTF if necessary, add services and events, etc.
 * For the view checks for header, footer, scrollbars, etc. to produce correct view content.
 *
 * @param {string} contents - view as XML
 * @param {string} viewName - internal name such as 'My_View'
 * @param {string} viewTitle - display name such as 'My View'
 * @param {object} saveConfig - an object containing useful information about the save operation
 *    Includes properties such as: destTargetRoot, srcTargetRoot, srcSharedRoot, views, projectSettings
 * @param {object} params - config obj sent from Studio
 * @param {object} sharedContent -stores fragment views in sharedContent map
 * @return {Promise} resolved with an object providing the HTML string of compiled view contents, and
 *                   a modelData object giving information about the models within the project.  Of the form:
 *                    { compiledContents: '...', modelData: {} }
 * @private
 */
function compileViewContents(contents, viewName, viewTitle, saveConfig, params, sharedContent) {
  const promise = new Promise(function(resolve, reject) { // jshint ignore:line
    log.debug('compile view contents ', viewName);
    // this const has to be shared between client and server
    var HTML_BOOLEAN_ATTRIBUTES = ['disabled', 'autofocus'];
    var compiledDoc = $('<div></div>');
    var overlayWidgetId;
    var headerContentItems = [];
    var hasOverlay = false;
    var hasFooter = false;
    var isEmbeddable = false;
    compiledDoc.html(contents);
    var fullOriginalDoc = $('<div></div>').html(contents);
    var $target = compiledDoc.find('[twx-widget]').first();
    var idNumber = 0;
    var isViewWidget = false;
    var isModalView = false;
    var viewType = '';
    var footerEl;
    var isARView = false;
    var modelData = {};
    const gltfHelper = ves_extension.gltfHelper;

    while ($target.length === 1) {
      var tagName = $target[0].name; // $target.prop('tagName');

      var widgetFn = findWidgetByTag(tagName);
      if (widgetFn) {
        //log.debug('Compiler - handling ----' + tagName + '-----');
        var widgetDef = widgetFn();

        isViewWidget = false;

        var isThisTagAnEmbeddableView = false;
        if (tagName === 'twx-view') {
          isViewWidget = true;
          isModalView = false;
          viewType = $target.attr('viewtype');
          if ($target.attr('viewtype') === 'embedded') {
            isEmbeddable = true;
            isThisTagAnEmbeddableView = true;
          } else if ($target.attr('viewtype') === 'modal') {
            isModalView = true;
          }
        }
        var widgetId = $target.attr('widget-id');
        if (widgetId === undefined || widgetId.length === 0) {
          widgetId = 'x' + idNumber++;
        }
        let widgetName = $target.attr('widget-name');
        if (widgetName) {
          widgetName = 'widget-name="' + widgetName + '"';
        }
        else {
          widgetName = '';
        }

        var compiledEl = $('<twx-widget widget-id="' + widgetId + '" original-widget="' + tagName + '" ' +
            widgetName + (isThisTagAnEmbeddableView ? ' twx-view ' : '' ) + '><twx-widget-content></twx-widget-content></twx-widget>');

        var properties = widgetDef.properties;
        var services = widgetDef.services || [];
        var events = widgetDef.events;
        var widgetProperties = {};
        var twxWidgetEl = compiledEl;
        var getValueFromComment = function (comment) {
          var retVal = comment;
          retVal = retVal.substring((retVal.indexOf('<!--') + 4), retVal.lastIndexOf('-->'));
          return retVal;
        };

        // TODO don't make functions within a loop
        _.each(properties, function (property) { // jshint ignore:line
          var key = property.name;
          var attrVal;
          var datatype = property.runtimeDatatype || property.datatype;

          if (datatype === 'custom_ui') {
            // Do nothing...
          } else {
            if (datatype === 'xml') {
              var propValEl = $target.find('twx-widget-property-value[name="' + _.kebabCase(key) + '"]');
              if (propValEl && propValEl.length > 0) {
                attrVal = propValEl.html();
                attrVal = getValueFromComment(attrVal);

                if (!attrVal) {
                  attrVal = $target.attr(_.kebabCase(key));
                }
                propValEl.remove();
              }
              else {
                attrVal = $target.attr(_.kebabCase(key));
              }
            } else {
              attrVal = $target.attr(_.kebabCase(key));
            }

            var propValue;
            if (property.default !== undefined && property.default !== null) {

              if (property.datatype === 'json') {
                propValue = JSON.stringify(property.default || {});
              } else {
                propValue = property.default;
              }
              //log.debug('set to property default: ' + property.name + ' = ' + propValue);
              if (attrVal !== undefined && attrVal !== null && attrVal !== propValue) {
                propValue = attrVal;
                //log.debug('override default: ' + property.name + ' = ' + propValue);
              }
            } else {
              propValue = attrVal;
              //log.debug('no default, set to defined attribute value: ' + property.name + ' = ' + propValue);
            }

            if (datatype !== undefined) {
              switch (datatype.toLowerCase()) {
                case 'number':
                case 'boolean':
                  if (propValue === '') {
                    propValue = property.default;
                  } else if (_.indexOf(HTML_BOOLEAN_ATTRIBUTES, propValue) > -1) {
                    propValue = true;
                  }
                  break;
              }
            }

            if (datatype === 'resource_url' && propValue) {
              propValue = handleResourceUrl(propValue, saveConfig, property);
            }

            if (isViewWidget && property.name === 'title' && propValue !== property.default) {
              viewTitle = propValue;
            }

            if (propValue !== undefined && propValue !== null) {
              widgetProperties[key] = propValue;
            }

            if (datatype !== 'xml' && datatype !== 'custom_ui') {
              var twxWidgetPropertyEl = $('<twx-widget-property></twx-widget-property>');
              twxWidgetPropertyEl.attr('name', key);
              twxWidgetPropertyEl.attr('datatype', (datatype || ''));
              if (propValue !== undefined && propValue !== null) {
                twxWidgetPropertyEl.attr('value', propValue);
              }
              twxWidgetEl.prepend(twxWidgetPropertyEl);
            }
          }
        });

        extractPVI_ifNecessary(widgetProperties, saveConfig.srcTargetRoot, saveConfig.destTargetRoot, twxWidgetEl);

        gltfHelper.gatherModelData(widgetProperties, twxWidgetEl, params, modelData, compiledDoc);

        // TODO dont' make functions within a loop
        _.each(services, function (service) { // jshint ignore:line
          var key = service.name;
          var twxWidgetServiceEl = $('<twx-widget-service></twx-widget-service>');
          twxWidgetServiceEl.attr('name', key);
          twxWidgetEl.prepend(twxWidgetServiceEl);
        });

        // TODO dont' make functions within a loop
        _.each(events, function (event) { // jshint ignore:line
          var eventExpressionName = event.name + 'Expression';
          if ($target.attr(event.name.toLowerCase() + '-expression')) {
            widgetProperties[eventExpressionName] = $target.attr(event.name.toLowerCase() + '-expression');
            twxWidgetEl.prepend('<twx-widget-event name="' + event.name + '" value="' + $target.attr(event.name.toLowerCase() + '-expression') + '"></twx-widget-event>');
          }
        });

        widgetProperties['widgetId'] = widgetId;

        var containerContentsHtml = undefined;
        if (widgetDef.isContainer === true || widgetDef.isRepeater === true) {
          var theContentEl = undefined;
          if (widgetDef.isContainer === true) {
            theContentEl = $target.find('twx-container-content').first();
          } else {
            theContentEl = $target.find('twx-repeater-content').first();
          }

          containerContentsHtml = theContentEl.html();
          theContentEl.remove();
        } else if (widgetDef.outputElementsOnly === true) {
          containerContentsHtml = $target.first().html();
        }

        var addInteractableFlag = hasClickInteraction($target, widgetDef);
        var target_contents = $target.contents();
        //var contentsHtml = $target.html();
        //log.debug(' ------ just testing, contentsHtml: ' + contentsHtml);
        twxWidgetEl.append(target_contents);
        var tmpl = getRuntimeTemplate(widgetDef, widgetProperties, twxWidgetEl, fullOriginalDoc, $, saveConfig.projectSettings);
        var newEl = compiledEl.find('twx-widget-content').append(tmpl);
        if (addInteractableFlag) {
           newEl.find(tagName).attr('interactable-hint', 'true');
        }
        //log.debug('  compiledEl after:' + twxWidgetEl.html());

        if (tagName === 'twx-fragment') {
          var key = $target.attr('fragment');
          compiledEl.find('fragment-content').replaceWith(sharedContent[key].contents);
        }

        if (widgetDef.outputElementsOnly === true) {
          //log.debug(' generating a widget with outputElementsOnly == true');
          compiledEl = $(tmpl);

          var newContainer = compiledEl.find('twx-container-content');
          if (newContainer === undefined || newContainer.length === 0) {
            compiledEl.append(containerContentsHtml);
          } else {
            newContainer.append(containerContentsHtml);
          }

        } else if (widgetDef.isRepeater === true) {
          var repeaterContainer = compiledEl.find('twx-widget-content').find('twx-repeater-content');
          repeaterContainer.append(containerContentsHtml);
        } else if (widgetDef.isContainer === true) {
          var widgetContainer = compiledEl.find('twx-widget-content').find('twx-container-content');
          widgetContainer.append(containerContentsHtml);
        }

        if (tagName === 'twx-header-buttons' || tagName === 'twx-header-title') {
          headerContentItems.push(compiledEl);
        }

        if (tagName === 'twx-view-footer') {
          footerEl = compiledEl;
          hasFooter = true;
        }

        $target.replaceWith(compiledEl);

        if (tagName === 'twx-toolbar') {
          hasFooter = true;
        }

        if (tagName === 'twx-overlay-panel') {
          hasOverlay = true;
          overlayWidgetId = widgetId;
        }
        if (tagName === 'twx-overlay-container') {
          isARView = true;
        }

        var scrollableElement = false;
        if (compiledEl.find('twx-widget-property[name="scrollable"][value="true"]').length > 0) {
          scrollableElement = true;
        }

        if (scrollableElement === true && isARView === true) {
          compiledEl.attr('scrollable', 'true');
        }
      } else {
        // if we don't remove the twx-widget we keep looking for it and end up in an infinite loop
        log.info('******** cannot process twx-widget ' + tagName);
        $target.attr('twx-widget', null);
      }

      $target = compiledDoc.find('[twx-widget]').first();
    }

    const compiledContents = compileViewContents_step2(compiledDoc, params, {
      footerEl: footerEl,
      hasFooter: hasFooter,
      hasOverlay: hasOverlay,
      headerContentItems: headerContentItems,
      isARView: isARView,
      isEmbeddable: isEmbeddable,
      isModalView: isModalView,
      overlayWidgetId: overlayWidgetId,
      viewName: viewName,
      viewTitle: viewTitle,
      viewType: viewType
    });
    resolve({
      compiledContents: compiledContents,
      modelData: modelData
    });
  });
  return promise;
}

/**
 * Called after compileViewContents is done compiling all the widgets in the view contents.
 * @param {object} compiledDoc a cheerio object - similar to a jQuery element
 * @param {object} params - config obj sent from Studio
 * @param {object} config has all the properties that were initialized in compileViewContents() when the widgets were compiled
 *                        put into a config since there are too many to reasonably pass in as separate args (too easy to mix up order)
 * @return {string} compiled contents of the view
 * @private
 */
function compileViewContents_step2(compiledDoc, params, config) {
  const footerEl = config.footerEl;
  const hasFooter = config.hasFooter;
  const hasOverlay = config.hasOverlay;
  const headerContentItems = config.headerContentItems;
  const isARView = config.isARView;
  const isEmbeddable = config.isEmbeddable;
  const isModalView = config.isModalView;
  const overlayWidgetId = config.overlayWidgetId;
  const viewName = config.viewName;
  const viewTitle = config.viewTitle;
  const viewType = config.viewType;

  let headerContentsHtml = '';
  let footerContentsHtml = '';
  let popupContentsHtml = '';
  const overlayDoc = $('<div><div class="overlay ng-hide" ng-show=""></div></div>');
  if (hasOverlay) {
    var overlayEl = compiledDoc.find('div.twx-overlay-panel');
    overlayDoc.find('.overlay').append(overlayEl.html());
    overlayEl.remove();

    overlayDoc.find('.overlay').attr('ng-show', "view.wdg['" + overlayWidgetId + "'].visible == true");
  }

  if (headerContentItems.length > 0) {
    for (var i = 0; i < headerContentItems.length; i += 1) {
      var headerContentEl = headerContentItems[i];
      headerContentsHtml += headerContentEl.children('twx-widget-content').html();
      headerContentItems[i].remove();
    }
  }

  compiledDoc.find('.gridLayout[even-rows="true"]').closest('twx-widget').addClass('hasEvenlySpacedRows');
  compiledDoc.find('.gridLayout[even-rows="false"]').closest('twx-widget').removeClass('hasEvenlySpacedRows');

  var hasEvenlySpacedRowGridClass = (compiledDoc.find('.gridLayout[even-rows="true"]').length > 0).toString();

  var popupEl = compiledDoc.find('[original-widget="twx-popup"]');
  if (popupEl.length > 0) {
    popupContentsHtml = $.html(popupEl);
    popupEl.remove();
  }

  var isEyewear = params.settings.projectType === 'eyewear';
  var isDesktop = params.settings.projectType === 'desktop';
  if (isEyewear) {
    // if there are more than one thingmarks defined (which shouldn't be the case for eyewear projects), it will use
    // the "stationary" property value from the first thingmark.
    let isTargetStationary = compiledDoc.find('twx-dt-target').closest('twx-widget').find('twx-widget-property[name="stationary"]').attr("value") || 'true';
    compiledDoc.find('twx-dt-view > twx-dt-tracker').attr('stationary', isTargetStationary);

    // remove extended tracking properties from the 3D container
    let _3DContainer = compiledDoc.find('twx-dt-view');
    _3DContainer.removeAttr('extendedtracking');
    _3DContainer.removeAttr('persistmap');
  }

  var hasBounce = '';
  var hasScroll = !isARView;
  if (isEyewear || isDesktop) {
    hasBounce = 'has-bouncing="false" ';
    hasScroll = false;
  }
  // due to some ion bug need to double escape title here to display correct string (with only single escape, 'my<view' displays as 'my' and '&gt;' displays as '>')
  const escapedTitle = _.escape(_.escape(viewTitle));
  const viewAttrs = ' twx-view="' + viewName + '" view-title="' + escapedTitle + '" ctrl-name="' + viewName + '_TwxViewController"';
  let compiledContents;
  if (isEmbeddable) {
    compiledContents = compiledDoc.first().html();
  } else if (isModalView) {
    compiledContents = '<ion-modal-view' + viewAttrs + '>' + headerContentsHtml + overlayDoc.html() +
        '<ion-content scroll="' + hasScroll + '" ' + hasBounce + '>' + compiledDoc.first().html() + '</ion-content></ion-modal-view>';
  } else {
    if (hasFooter) {
      footerContentsHtml = footerEl.find('ion-footer-bar').parent().html();
      footerEl.remove();
    }
    compiledContents = '<ion-view hasGridEvenRows="' + hasEvenlySpacedRowGridClass + '" view-type="' + viewType + '"' + viewAttrs + ' can-swipe-back="false">' +
        headerContentsHtml + overlayDoc.html() +
        '<ion-content scroll="' + hasScroll + '" ' + hasBounce + '>' + compiledDoc.first().html() + '</ion-content>' +
        popupContentsHtml + footerContentsHtml + '</ion-view>';
  }

  return compiledContents;
}

/**
 * Generates a grammar file into the dist folder for each view.  The grammar file defines the voice commands that will
 * cause the associated Application Event to be fired when the voice command is recognized by the device.  If there are no
 * application events with an associated voice alias, the generation of the grammar files will be skipped.
 *
 * @param saveConfig Object containing properties/settings used to read/write files from the various locations
 */
function compileVoiceRecGrammarFiles(saveConfig) {
  let viewsDistPath = path.join(saveConfig.destTargetRoot, 'app', 'components');
  fs.ensureDirSync(viewsDistPath);

  const dataFile = fs.readJsonSync(path.join(saveConfig.srcSharedRoot, 'components', 'Data.json'));
  // find all twx-app-event elements that have a non-empty voicealias attribute
  var appEvents = _.filter(dataFile.children, function(item) {
    return item.name === 'twx-app-event' && item.attributes && item.attributes['voicealias'];
  });

  if (appEvents.length < 1) {
    log.debug("not generating the grammar files for the views since there are no app events with a voice alias");
    return;
  }

  var templatesPath = path.join(saveConfig.scaffoldDir, 'templates');
  var grammarTemplate = fs.readFileSync(path.join(templatesPath, "view-grammar.xml.template"), 'utf8');
  if (typeof grammarTemplate === "string") {
    // Cheerio will see a final trailing \n as a separate XML node (a text node) in the document.
    // This in turn causes problems for .append() because .append()
    // will try to append the data to all "root-level" nodes. This
    // causes Cheerio to blow up on the TextNode representing the
    // "\n".
    // Work around this behaviour by trimming the grammarTemplate before doing anything with it.
    grammarTemplate = grammarTemplate.trim();
  }
  var compiledContents = generateVoiceRecGrammar(appEvents, grammarTemplate);

  _.each(saveConfig.views, function (view) {
    var grammarFile = path.join(viewsDistPath, (view.fileName + '-grammar.xml'));
    fs.writeFileSync(grammarFile, compiledContents);
  });
}

/**
 * Generates the contents of the grammar file for the given set of application events containing a voice alias command.
 *
 * @param voiceCommandAppEvents List of application events that have a voice alias command associated to it
 * @param grammarTemplate The template containing the content structure
 * @return {string}
 */
function generateVoiceRecGrammar(voiceCommandAppEvents, grammarTemplate) {

  var $grammar = $(grammarTemplate, {
    xmlMode: true,
    normalizeWhitespace: true
  });

  var helpTokens=[];
  var $cmds = $grammar.find('#cmds > one-of');
  var cmdCount = 1;

  _.each(voiceCommandAppEvents, function(appEvent) {
    var cmdToken = appEvent.attributes['voicealias'];
    var cmd = appEvent.attributes['name'];
    var cmdId = 'voice_command_' + (cmdCount++);
    var cmdHelp = appEvent.attributes['voicehelp'] || '';

    var commandBlob = " out.command=\"" + cmd + "\";";
    // the response is intentionally blank here, it's added as a event listener in the twx-app-event directive in twx-client-core-all.js
    var helpBlob = " out.help=\"" + cmdHelp + "\";";
    var ruleBlob = "  <rule id=\"" + cmdId + "\">\n" +
      "    <item>\n" +
      "      <tag> " + commandBlob + helpBlob + "</tag>\n" +
      "      <token>" + cmdToken + "</token>\n" +
      "    </item>\n" +
      "  </rule>\n";

    $grammar.append(ruleBlob);
    var ruleRefBlob = "  <item><ruleref uri=\"#" + cmdId + "\"/></item>\n";
    $cmds.append(ruleRefBlob);
    helpTokens.push(cmdToken);
  });

  var $help = $grammar.find('#ptcSpeechCommandHelp tag');
  if($help.length){
    var $helplist = $help.eq(0);
    var helpindex = $helplist.html().replace('%%help%%', " " + helpTokens.join(", "));
    $helplist.html(helpindex);
  }

  const beautify = require('js-beautify').html;
  return beautify("<?xml version=\"1.0\" encoding=\"utf-8\" ?>\n" + $.xml($grammar), {indent_size: 2, "html": {"end_with_newline": true}});
}

function findWidgetByTag(tag) {
  var widgets = twxAppBuilder.widgets();
  var widgetWithTag = _.find(widgets, function(widgetFn) {
    var widgetDef = widgetFn();
    return (tag.toLowerCase() === widgetDef.elementTag);
  });
  return widgetWithTag;
}

/**
 * called via Array.prototype.forEach
 * expects 'this' to be config.
 *
 * @param {object} config -  an object containing useful information about the operation
 * @param {object} view - view / fragment data
 * @param {string} type - type of resource : view or fragment
 */

function addEscapedInlineHTML(config, view, type) {
  var relativePath = type === 'view' ? path.join('app', 'components') : path.join('app', 'shared', 'fragments');
  var viewFilePath = path.join(config.destTargetRoot, relativePath, view.fileName + '.html');
  log.debug('Working with view named ' + viewFilePath + ' which exists? [' + fs.existsSync(viewFilePath) + ']');
  var viewFile = fs.readFileSync(viewFilePath, 'utf8');
  var lines = viewFile.split('\n');

  lines.forEach(function(line, idx, arr) {
    arr[idx] = "'" + line.replace(/\'/g, "&apos;") + "\\n'";
  });

  view.inlineableHTML = lines.join('+\n');
}

// Convert JSON design files to Twxml format
function JSONToXML (jsonString) {
  var xml = "";
  if (jsonString.length > 0) {
    var jsonContents = JSON.parse(jsonString);
    var rootNode = jsonContents.name;
    if (rootNode) {
      var root = $('<' + rootNode + '/>');
      root.append(convertJSON(jsonContents));
      xml = root.html();
    }
  }
  return xml;
}

function convertJSON(source) {
  var sourceName = source['name'];
  var xml = $('<' + sourceName + '/>');
  if (source.attributes) {
    _.forEach(source.attributes, function (attrValue, attrName) {
      xml.attr(attrName, attrValue);
    });
  }
  if (source.children) {
    _.forEach(source.children, function (childValue) {
      xml.append(convertJSON(childValue));
    });
  }
  return xml;
}

/**
 * Extracts PVI file from PVZ if there is a PVZ src defined and
 * the PVI sequence is defined, but PVI file doesn't exist.
 *
 * @param {object} widgetProperties that may or may not be for a Model (and may or may not have src & sequence)
 * @param {string} srcRoot path to root dir of src where PVZ and PVI should reside
 * @param {string} destRoot path to root dir of destination to extract PVI to if necessary
 * @private
 */
function extractPVI_ifNecessary(widgetProperties, srcRoot, destRoot, twxWidgetEl) {
  var src = widgetProperties.src;
  var sequence = widgetProperties.sequence;
  if(sequence && src && /\.pvz$/i.test(src)) {
    src = decodeURI(src);
    sequence = decodeURI(sequence);
    const srcpvz = path.join(srcRoot, src.substring(src.indexOf('app') + 4));
    if (!fs.existsSync(path.join(destRoot, sequence))) {
      if (!fs.existsSync(srcpvz)) {
        throw new Error("Missing PVZ file, sequence cannot be extracted: " + srcpvz);
      }
      //Do not need to extract if the pvi already exists in the uploaded dir
      var fileName = src.substring(src.lastIndexOf('/') + 1, src.length - 4);
      fileName = fileName.replace(/[^a-zA-Z0-9\-\_\.]/gi, '_');
      var newDir = fileName;
      let destpvi = path.join(destRoot, sequence.substring(0, sequence.lastIndexOf('/')), newDir, sequence.substring(sequence.lastIndexOf('/') + 1));

      //The PVI may have the same name as others in different PVZ files (removal.pvi for engine and transmission)
      //They may also exist in multiple views.   Allow for multiple duplicates by using a sub-directory of the widget id
      //and index extension to make sure it can eventually find a unique solution
      let count = 1;
      while (fs.existsSync(destpvi) && count < 1000) {
        newDir = fileName + '_' + count++;
        destpvi = path.join(destRoot, sequence.substring(0, sequence.lastIndexOf('/')), newDir, sequence.substring(sequence.lastIndexOf('/') + 1));
      }
      widgetProperties.sequence = encodeURI(sequence.replace('Uploaded/', 'Uploaded/' + newDir + '/'));
      twxWidgetEl.find('[name="sequence"]').attr('value', widgetProperties.sequence);
      log.debug('Extract pvi from src pvz zip', srcpvz, destpvi);
      extractPVI(srcpvz, sequence, destpvi);
    }
  }
}

/**
 * @param pvzFile  {String} file path to pvz file
 * @param pviPath  {String} url path of the pvi file.
 * @param pviFinalPath {String}  file path of the pvi file in dist
 * @private
 */
function extractPVI(pvzFile, pviPath, pviFinalPath) {
  var zip = new AdmZip(pvzFile);
  var pviNameInZip = pviPath.substring(pviPath.lastIndexOf('/') + 1);
  var pathWithoutName = pviFinalPath.substring(0, pviFinalPath.lastIndexOf(pviNameInZip));
  try {
    zip.extractEntryTo(pviNameInZip, pathWithoutName, /*maintainEntryPath*/false);
  }
  catch (e) {
    log.error('PVI extract failure', pviNameInZip, pathWithoutName, pvzFile, e);
  }
}

exports.copySrc = copySrc;
exports.clean = clean;
exports._extractPVI_ifNecessary = extractPVI_ifNecessary;
exports.init = init;
exports.readProjectSettingsSync = readProjectSettingsSync;
exports.buildApp = buildApp;
exports.getScaffoldDir = getScaffoldDir;
exports._compileVoiceRecGrammarFiles = compileVoiceRecGrammarFiles;
exports.generateIndex = generateIndex;
exports._processViews = _processViews;
exports.updateMetadataWithSpatialRequires = updateMetadataWithSpatialRequires;
exports.updateMetadataWithAssistedRealityRequires = updateMetadataWithAssistedRealityRequires;
exports.hasClickInteraction = hasClickInteraction;
exports.handleResourceUrl = handleResourceUrl;
exports._compileViewContents_step2 = compileViewContents_step2;
