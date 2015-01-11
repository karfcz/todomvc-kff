
(function(scope)
{
	var kfn;

	if(typeof exports !== 'undefined') kfn = exports;
	/**
	 * @namespace kfn kfn namespace
	 */
	else kfn = 'kfn' in scope ? scope.kfn : (scope.kfn = {}) ;


	kfn.maybe = function(fn)
	{
		return function()
		{
			var i, l;

			if (arguments.length === 0) {
				return;
			}
			else {
				for (i = 0; i < arguments.length; ++i) {
				if (arguments[i] == null) return;
			}
				return fn.apply(this, arguments);
			}
		}
	};

	kfn.keyPathToArray = function(keypath)
	{
		return keypath instanceof Array ? keypath : keypath.split('.');
	};


	kfn.get = function(key)
	{
		return function(obj)
		{
			return obj[key];
		};
	};

	kfn.mget = function(keypath)
	{
		return Array.prototype.reduce.bind(keypathToArray(keypath), maybe(function(prev, current){
			return prev[current];
		}));
	};

	kfn.imclone = function(obj)
	{
		if(obj instanceof Array) return obj.slice();
		if(typeof obj === 'object')
		{
			var ret = {};
			for(var key in obj)
			{
				ret[key] = obj[key];
			}
			return ret;
		}
		return obj;
	};

	kfn.imset = function(keypath, value, obj)
	{
		var fn = value;
		if(typeof fn !== 'function') fn = function(){ return value; };

		if(typeof keypath === 'string') keypath = keypath.split('.');

		var root = kfn.imclone(obj);
		var prev = root;
		if(keypath.length === 0) return fn(root);

		for(var i = 0, l = keypath.length; i < l - 1; i++)
		{
			prev = prev[keypath[i]] = kfn.imclone(prev[keypath[i]]);
		}

		prev[keypath[i]] = fn(prev[keypath[i]]);

		return root;
	};

	kfn.imremove = function(keypath, obj)
	{
		if(typeof keypath === 'string') keypath = keypath.split('.');

		var root = kfn.imclone(obj);
		var prev = root;

		for(var i = 0, l = keypath.length; i < l - 1; i++)
		{
			prev = prev[keypath[i]] = kfn.imclone(prev[keypath[i]]);
		}

		if(keypath[i] < 0) return root;

		if(prev instanceof Array)
		{
			prev = prev.splice(keypath[i], 1);
		}
		else if(typeof prev === 'object' && prev !== null)
		{
			delete prev[keypath[i]];
		}
		return root;
	};


	kfn.curry = function(fn, arity)
	{
		var __slice = Array.prototype.slice;
		arity = arity || fn.length;

		return given([]);

		function given(argsSoFar)
		{
			return function helper()
			{
				var updatedArgsSoFar = argsSoFar.concat(__slice.call(arguments, 0));

				if (updatedArgsSoFar.length >= arity) {
					return fn.apply(this, updatedArgsSoFar)
				}
				else return given(updatedArgsSoFar)
			}
		}
	};


	kfn.map = kfn.curry(function(fn, obj)
	{
		return obj.map(fn);
	});



})(this);

