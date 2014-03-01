function Set()
{
	var data = {};
	var count = 0;

	this.insert = function(key)
	{
		if (data[key])
		{
			data[key] += 1;
		}
		else
		{
			data[key] = 1;
			count += 1;
		}
	};

	this.count = function(str)
	{
		if (str)
		{
			return data[str] || 0;
		}
		else
		{
			return count;
		}
	};

	this.includes = function(arr)
	{
		for (var i = 0; i < arr.length; i++)
		{
			if (!data[arr[i]])
				return false;
		}

		return true;
	};

	this.includedIn = function (arr)
	{
		var set = new Set(arr);
		return set.includes(this.toArray());
	};

	this.toArray = function()
	{
		return Object.keys(data);
	};

	// Initialize

	for (var a in arguments)
	{
		var arg = arguments[a];

		if (typeof arg !== "object")
		{
			arg = [arg];
		}

		for (var i in arg)
		{
			this.insert(arg[i]);
		}
	}
};