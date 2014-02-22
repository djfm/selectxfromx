function Database(data)
{
	var limit = 10;

	// Normalize data
	for (var t in data.types)
	{
		data.types[t].kind = 'type';
		data.types[t].name = t;
	}

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

		return results.slice(0, limit).map(function(result){
			return result.data;
		});
	};

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

		return results.slice(0, limit).map(function(result){
			return result.data;
		});
	};
}