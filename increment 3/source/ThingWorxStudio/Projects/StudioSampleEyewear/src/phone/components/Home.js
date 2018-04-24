// $scope, $element, $attrs, $injector, $sce, $timeout, $http, $ionicPopup, and $ionicPopover services are available

// code below is for animating propellers
var timerId = -1;
var angleIncrement = 45; // degrees
var timingInterval = 30; // milliseconds
var copterStarted = false;

// increments by which to move the copter
var xdelta = 0;
var ydelta = 0;
var zdelta = 0;
var speed = 0.002;

// turns the scene 90 degrees
$scope.flipCopter = function() {
  if ($scope.app.params.markerRotation == 0) {
    $scope.app.params.markerRotation = -90;
  } else {
    $scope.app.params.markerRotation = 0;
  }
};

// turns the quadcopter on/off
$scope.toggleCopterState = function() {
  if (copterStarted) {
    $scope.stopCopter();
  } else {
    $scope.startCopter();
  }
};

// updates the position of the gestures according to the mode
$scope.updateGestureSigns = function () {
  $scope.app.params.xposDoubleTap = $scope.app.params.xpos + $scope.app.params.doubleTapOffset;
  $scope.app.params.xposMicrophone = $scope.app.params.xpos + $scope.app.params.microphoneOffset;
}

// selects which speech hints to display
$scope.toggleFlyHints = function() {

  if (copterStarted) {
    $scope.app.params.flyHintsVisible = true;
    $scope.app.params.hintText = "Stay | Stop";
    $scope.app.params.doubleTapOffset = 0.038;
    $scope.app.params.microphoneOffset = -0.038;
  } else {
    $scope.app.params.flyHintsVisible = false;
    $scope.app.params.hintText = "Start      | Reset | Flip | Replace battery";
    $scope.app.params.doubleTapOffset = -0.065;
    $scope.app.params.microphoneOffset = -0.108;
  }
  
  $scope.updateGestureSigns();
}

$scope.setCopterStartedFlag = function(data) {
  copterStarted = data;
  $scope.toggleFlyHints();
}

$scope.startPropellers = function() {
  if (timerId > -1) {
    clearInterval(timerId);
  }

  timerId = setInterval(function() {

    // ensure there is a value for parameters
    if (!$scope.app.params.ry) {
      $scope.app.params.ry = 0;
    }
    if (!$scope.app.params.xpos) {
      $scope.app.params.xpos = 0;
    }
    if (!$scope.app.params.ypos) {
      $scope.app.params.ypos = 0.045;
    }
    if (!$scope.app.params.zpos) {
      $scope.app.params.zpos = 0;
    }

    // animates the copter
    $scope.$apply(function(){

      // spin the propeller
      $scope.app.params.ry += angleIncrement % 360;
      
      // tilt at a 5 degree angle if moving
      $scope.app.params.tiltX = 2500 * zdelta;
      $scope.app.params.tiltZ = 2500 * xdelta;

      // move
      $scope.app.params.xpos -= xdelta;
      $scope.app.params.ypos  = Math.max(0.045, $scope.app.params.ypos + ydelta);
      $scope.app.params.zpos += zdelta;
      
      $scope.updateGestureSigns();
    });
  }, timingInterval);
}

$scope.stopPropellers = function() {
  
  clearInterval(timerId);
  timerId = -1;
}

// initialize the propellers
$scope.startCopter = function () {
  
  $scope.stayCopter();
  $scope.setCopterStartedFlag(true);
  $scope.startPropellers();
}

// stop moving but stay powered on
$scope.stayCopter = function() {
  
  // stop moving and reset tilt
  xdelta = 0;
  ydelta = 0;
  zdelta = 0;

  $scope.app.params.tiltX = 0;
  $scope.app.params.tiltZ = 0;
}

// stop the quadcopter
$scope.stopCopter = function() {

  $scope.stayCopter();
  $scope.stopPropellers();
  $scope.setCopterStartedFlag(false);
}

$scope.resetCopter = function() {

  $scope.stopCopter();

  // reset position
  $scope.app.params.xpos = 0;
  $scope.app.params.ypos = 0.045;
  $scope.app.params.zpos = 0;
  
  $scope.updateGestureSigns();
}

// moves in the specified direction
$scope.goLeft	= function() { zdelta = speed; }
$scope.goRight	= function() { zdelta = -speed; }

$scope.goForward	= function() { xdelta = speed; }
$scope.goBackward	= function() { xdelta = -speed; }

$scope.goUp		= function() { ydelta = speed; }
$scope.goDown	= function() { ydelta = -speed; }
