// $scope, $element, $attrs, $injector, $sce, $timeout, $http, $ionicPopup, and $ionicPopover services are available

$scope.PopulateModelList = function () {
  
  
  
  
  $scope.app.params.modelSelect = [
  
    {
    
    display: "Crib Bed",
      value : "app/resources/Uploaded/Baby bed_High.pvz"
    },
    
    
    {
      
    display: "Queen Bed",
      value : "app/resources/Uploaded/Bed Assembly_High.pvz"
    
    
    },
  
  

   {
      
    display: "Chair",
      value : "app/resources/Uploaded/Assem1_sldasm_High.pvz"
    
    
    },
  
   
  
    {
      
    display: "Dresser",
      value : "app/resources/Uploaded/Bed room Dresser or TV stand_High.pvz"
    
    
    }
  
  
  
  ];


}

$scope.PopulateModelList();