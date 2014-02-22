var selectxfromx = angular.module('selectxfromx', []);

selectxfromx.controller('SearchCtrl', function($scope, $http){

	var database = null;
	
	// The user's query
	$scope.query = '';

	// Will be set to true once we're ready to rock
	$scope.initialized = false;

	// This is where we'll hold the current search status
	$scope.filter = {
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

	$scope.queryChanged = function()
	{
		// Wait for initial ajax call to complete
		if (!$scope.initialized)
		{
			return;
		}

		$scope.results = [];
		$scope.focusedResultPosition = 0;

		// User must first select a type of entity to search for
		if (!$scope.filter.type)
		{
			$scope.results = database.findTypes($scope.query);	
		}
		else
		{
			$scope.results = database.find($scope.query, $scope.filter);
		}
	};

	$scope.focusedResult = function ()
	{
		return $scope.results[$scope.focusedResultPosition];
	};

	$scope.focusedResultKind = function()
	{
		var result = $scope.focusedResult();
		if (result)
		{
			return result.kind;
		}
		else
		{
			return null;
		}
	};

	$scope.keydown = function(e)
	{
		if (e.keyCode === 9) // Tab key
		{
			e.preventDefault();
			var result = $scope.focusedResult();

			if (result)
			{
				$scope.selectResult(result);
			}
		}
		else if (e.keyCode === 8) // Backspace Key
		{
			if ($scope.query.length === 0)
			{
				if ($scope.filter.conditions.length === 0)
				{
					$scope.filter.type = null;
					$scope.queryChanged();
				}
				else
				{
					$scope.filter.conditions.splice($scope.filter.conditions.length-1, 1);
					$scope.queryChanged();
				}
			}
		}
		else if (e.keyCode === 38) // Up Arrow Key
		{
			e.preventDefault();
			$scope.focusedResultPosition--;
			if ($scope.focusedResultPosition < 0)
			{
				$scope.focusedResultPosition = $scope.results.length - 1;
			}
		}
		else if (e.keyCode === 40) // Down Arrow Key
		{
			e.preventDefault();
			$scope.focusedResultPosition++;
			if ($scope.focusedResultPosition >= $scope.results.length)
			{
				$scope.focusedResultPosition = 0;
			}
		}
		else
		{
			console.log(e.keyCode);
		}
	};

	$scope.selectResult = function(result)
	{
		if (result.kind === 'type')
		{
			$scope.filter.type = result;
			$scope.query = '';
			$scope.queryChanged();
		}
		else if (result.kind === 'condition')
		{
			$scope.filter.conditions.push({
				dimension: result.dimension,
				value: result.value
			});
			$scope.query = '';
			$scope.queryChanged();
		}
	};
});