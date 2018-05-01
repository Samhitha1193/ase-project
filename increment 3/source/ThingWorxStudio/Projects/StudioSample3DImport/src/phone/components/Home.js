// $scope, $element, $attrs, $injector, $sce, $timeout, $http, $ionicPopup, and $ionicPopover services are available

$scope.show = function(buttonIndex) {
 
  var rots =   document.querySelector('[widget-id="rotSlider"] .range');
  var scales = document.querySelector('[widget-id="scaleSlider"] .range');
  var trans =  document.querySelector('[widget-id="transpSlider"] .range');
                                    
  $scope.view.wdg['rotSlider']['visible']=false; 
  $scope.view.wdg['scaleSlider']['visible']=false;
  $scope.view.wdg['transpSlider']['visible']=false;

  $scope.view.wdg['scaleToggle']['pressed']=false;
  $scope.view.wdg['rotToggle']['pressed']=false;
  $scope.view.wdg['transpToggle']['pressed']=false;
  
  if (buttonIndex === 1) {
    rots.classList.add('ng-hide');
    scales.classList.remove('ng-hide');
    trans.classList.add('ng-hide');    
    $scope.view.wdg['scaleToggle']['pressed']=true;    
  }
  else if (buttonIndex === 2) {
    rots.classList.remove('ng-hide');
    scales.classList.add('ng-hide');
    trans.classList.add('ng-hide');
    $scope.view.wdg['rotToggle']['pressed']=true;
    $timeout(function() {      
      rots.classList.remove('ng-hide');
    }, 100);
  }
  else { 
    rots.classList.add('ng-hide');
    scales.classList.add('ng-hide');
    trans.classList.remove('ng-hide');
    $scope.view.wdg['transpToggle']['pressed']=true;
  }
}