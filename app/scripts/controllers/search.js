'use strict';

angular.module('desktopApp')
.controller('SearchCtrl', function($scope, $http){
	var database = null;
	// Space Key tabulates
	$scope.lucky = true
	// The user's query
	$scope.query = '';
	// Will be set to true once we're ready to rock
	$scope.initialized = false;
	// This is where we'll hold the current search status
	$scope.filter = {
		state: 'T',
		type: null,
		conditions: []
	};
	// This is where we store the results of the current query
	$scope.results = [];
	// Initialize the DB with sample data
	$http.get('data/sample.json').success(function(data){
		database = new Database(data);
		$scope.initialized = true;
		$scope.queryChanged();
	});
	$scope.queryChanged = function(){
		// Wait for initial ajax call to complete
		if (!$scope.initialized){
			return;
		}
		database.select($scope.query, $scope.filter, function(results){
			$scope.results = results;
			$scope.focusedResultPosition = 0;
			if(!$scope.$$phase){
				$scope.$apply();
			}
		});
	};
	$scope.focusedResult = function (){
		return $scope.results[$scope.focusedResultPosition];
	};
	$scope.focusedResultKind = function(){
		var result = $scope.focusedResult();
		if (result){
			return result.kind;
		}
		else{
			return null;
		}
	};
	$scope.keydown = function(e){
		//tab key
		if (e.keyCode === 9 || ($scope.lucky && e.keyCode === 32)){
			e.preventDefault();
			var result = $scope.focusedResult();
			if (result){
				$scope.selectResult(result);
			}
		}
		// Backspace Key
		else if (e.keyCode === 8){
			if ($scope.query.length === 0){
				if ($scope.filter.state === 'D'){
					$scope.filter.state = 'E';
					$scope.filter.dimension = '';
				}
				else if ($scope.filter.conditions.length === 0){
					$scope.filter.state = 'T';
					$scope.filter.type = null;
				}
				else{
					$scope.filter.conditions.splice($scope.filter.conditions.length-1, 1);
				}
				$scope.queryChanged();
			}
		}
		// Up Arrow Key
		else if (e.keyCode === 38){
			e.preventDefault();
			$scope.focusedResultPosition--;
			if ($scope.focusedResultPosition < 0){
				$scope.focusedResultPosition = $scope.results.length - 1;
			}
		}
		 // Down Arrow Key
		else if (e.keyCode === 40){
			e.preventDefault();
			$scope.focusedResultPosition++;
			if ($scope.focusedResultPosition >= $scope.results.length){
				$scope.focusedResultPosition = 0;
			}
		}
		else{
			console.log(e.keyCode);
		}
	};
	$scope.selectResult = function(result){
		if (result.kind === 'type'){
			$scope.filter.type = result;
			$scope.filter.state = 'E';
			$scope.query = '';
			$scope.queryChanged();
		}
		else if (result.kind === 'dimension'){
			$scope.filter.state = 'D';
			$scope.filter.dimension = result.dimension;
			$scope.query = '';
			$scope.queryChanged();
		}
		else if (result.kind === 'filter'){
			$scope.filter.conditions.push({
				dimension: result.dimension,
				value: result.value
			});
			$scope.filter.state = 'E';
			$scope.filter.dimension = '';
			$scope.query = '';
			$scope.queryChanged();
		}
	};
});