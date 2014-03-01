function Database(data)
{
	var entityLimit = 10;
	var dimensionLimit = 10;

	var typesDensity = {};

	for (var key in data.data)
	{
		typesDensity[data.data[key].type] = (typesDensity[data.data[key].type] || 0) + 1
	}

	this.findTypes = function(query){
		var results = [];

		var q = query.toLowerCase();

		for (var t in typesDensity)
		{
			if (t.toLowerCase().search(q) >= 0 || q.length === 0)
			{
				if (data.types[t])
				{
					results.push({
						score: query.length / t.length * typesDensity[t],
						data: data.types[t]
					});
				}
			}
		}

		results.sort(function(a, b){
			return b.score - a.score;
		});

		return results.slice(0, entityLimit).map(function(result){
			return result.data;
		});
	};

	
	this.select = function(query, filter, cb)
	{
		if (filter.state === 'T') // Looking for a type
		{
			cb(this.findTypes(query));
		}
		else if (filter.state === 'E') // Looking for an entity
		{
			if (data.types[filter.type.name].source === 'json')
			{
				cb(this.findEntitiesFromJson(query, filter));
			}
		}
		else if (filter.state === 'D') // Looking for a dimension value
		{
			if (data.types[filter.type.name].source === 'json')
			{
				cb(this.findEntitiesFromJson(query, filter));
			}
		}
		
	};

	this.findEntitiesFromJson = function(query, filter)
	{
		var entityType = filter.type.name;

		var results = [];
		var dimensionResults = [];
		var dimensions = {};
		var filters = {};
		var activeFilters = {};

		for (var c in filter.conditions)
		{
			activeFilters[filter.conditions[c].dimension+"="+filter.conditions[c].value] = true;
		}

		itemLoop:
		for (var key in data.data)
		{
			var item = data.data[key];
			if (item.type !== entityType)
			{
				continue itemLoop;
			}

			conditionsLoop:
			for (var c in filter.conditions)
			{
				var cond = filter.conditions[c];
				var values = item.characteristics[cond.dimension];
				if (!values)
				{
					continue itemLoop;
				}
				if (typeof values === 'string')
				{
					values = [values];
				}
				for (var v = 0; v < values.length; v++)
				{
					if (values[v] === cond.value)
					{
						continue conditionsLoop;
					}
				}
				continue itemLoop;
			}

			if (filter.state === 'E')
			{
				var score = this.matchScore(key, query);
				if (score > 0 || query.length === 0)
				{
					results.push({score: score, data: {
						handle: key,
						key: key,
						description: 'View'
					}});
				}

				for (var dimension in item.characteristics)
				{
					var score = this.matchScore(dimension, query);

					if (score > 0 || query.length === 0)
					{
						if (dimensions[dimension])
						{
							dimensions[dimension].score += score;
							dimensions[dimension].data.objects.insert(key);
							dimensions[dimension].data.values.insert(item.characteristics[dimension]);
						}
						else
						{
							dimensions[dimension] = {
								score: score,
								data: {
									handle: dimension,
									description: 'Filter by '+dimension,
									kind: 'dimension',
									dimension: dimension,
									objects: new Set(key),
									values: new Set(item.characteristics[dimension])
								}
							};

							dimensionResults.push(dimensions[dimension]);
						}
					}
				}
			}
			else
			{
				var values = item.characteristics[filter.dimension];
				if (!values)
				{
					values = [];
				}
				else if (typeof values === 'string')
				{
					values = [values];
				}

				for (var v = 0; v < values.length; v++)
				{
					var score = this.matchScore(values[v], query);
					if (score > 0 || query.length === 0)
					{
						var filterKey = filter.dimension+"="+values[v];

						if (!activeFilters[filterKey])
						{
							if (filters[filterKey])
							{
								filters[filterKey].score += score;
								filters[filterKey].data.objects.insert(key);	
							}
							else
							{
								filters[filterKey] = {
									score: score,
									data: {
										handle: 'Filter by '+filter.dimension,
										description: values[v],
										kind: 'filter',
										dimension: filter.dimension,
										value: values[v],
										objects: new Set(key)
									}
								};
								results.push(filters[filterKey]);
							}
						}
					}
				}
			}
		}

		if (filter.state === 'E')
		{
			var activeConditions = {};
			for (var i in filter.conditions)
			{
				activeConditions[filter.conditions[i].dimension] = 
				(activeConditions[filter.conditions[i].dimension] || new Set())
				.insert(filter.conditions[i].value);
			}

			// Keep only *entityLimit* most accurate Entity results
			results.sort(function(a, b){
				return b.score - a.score;
			});
			results = results.slice(0, entityLimit);

			var keys = results.map(function(result){return result.data.key;});

			for (var d = 0; d < dimensionResults.length; d++)
			{
				// Add the dimension filter only if it is useful,
				// i.e. if it may be used to display results that are not currently on screen
				var useless = dimensionResults[d].data.objects.includedIn(keys);
				var dimension = dimensionResults[d].data.dimension;
				if (!useless && activeConditions[dimension])
				{
					useless = activeConditions[dimension].includes(dimensionResults[d].data.values.toArray());
				}
				if (!useless)
				{
					results.push(dimensionResults[d]);
				}

				dimensionResults[d].data.valuesCount = dimensionResults[d].data.values.count();
				// Do not keep this in Angular world
				delete dimensionResults[d].data.values;

				console.log("Filter on", dimensionResults[d].data.dimension, useless ? "useless" : "kept")
			}

			// Sort results again, because we may have added a few!
			results.sort(function(a, b){
				return b.score - a.score;
			});
		}

		results = results.slice(0, entityLimit + dimensionLimit).map(function(result){
			if (result.data.objects)
			{
				result.data.count = result.data.objects.count();
				// Angular does not need to know about this, it would make him crazy
				delete result.data.objects;
			}
			return result.data;
		});

		console.log(results);

		return results;
	};

	this.matchScore = function(haystack, needle)
	{
		return haystack.toLowerCase().search(needle.toLowerCase()) >= 0 ? needle.length / haystack.length : 0;
	}

	this.find = function(query, filter)
	{
		var results = [];

		var q = query.toLowerCase();

		var dimensionFilters = {};

		entityLoop:
		for (var key in data.data)
		{
			var entity = data.data[key];

			if (entity.type === filter.type.name)
			{

				// If there are conditions, filter out non matching entities
				for (var cond in filter.conditions)
				{
					var condition = filter.conditions[cond];
					var values = entity.characteristics[condition.dimension];
					if (!values)
					{
						continue entityLoop;
					}
					else
					{
						if (typeof(values) === 'string')
						{
							values = [values];
						}
						var matches = false;

						for (var v = 0; v < values.length; v++)
						{
							if (values[v] === condition.value)
							{
								matches = true;
								break;
							}
						}

						if (!matches)
						{
							continue entityLoop;
						}
					}
				}

				// See if this entity matches!
				var score = 0;
				if (key.toLowerCase().search(q) >= 0)
				{
					score += q.length / key.length;
				}
				
				if (score > 0 || q.length === 0)
				{
					if (!entity.handle)
					{
						entity.handle = key;
					}

					if (!entity.description)
					{
						entity.description = "View "+key;
					}

					entity.kind = 'entity';

					results.push({
						score: score,
						data: entity
					})
				}

				// But maybe we want to filter?
				for (var c in entity.characteristics)
				{
					var values = entity.characteristics[c];
					if (typeof(values) === 'string')
					{
						values = [values];
					}

					for (var v = 0; v < values.length; v++)
					{
						var value = values[v];

						var score = 0;
						if (value.toLowerCase().search(q) >= 0)
						{
							score += q.length / value.length;
						}

						if (score > 0 || q.length === 0)
						{
							var dimKey = c+'='+value;
							var dimensionFilter = dimensionFilters[dimKey];

							if (dimensionFilter)
							{
								dimensionFilter.score += score;
							}
							else
							{
								dimensionFilter = {
									score: score,
									data: {
										kind: 'condition',
										handle: c,
										description: value,
										dimension: c,
										value: value
									}
								};

								dimensionFilters[dimKey] = dimensionFilter;
								results.push(dimensionFilter);
							}
						}
					}
				}
			}
		}

		results.sort(function(a, b){
			return b.score - a.score;
		});

		return results.slice(0, entityLimit).map(function(result){
			return result.data;
		});
	};
}