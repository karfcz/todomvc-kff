/**
 * KFF Frontend Framework v2.0.0-alpha.2
 * (c) 2008-2015 Karel Fučík
 * License: MIT
 * https://github.com/karfcz/kff
 */
(function()
{
	var kff = {};
	var scope = null;

	if(typeof module !== 'undefined' && typeof module.exports !== 'undefined') module.exports = kff;
	/**
	 * @namespace kff KFFnamespace
	 */
	else if(typeof window !== 'undefined')
	{
		window.kff = kff;
		scope = window;
	}



/**
 * Data-attribute name used for view names
 * @constant
 */
kff.DATA_VIEW_ATTR = 'data-kff-view';

/**
 * Data-attribute name used for view options (as JSON serialized object)
 * @constant
 */
kff.DATA_OPTIONS_ATTR = 'data-kff-options';

/**
 * Data-attribute name used for marking of rendered views
 * @constant
 */
kff.DATA_RENDERED_ATTR = 'data-kff-rendered';

/**
 * Data-attribute name used for data-binding
 * @constant
 */
kff.DATA_BIND_ATTR = 'data-kff-bind';


kff.debug = false;

(function(){

	if(Object.create)
	{
		kff.createObject = Object.create;
	}
	else
	{
		kff.createObject = function(parent)
		{
			var child, F = function(){};
			F.prototype = parent;
			child = new F();
			return child;
		};
	}

})();

/**
 * Extends constructor function (class) from parent constructor using prototype
 * inherinatce.
 *
 * @public
 * @param {function} child Child class
 * @param {function} parent Parent class
 */
kff.extend = function(child, parent)
{
	child.prototype = kff.createObject(parent.prototype);
	child._super = parent.prototype;
	child.prototype.constructor = child;
};

/**
 * Mixins (using a shallow copy) properties from one object to another.
 * Function accepts multiple arguments with multiple extending objects.
 * The first object will be extended (modified) by the following object(s).
 * When passing true as the last argument, deep copy will be executed (any object ).
 *
 * @param {Object} obj Object to be extended
 * @param {Object} properties Extending object(s)
 * @returns {Object} Extended object (=== obj)
 */
kff.mixins = function(obj, properties)
{
	var i = 1, l = arguments.length, key, props, prop, objProp, deep = false;
	if(l > 2 && arguments[l-1] === true)
	{
		deep = true;
		l--;
	}
	while(i < l)
	{
		props = arguments[i];

		var keys = Object.keys(props);

		for(var j = 0, k = keys.length; j < k; j++)
		{
			key = keys[j];
			prop = props[key];
			if(deep && kff.isPlainObject(prop))
			{
				objProp = obj[key];
				if(typeof objProp !== 'object' || objProp === null) obj[key] = objProp = {};
				kff.mixins(objProp, prop, deep);
			}
			else obj[key] = prop;
		}
		i++;
	}
	return obj;
};

/**
 * Factory function for creating a class
 *
 * The first "meta" parameter must be an object with the following optional properties:
 * * extend - reference to base class to be extended
 * * statics - object with static properties of the class. These properties will be set directly to the constructor
 *   function
 * * service, args, shared - shorthands for service constructor annotations. These will be included into the
 *   statics.service object
 *
 * @param {Object} meta Object with metadata describing inheritance and static properties of the class
 * @param {Object} properties Properties of a class prototype (or class members)
 * @returns {function} A constructor function (class)
 */
kff.createClass = function(meta, properties)
{
	var constructor;
	if(arguments.length === 0) meta = properties = {};
	else if(arguments.length === 1)
	{
		properties = meta;
		meta = {};
	}

	// Create a new constructor if not defined in properties
	if(properties.hasOwnProperty('constructor'))
	{
		constructor = properties.constructor;
	}
	else
	{
		if(meta.extend) constructor = function(){ meta.extend.apply(this, arguments); };
		else constructor = function(){};
	}

	// Extend from parent class
	if(meta.extend) kff.extend(constructor, meta.extend);

	// Concatenate properties from properties objects and mixin objects
	if(!('mixins' in meta))
	{
		meta.mixins = [];
	}
	else if(!(meta.mixins instanceof Array)) meta.mixins = [meta.mixins];

	meta.mixins.push(kff.classMixin);

	for(var i = 0, l = meta.mixins.length; i < l; i++) kff.mixins(properties, meta.mixins[i]);

	// Static properties of constructor

	if(meta.statics)
	{
		kff.mixins(constructor, meta.statics);
	}

	if(meta.service)
	{
		constructor.service = meta.service;
	}

	if(meta.args)
	{
		if(!('service' in constructor)) constructor.service = {};
		constructor.service.args = meta.args;
	}

	if(meta.shared)
	{
		if(!('service' in constructor)) constructor.service = {};
		constructor.service.shared = meta.shared;
	}

	// Add properties to prototype
	kff.mixins(constructor.prototype, properties);

	// Set proper constructor
	constructor.prototype.constructor = constructor;

	return constructor;
};

/**
 * Binds function to an object with object's *this*.
 *
 * Note that it adds a _boundFns property to the object which is an object
 * containing references to bound methods for caching purposes. It always returns reference to the same function
 * for each fnName.
 *
 * @param {Object} obj Object to which bind a function
 * @param {string} fnName Method name to bind
 * @returns {function} Bound function
 */
kff.bindFn = function(obj, fnName, args)
{
	if(typeof obj[fnName] !== 'function') throw new TypeError('Expected function: ' + fnName + ' in object ' + obj + '  (kff.bindFn)');
	if(!('_boundFns' in obj)) obj._boundFns = {};
	if(fnName in obj._boundFns) return obj._boundFns[fnName];
	else
	{
		obj._boundFns[fnName] = function()
		{
			if(args) return obj[fnName].apply(obj, args.concat(Array.prototype.slice.call(arguments)));
			else return obj[fnName].apply(obj, arguments);
		};
	}
	return obj._boundFns[fnName];
};


kff.classMixin = {
	f: function(fnName, args)
	{
		var obj = this;
		if(typeof fnName === 'string') return kff.bindFn(obj, fnName, args);
		if(typeof fnName === 'function')
		{
			return function()
			{
				if(args) return fnName.apply(obj, args.concat(Array.prototype.slice.call(arguments)));
				else return fnName.apply(obj, arguments);
			};
		}
		throw new TypeError("Expected function: " + fnName + ' (kff.f)');
	}
};

/**
 * Evaluates key path of an object recursively and returns last property in chain
 *
 * Example:
 * window.something = { foo: { bar: 42 } };
 * kff.evalObjectPath('something.foo.bar', window) === 42 // true
 *
 * @param {string} path object path (like 'something.foo.bar')
 * @param {Object} obj Object to start with (like window)
 * @returns {mixed} Property at the end of object chain or null if not found
 */
kff.evalObjectPath = function(path, obj)
{
	var part, i, l;
	obj = obj || scope;
	if(typeof path === 'string') path = path.split('.');
	if(!(path instanceof Array)) return null;
	for(i = 0, l = path.length; i < l; i++)
	{
		part = path[i];
		if(obj[part] === undefined) return null;
		else obj = obj[part];
	}
	return obj;
};

/**
 * Detects if an object is a plain javascript object (object created as literal
 * or by new Object). Very simple implementation not as robust as the jQuery one
 * but better performing.
 *
 * @param  {mixed}  obj Object to detect
 * @return {Boolean} True if object is a plain object, false otherwise
 */
kff.isPlainObject = function(obj)
{
	return obj !== null && typeof obj === 'object' && obj.constructor === Object;
};


/**
 * Calls a function in the next process cycle with minimal timeout. It is like
 * setTimeout(fn, 0) but with better performance (does not obey the internal
 * browser limits for timeout that exist due to backward compatibility).
 *
 * Fallbacks to setTimeout on older MSIE.
 *
 * @param  {function}  fn Callback function
 */
kff.setZeroTimeout = function(fn)
{
	var callbacks = [], messageName = 'kff-zerotimeoutmsg';

	var handleMessage = function(event)
	{
		if(event.source === window && event.data === messageName)
		{
			event.stopPropagation();
			if(callbacks.length > 0) callbacks.shift()();
		}
	};

	if('postMessage' in window && 'addEventListener' in window && !('attachEvent' in window))
	{
		kff.setImmediate = kff.setZeroTimeout = function(fn)
		{
			callbacks.push(fn);
			window.postMessage(messageName, '*');
		};
		window.addEventListener('message', handleMessage, true);
	}
	else
	{
		kff.setImmediate = kff.setZeroTimeout = function(fn)
		{
			setTimeout(fn, 0);
		};
	}

	kff.setZeroTimeout(fn);
};

kff.setImmediate = kff.setZeroTimeout;

/**
 * Returns index of an item in an array or -1 if not found
 * This is just a faster replacement for native Array#indexOf
 * It returns index of first occurence of the item.
 *
 * @param  {Array} array The array to search in
 * @param  {mixed} item  The item to look for
 * @return {number}      Index of the item
 */
kff.arrayIndexOf = function(array, item)
{
	for(var i = 0, l = array.length; i < l; i++)
	{
		if(array[i] === item) return i;
	}
	return -1;
};


/**
 * Object for storing modules/factory functions
 * @type {Object}
 */
kff.modules = {};

/**
 * Defines a module. The module can be anything in Javascript - object, function, string, whatever.
 * Every module has an unique name and an optional array of dependencies. Dependency is just a name of a module that
 * is resolved before the factory function is called. Arguments of the factory function are resolved modules from
 * the deps array. Modules can be required by kff.require.
 *
 * @param  {string} name    Name of the module
 * @param  {Array} deps     Array of module names that this module depends on. Optional
 * @param  {function} factory Function that takes arguments according to the deps array and returns the module.
 */
kff.define = function(name, deps, factory)
{
	if(!factory && typeof deps === 'function')
	{
		factory = deps;
		deps = [];
	}
	kff.modules[name] = {
		deps: deps,
		factory: factory
	};
};

/**
 * Returns a module defined by kff.define.
 *
 * @param  {string} serviceName Name of the module (service)
 * @return {mixed}              Reference to the module
 */
kff.require = function(serviceName)
{
	if(typeof serviceName === 'string')
	{
		var match = serviceName.match(kff.ServiceContainer.serviceNameRegex);
		if(match)
		{
			serviceName = match[0];
		}

		if(serviceName in kff.modules)
		{
			var deps = [];
			for(var i = 0; i < kff.modules[serviceName].deps.length; i++)
			{
				deps[i] = kff.require(kff.modules[serviceName].deps[i]);
			}

			return kff.modules[serviceName].factory.apply(this, deps);
		}

		if(serviceName.indexOf('kff.') === 0)
		{
			return kff.evalObjectPath(serviceName.slice(4), kff);
		}
	}
	return null;
};

/**
 * Logs a debug message to the console if kff.debug is set to true
 * @param  {string} message The message to log
 */
kff.log = function(message)
{
	if(kff.debug === true && typeof console === 'object') console.log(message);
};

/**
 * Empty placeholder function
 */
kff.noop = function(){};

/**
 * Compare if two arrays are of the same length and contain the same values compared by the strict equal operator
 *
 * @param  {Array} value1 Array 1
 * @param  {Array} value2 Array 2
 * @return {boolean}      Result of comparsion
 */
kff.compareArrays = function(value1, value2)
{
	if((value1 instanceof Array) && (value2 instanceof Array))
	{
		var l = value1.length;
		if(l !== value2.length) return false;
		for(var i = 0; i < l; i++)
		{
			if(value1[i] !== value2[i]) return false;
		}
		return true;
	}
	else return false;
};


kff.curry = function(fn, arity)
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

// kff.curry = function(fn)
// {
// 	var args = Array.prototype.slice.call(arguments, 1);
// 	return fn.bind.apply(fn, [this].concat(args);
// };

kff.compose = function()
{
	var fns = arguments;
	return function(result)
	{
		for(var i = fns.length - 1; i > -1; i--)
		{
			result = fns[i].call(this, result);
		}
		return result;
	};
};

kff.map = kff.curry(function(fn, obj)
{
	return obj.map(fn);
});


kff.imclone = function(obj)
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

kff.imset = function(keypath, value, obj)
{
	var fn = value;
	var root;
	if(typeof fn !== 'function') fn = function(){ return value; };

	if(keypath)
	{
		if(typeof keypath === 'string') keypath = keypath.split('.');

		root = kff.imclone(obj);
		var prev = root;

		if(keypath.length === 0) return fn(root);

		for(var i = 0, l = keypath.length; i < l - 1; i++)
		{
			prev = prev[keypath[i]] = kff.imclone(prev[keypath[i]]);
		}

		prev[keypath[i]] = fn(prev[keypath[i]]);
	}
	else
	{
		root = fn(obj);
	}

	return root;
};

kff.imremove = function(keypath, obj)
{
	if(typeof keypath === 'string') keypath = keypath.split('.');

	if(keypath)
	{
		var root = kff.imclone(obj);
		var prev = root;

		for(var i = 0, l = keypath.length; i < l - 1; i++)
		{
			prev = prev[keypath[i]] = kff.imclone(prev[keypath[i]]);
		}
		if(prev instanceof Array)
		{
			prev = prev.splice(keypath[i], 1);
		}
		else if(typeof prev === 'object' && prev !== null)
		{
			delete prev[keypath[i]];
		}
	}

	return root;
};


kff.functionService = function(fn)
{
	var fn2 = function()
	{
		return fn.apply(this, arguments);
	};
	fn2.service = { type: 'function'};
	return fn2;
};

kff.factoryService = function(fn)
{
	var fn2 = function()
	{
		return fn.apply(this, arguments);
	};
	fn2.service = { type: 'factory' };
	if(arguments.length > 1) fn2.service.args = Array.prototype.slice.call(arguments, 1);
	return fn2;
};


kff.arrayConcat = function(a1, a2)
{
	var l1 = a1.length, l2 = a2.length, l3 = l1 + l2; i = 0;
	var a3 = new Array(l3);
	while(i < l1)
	{
		a3[i] = a1[i];
		i++;
	}
	while(i < l3)
	{
		a3[i] = a2[i - l1];
		i++
	}
	return a3;
};

kff.Cursor = kff.createClass(
{
	constructor: function(root, keyPath)
	{
		this.root = root;
		this.keyPath = keyPath || [];
	},

	refine: function(keyPath)
	{
		if(typeof keyPath === 'string') keyPath = keyPath.split('.');
		return new kff.Cursor(this.root, kff.arrayConcat(this.keyPath, keyPath));
	},

	get: function()
	{
		return kff.evalObjectPath(this.keyPath, this.root);
	},

	getIn: function(keyPath)
	{
		return kff.evalObjectPath(this.keyPath.concat(keyPath), this.root);
	},

	set: function(value)
	{
		var prop;
		if(this.keyPath.length === 0)
		{
			if(typeof value === 'object' && value !== null)
			{
				for(prop in value)
				{
					this.root[prop] = kff.imset([], value[prop], this.root[prop]);
				}
			}
		}
		else
		{
			prop = this.keyPath[0];
			var keyPath = this.keyPath.slice(1);
			this.root[prop] = kff.imset(keyPath, value, this.root[prop]);
		}
	},

	setIn: function(path, value)
	{
		this.refine(path).set(value);
	},

	update: function(fn)
	{
		if(this.keyPath.length < 1) return;
		var prop = this.keyPath[0];
		var keyPath = this.keyPath.slice(1);
		this.root[prop] = kff.imset(keyPath, fn, this.root[prop]);
	},

	remove: function()
	{
		if(this.keyPath.length < 1) return;
		var prop = this.keyPath[0];
		var keyPath = this.keyPath.slice(1);
		this.root[prop] = kff.imremove(keyPath, this.root[prop]);
	},

	equalsTo: function(cursor)
	{
		if(!cursor || cursor.root !== this.root) return false;
		return kff.compareArrays(this.keyPath, cursor.keyPath);
	}

});


kff.useJquery = true;

if(typeof document === 'object' && document !== null)
{
	var matchesMethodName;
	if('webkitMatchesSelector' in document.documentElement) matchesMethodName = 'webkitMatchesSelector';
	else if('mozMatchesSelector' in document.documentElement) matchesMethodName = 'mozMatchesSelector';
	else if('oMatchesSelector' in document.documentElement) matchesMethodName = 'oMatchesSelector';
	else if('msMatchesSelector' in document.documentElement) matchesMethodName = 'msMatchesSelector';
}

kff.Dom = kff.createClass(
/** @lends kff.Dom.prototype	*/
{
	/**
	 * @constructs
	 * @param  {DOMElement} element DOM element
	 */
	constructor: function(element)
	{
		this['0'] = element;
		this.handlers = null;
	},

	/**
	 * Delegates DOM events on this element
	 *
	 * @param  {string} type      Event type (i.e. 'click')
	 * @param  {string} selector  CSS selector
	 * @param  {function} handler Event handler
	 */
	on: function(type, selector, handler)
	{
		if(!this.handlers) this.handlers = {};
		var types = type.split(/\s+/);
		for(var i = 0, l = types.length; i < l; i++)
		{
			if(arguments.length === 3)
			{
				if(!this.handlers[selector])
				{
					this.handlers[selector] = this.f(this.delegatedEventHandler, [this['0'], selector, handler]);
				}
				this['0'].addEventListener(types[i], this.handlers[selector], false);
			}
			else
			{
				this['0'].addEventListener(types[i], selector, false);
			}
		}
	},

	/**
	 * Unbinds delegated DOM event handler from this element
	 *
	 * @param  {string} type      Event type (i.e. 'click')
	 * @param  {string} selector  CSS selector
	 * @param  {function} handler Previously bound event handler
	 */
	off: function(type, selector, handler)
	{
		if(!this.handlers) this.handlers = {};
		var types = type.split(/\s+/);
		for(var i = 0, l = types.length; i < l; i++)
		{
			if(arguments.length === 3)
			{
				if(this.handlers[selector])
				{
					this['0'].removeEventListener(types[i], this.handlers[selector], false);
				}
			}
			else
			{
				this['0'].removeEventListener(types[i], selector, false);
			}
		}
	},

	/**
	 * Intermediate event handler for delegating event to its appropriate handler(s)
	 *
	 * @param  {DOMElement} el    DOM element
	 * @param  {string} selector  CSS selector
	 * @param  {function} handler Event handler
	 * @param  {DOMEvent} event   DOM event
	 */
	delegatedEventHandler: function(el, selector, handler, event)
	{
		var target = event.target;

		while(target !== el)
		{
			if(matchesMethodName)
			{
				if(target[matchesMethodName](selector))
				{
					event.matchedTarget = target;
					handler.call(target, event);
					break;
				}
			}
			else
			{
				if(this.matches(el, target, selector))
				{
					event.matchedTarget = target;
					handler.call(target, event);
					break;
				}
			}
			target = target.parentNode;
		}
	},

	/**
	 * Matches target element against CSS selector starting from element el
	 *
	 * @param  {DOMElement} el     Root DOM element
	 * @param  {DOMElement} target Target DOM element
	 * @param  {string} selector   CSS selector
	 * @return {boolean}           True if target element matches CSS selector, false otherwise
	 */
	matches: function(el, target, selector)
	{
		var elements = el.querySelectorAll(selector);
		return kff.arrayIndexOf(elements, target) !== -1;
	},

	/**
	 * Sets innerHTML of element
	 *
	 * @param  {string} html HTML string to be set
	 */
	html: function(html)
	{
		this['0'].innerHTML = html;
	},

	/**
	 * Removes element from the DOM
	 */
	remove: function()
	{
		if(this['0'].parentNode)
		{
			this['0'].parentNode.removeChild(this['0']);
			this['0'] = null;
		}
	}
});

/**
 * Wrapper for DOM element.
 * This function returns either jQuery object that wraps DOM element or partially compatible kff.DOM wrapper.
 * JQuery is used if kff.useJquery === true (default setting is true) and jQuery exists in window object.
 *
 * @param  {DOMElement} element Single DOM element
 * @return {object}             JQuery object or kff.Dom wrapper object
 */
kff.$ = function(element)
{
	if(kff.useJquery && typeof window === 'object' && window.jQuery)
	{
		kff.$ = window.jQuery;
	}
	else
	{
		kff.$ = function(element)
		{
			var el;
			if(element instanceof kff.Dom) el = new kff.Dom(element[0]);
			else el =  new kff.Dom(element);
			return el;
		};
	}
	return kff.$(element);
};

var $ = kff.$;

kff.EventStream = kff.createClass({
	statics: {
		END: {}
	}
},
/** @lends kff.EventStream.prototype */
{
	/**
	 * @constructs
	 */
	constructor: function()
	{
		this.subscribers = [];
		this.oneSubscribers = [];
	},

	/**
	 * Binds event handler.
	 *
	 * @param {string|Array} eventType Event name(s)
	 * @param {function} fn Event handler
	 */
	on: function(fn)
	{
		if(kff.arrayIndexOf(this.subscribers, fn) === -1) this.subscribers.push(fn);
		return this;
	},

	/**
	 * Binds event handler that will be executed only once.
	 *
	 * @param {string|Array} eventType Event name(s)
	 * @param {function} fn Event handler
	 */
	one: function(eventType, fn)
	{
		this.oneSubscribers.push(fn);
		return this.on(fn);
	},

	/**
	 * Unbinds event handler.
	 *
	 * @param {string|Array} eventType Event name(s)
	 * @param {function} fn Event handler
	 */
	off: function(fn)
	{
		var i = kff.arrayIndexOf(this.subscribers, fn);
		if(i !== -1) this.subscribers.splice(i, 1);

		i = kff.arrayIndexOf(this.oneSubscribers, fn);
		if(i !== -1) this.oneSubscribers.splice(i, 1);

		return this;
	},

	offAll: function()
	{
		this.subscribers = [];
		this.oneSubscribers = [];
		return this;
	},

	/**
	 * Triggers an event.
	 *
	 * @param {string|Array} eventType Event name(s)
	 * @param {mixed} eventData Arbitrary data that will be passed to the event handlers as an argument
	 */
	trigger: function(eventData)
	{
		var i, l;

		if(eventData === kff.EventStream.END)
		{
			return this.offAll();
		}

		for(i = 0, l = this.subscribers.length; i < l; i++)
		{
			if(typeof this.subscribers[i] === 'function') this.subscribers[i].call(null, eventData);
		}

		// Remove "one" subscribers:
		for(i = 0, l = this.oneSubscribers.length; i < l; i++)
		{
			this.off(this.oneSubscribers[i]);
		}


		return this;
	},

	map: function(fn)
	{
		var mes = new kff.EventStream();

		this.on(function(event){
			mes.trigger(fn.call(null, event));
		});

		return mes;
	},

	filter: function(fn)
	{
		var fes = new kff.EventStream();

		this.on(function(event){
			if(fn.call(null, event)) fes.trigger(event);
		});

		return fes;
	},

	merge: function(es)
	{
		var mes = new kff.EventStream();

		this.on(mes.f('trigger'));
		es.on(mes.f('trigger'));

		return mes;
	},

	end: function()
	{
		this.trigger(kff.EventStream.END);
	}


});







// kff.es = {};

// kff.es.createStream = function()
// {
// 	return {
// 		subscribers: [],
// 		oneSubscribers: []
// 	};
// };

// kff.es.on = function(fn, stream)
// {
// 	var newStream = {
// 		subscribers: null,
// 		oneSubscribers: null
// 	};

// 	if(kff.arrayIndexOf(stream.subscribers, fn) === -1) {
// 		newStream.subscribers = stream.subscribers.concat(fn);
// 	}

// 	return newStream;
// };


// 	on: function(fn)
// 	{
// 		if(kff.arrayIndexOf(this.subscribers, fn) === -1) this.subscribers.push(fn);
// 		return this;
// 	},

// 	*
// 	 * Binds event handler that will be executed only once.
// 	 *
// 	 * @param {string|Array} eventType Event name(s)
// 	 * @param {function} fn Event handler

// 	one: function(eventType, fn)
// 	{
// 		this.oneSubscribers.push(fn);
// 		return this.on(fn);
// 	},

// 	/**
// 	 * Unbinds event handler.
// 	 *
// 	 * @param {string|Array} eventType Event name(s)
// 	 * @param {function} fn Event handler
// 	 */
// 	off: function(fn)
// 	{
// 		var i = kff.arrayIndexOf(this.subscribers, fn);
// 		if(i !== -1) this.subscribers.splice(i, 1);

// 		i = kff.arrayIndexOf(this.oneSubscribers, fn);
// 		if(i !== -1) this.oneSubscribers.splice(i, 1);

// 		return this;
// 	},

// 	offAll: function()
// 	{
// 		this.subscribers = [];
// 		this.oneSubscribers = [];
// 		return this;
// 	},



kff.Events = kff.createClass(
/** @lends kff.Events.prototype */
{
	/**
	 * @constructs
	 */
	constructor: function()
	{
		this.subscribers = {};
		this.oneSubscribers = {};
		this.allSubscribers = [];
		this.oneAllSubscribers = [];
	},

	/**
	 * Binds event handler.
	 *
	 * @param {string|Array} eventType Event name(s)
	 * @param {function} fn Event handler
	 */
	on: function(eventType, fn)
	{
		if(arguments.length === 1)
		{
			return this.onAll(eventType);
		}
		else if(typeof eventType === 'string')
		{
			if(!this.subscribers[eventType]) this.subscribers[eventType] = [];
			if(kff.arrayIndexOf(this.subscribers[eventType], fn) === -1)	this.subscribers[eventType].push(fn);
		}
		else if(eventType instanceof Array)
		{
			for(var i = 0, l = eventType.length; i < l; i++)
			{
				if(eventType[i])
				{
					if(!this.subscribers[eventType[i]]) this.subscribers[eventType[i]] = [];
					if(kff.arrayIndexOf(this.subscribers[eventType[i]], fn) === -1) this.subscribers[eventType[i]].push(fn);
				}
			}
		}
	},

	/**
	 * Binds event handler.
	 *
	 * @param {function} fn Event handler
	 */
	onAll: function(fn)
	{
		if(kff.arrayIndexOf(this.allSubscribers, fn) === -1) this.allSubscribers.push(fn);
	},

	/**
	 * Binds event handler that will be executed only once.
	 *
	 * @param {string|Array} eventType Event name(s)
	 * @param {function} fn Event handler
	 */
	one: function(eventType, fn)
	{
		if(!(eventType in this.oneSubscribers)) this.oneSubscribers[eventType] = [];
		this.oneSubscribers[eventType].push(fn);
		this.on(eventType, fn);
	},

	/**
	 * Unbinds event handler.
	 *
	 * @param {string|Array} eventType Event name(s)
	 * @param {function} fn Event handler
	 */
	off: function(eventType, fn)
	{
		var i, l;
		if(arguments.length === 1)
		{
			return this.offAll(eventType);
		}
		if(typeof eventType === 'string')
		{
			if(this.subscribers[eventType] instanceof Array)
			{
				i = kff.arrayIndexOf(this.subscribers[eventType], fn);
				if(i !== -1) this.subscribers[eventType].splice(i, 1);
			}
		}
		else if(eventType instanceof Array)
		{
			for(i = 0, l = eventType.length; i < l; i++)
			{
				if(eventType[i]) this.off(eventType[i], fn);
			}
		}
	},

	/**
	 * Unbinds event handler.
	 *
	 * @param {function} fn Event handler
	 */
	offAll: function(fn)
	{
		var i = kff.arrayIndexOf(this.allSubscribers, fn);
		if(i !== -1) this.allSubscribers.splice(i, 1);
	},

	/**
	 * Triggers an event.
	 *
	 * @param {string|Array} eventType Event name(s)
	 * @param {mixed} eventData Arbitrary data that will be passed to the event handlers as an argument
	 */
	trigger: function(eventType, eventData)
	{
		var i, l;

		if(typeof eventType === 'string')
		{
			if(this.subscribers[eventType] instanceof Array)
			{
				for(i = 0, l = this.subscribers[eventType].length; i < l; i++)
				{
					if(typeof this.subscribers[eventType][i] === 'function') this.subscribers[eventType][i].call(null, eventData);
				}

				// Remove "one" subscribers:
				if(eventType in this.oneSubscribers)
				{
					for(i = 0, l = this.oneSubscribers[eventType].length; i < l; i++)
					{
						this.off(eventType, this.oneSubscribers[eventType][i]);
					}
					this.oneSubscribers[eventType] = [];
				}
			}
		}
		else if(eventType instanceof Array)
		{
			for(i = 0, l = eventType.length; i < l; i++)
			{
				if(eventType[i]) this.trigger(eventType[i], eventData);
			}
		}
	}
});

kff.EventsMixin =
{
	initEvents: function()
	{
		this.events = null;
	},
	createEvents: function()
	{
		this.events = new kff.Events();
	},
	on: function(eventType, fn)
	{
		if(this.events == null) this.createEvents();
		return this.events.on(eventType, fn);
	},
	one: function(eventType, fn)
	{
		if(this.events == null) this.createEvents();
		return this.events.one(eventType, fn);
	},
	off: function(eventType, fn)
	{
		if(this.events == null) this.createEvents();
		return this.events.off(eventType, fn);
	},
	trigger: function(eventType, eventData)
	{
		if(this.events == null) this.createEvents();
		return this.events.trigger(eventType, eventData);
	}
};


kff.ServiceContainer = kff.createClass(
{
	statics:
	{
		CONFIG_CONSTRUCTOR: 'construct',
		serviceNameRegex: /^[^\s#]*/
	}
},
/** @lends kff.ServiceContainer.prototype */
{
	/**
	 * Simple dependency injection (or service) container class.
	 * @constructs
	 * @param {Object} config Configuration object
	 */
	constructor: function(config, loader)
	{
		this.config = config || { parameters: {}, services: {}, modules: null };
		this.services = {};
		this.cachedParams = {};
		if(loader) this.loadService = loader;
	},

	/**
	 * Returns instance of service class.
	 * @param {string} service Service name (service config to be found in config.services[service])
	 * @param {Array} argsExtend Array to overload default arguments array (optional)
	 * @returns {Object} Instance of service
	 */
	getService: function(serviceName, argsExtend)
	{
		var serviceConfig;
		if(!this.config.services[serviceName])
		{
			serviceConfig = this.getServiceConfigAnnotation(serviceName);
			if(serviceConfig) this.config.services[serviceName] = serviceConfig;
			else throw new Error('Service ' + serviceName + ' not defined');
		}
		if(this.config.services[serviceName].shared)
		{
			if(typeof this.services[serviceName] === 'undefined') this.services[serviceName] = this.createService(serviceName, argsExtend);
			return this.services[serviceName];
		}
		return this.createService(serviceName, argsExtend);
	},

	/**
	 * Checks if given serviceName exists in container declaration
	 * @param {string} serviceName Service name
	 * @returns {boolean} True if service exists, false otherwise
	 */
	hasService: function(serviceName)
	{
		if(this.config.services.hasOwnProperty(serviceName)) return true;
		else {
			var serviceConfig = this.getServiceConfigAnnotation(serviceName);
			if(serviceConfig)
			{
				this.config.services[serviceName] = serviceConfig;
				return true;
			}
		}
		return false;
	},

	/**
	 * Creates instance of service.
	 *
	 * If second argument is passed, then it will be used to overload constructor arguments.
	 * If items at the same index are both objects, then the second one will bee deep-mixed into
	 * the first one resulting in a new object (i.e. the config args won't be overwritten).
	 *
	 * @param {string} serviceName Name of service to be instantiated
	 * @param {Array} argsExtend Array to overload default arguments array (optional)
	 * @returns {Object} Instance of service
	 */
	createService: function(serviceName, argsExtend)
	{
		var serviceConfig, Ctor, Temp, service, ret, i, l, args, argsExtended, calls;

		serviceConfig = this.config.services[serviceName];

		Ctor = this.getServiceConstructor(serviceName);

		if(typeof Ctor !== 'function' || serviceConfig.type === 'function') return Ctor;

		if(serviceConfig.type !== 'factory')
		{
			Temp = function(){};
			Temp.prototype = Ctor.prototype;
			service = new Temp();
		}

		args = this.resolveParameters(serviceConfig.args || []);
		if(argsExtend && argsExtend instanceof Array)
		{
			argsExtended = [];
			for(i = 0, l = argsExtend.length; i < l; i++)
			{
				if(argsExtend[i] !== undefined)
				{
					if(kff.isPlainObject(args[i]) && kff.isPlainObject(argsExtend[i])) argsExtended[i] = kff.mixins({}, args[i], argsExtend[i]);
					else argsExtended[i] = argsExtend[i];
				}
				else argsExtended[i] = args[i];
			}
			args = argsExtended;
		}

		if(serviceConfig.type === 'factory')
		{
			service = Ctor.apply(null, args);
		}
		else
		{
			ret = Ctor.apply(service, args);
			if(Object(ret) === ret) service = ret;
		}

		calls = serviceConfig.calls;
		if(calls instanceof Array)
		{
			for(i = 0, l = calls.length; i < l; i++)
			{
				service[calls[i].method].apply(service, this.resolveParameters(calls[i].args));
			}
		}
		return service;
	},

	/**
	 * Returns constructor function for given service name.
	 * @param {string} serviceName Service name
	 * @returns {function} Constructor function for service
	 */
	getServiceConstructor: function(serviceName)
	{
		var serviceConfig, ctor, construct = kff.ServiceContainer.CONFIG_CONSTRUCTOR, type, name, serviceObject;
		serviceConfig = this.config.services[serviceName];
		if(!serviceConfig)
		{
			serviceConfig = this.getServiceConfigAnnotation(serviceName);
			if(!serviceConfig) return null;
			else this.config.services[serviceName] = serviceConfig;
		}

		if(serviceConfig.construct) construct = serviceConfig.construct;
		else construct = serviceName;

		if(!serviceConfig.hasOwnProperty('serviceObject'))
		{
			if(typeof construct === 'string')
			{
				serviceConfig['serviceObject'] = this.loadService(construct);
			}
			else serviceConfig['serviceObject'] = construct;
			if(!serviceConfig['serviceObject']) return null;
		}

		return serviceConfig['serviceObject'];
	},

	/**
	 * Returns configuration object of a service from its constructor (function).
	 * @param  {string} serviceName Name of service
	 * @return {object}             Service configuration object
	 */
	getServiceConfigAnnotation: function(serviceName)
	{
		var serviceConfig = {};
		var ctor = this.loadService(serviceName);
		if(typeof ctor === 'function')
		{
			if('service' in ctor && kff.isPlainObject(ctor.service)) serviceConfig = ctor.service;
			serviceConfig.serviceObject = ctor;
			return serviceConfig;
		}
		else if(ctor)
		{
			serviceConfig.serviceObject = ctor;
			return serviceConfig;
		}
		return null;
	},

	/**
	 * Evaluates parameter defined in container configuration.
	 *
	 * Parameter could be:
	 *
	 * - a string - see below
	 * - an Array or Object - iterates over properties and evaluates them recursively
	 *
	 * String parameters refers to parameters defined in config.parameters section
	 * If parameter is a string, it could have these special chars:
	 * '@serviceName' - resolves to instance of service
	 *
	 * @param {string|Array|Object} params Parameters to be resolved
	 * @returns {mixed} Resolved parameter value
	 */
	resolveParameters: function(params)
	{
		var ret, i, l, config;

		config = this.config;

		if(typeof params === 'string')
		{
			if(params.indexOf('@@') === 0)
			{
				params = params.slice(2);
				if(params.length === 0) ret = null;
				else ret = this.createServiceFactory(params);
			}
			else if(params.charAt(0) === '@')
			{
				params = params.slice(1);
				if(params.length === 0) ret = this;
				else ret = this.getService(params);
			}
			else
			{
				ret = params;
			}
		}
		else if(params instanceof Array)
		{
			ret = [];
			for(i = 0, l = params.length; i < l; i++)
			{
				ret[i] = this.resolveParameters(params[i]);
			}
		}
		else if(kff.isPlainObject(params))
		{
			ret = {};
			for(i in params)
			{
				if(params.hasOwnProperty(i)) ret[i] = this.resolveParameters(params[i]);
			}
		}
		else
		{
			ret = params;
		}
		return ret;
	},

	/**
	 * Registers a new service configuration
	 *
	 * @param  {Object} services Services configuration object
	 * @param  {Boolean} overwrite If service already exists, overwrite it with new config
	 */
	registerServices: function(services, overwrite)
	{
		var service;
		for(service in services)
		{
			if(!this.config.services.hasOwnProperty(service) || overwrite)
			{
				this.config.services[service] = services[service];
				this.services[service] = undefined;
			}
		}
	},

	/**
	 * Returns a service (constructor, function or another type of service)
	 * @param  {string}   serviceName Name of service
	 * @return {mixed}                Service constructor or factory or any other type of service
	 */
	loadService: function(serviceName)
	{
		var module;
		if(typeof serviceName === 'string')
		{
			var match = serviceName.match(kff.ServiceContainer.serviceNameRegex);
			if(match)
			{
				serviceName = match[0];
			}
		}

		if(this.config.modules)
		{
			module = kff.evalObjectPath(serviceName, this.config.modules);
			if(module) return module;
		}

		module = kff.require(serviceName);

		if(module) return module;

		return kff.evalObjectPath(serviceName);
	},

	/**
	 * Creates a factory function for a service
	 * @param  {string} serviceName Name of the service
	 * @return {function}           Factory function that returns the service
	 */
	createServiceFactory: function(serviceName)
	{
		var container = this;
		return function()
		{
			return container.getService(serviceName);
		};
	}

});





(function()
{

var bindingRegex = /(?:([.a-zA-Z0-9*-]+))(?:\(([@.a-zA-Z0-9*,\s-]+)*\))?((?::[a-zA-Z0-9]+(?:\((?:[^()]*)\))?)*)/g;

var operatorsRegex = /:([a-zA-Z0-9]+)(?:\(([^()]*)\))?/g;

var commaSeparateRegex = /\s*,\s*/;

var modifierSeparateRegex = /([^{},\s]+)|({[a-zA-Z0-9,\[\]_\-\.\s@*]+})/g;

var leadingPeriodRegex = /^\./;

var trailingPeriodRegex = /\.$/;


kff.View = kff.createClass(
{
	mixins: kff.EventsMixin,
	statics: {

		/**
		 * Object hash that holds references to binder classes under short key names
		 * @private
		*/
		binders: {},

		helpers: {},

		/**
		 * Registers binder class
		 *
		 * @param {string} alias Alias name used in binding data-attributes
		 * @param {kff.Binder} binder Binder class to register
		 */
		registerBinder: function(alias, binder)
		{
			kff.View.binders[alias] = binder;
		},

		/**
		 * Registers helper function to be used as parser/formatter
		 *
		 * @param {string} alias Name of helper function
		 * @param {function} helper Helper function
		 */
		registerHelper: function(alias, helper)
		{
			kff.View.helpers[alias] = helper;
		}
	}
},
/** @lends kff.View.prototype */
{
	/**
	 * Base class for views
	 *
	 * @constructs
	 * @param {Object} options Options object
	 * @param {DOM Element|jQuery} options.element A DOM element that will be a root element of the view
	 * @param {Array} options.scope Array of model instances to be used by the view
	 */
	constructor: function(options)
	{
		options = options || {};

		this.modelBindersMap = null;
		this.collectionBinder = null;
		this.collectionCountBinder = null;
		this.bindingIndex = null;
		this.itemAlias = null;

		this.subviewsStruct = null;
		this.explicitSubviewsStruct = null;
		this.subviews = null;
		this.viewFactory = null;
		this.cachedRegions = null;
		this.pendingRefresh = false;
		this.subviewsScope = null;

		this.initEvents();

		if(options.scope)
		{
			this.scope = options.scope;
			options.scope = null;
		}
		else this.scope = {};

		if(options.parentView)
		{
			this.setParentView(options.parentView);
		}

		if(options.events)
		{
			this.domEvents = options.events.slice();
		}
		else this.domEvents = [];

		if(options.element)
		{
			this.$element = $(options.element);
			options.element = null;
		}

		if(options.viewFactory)
		{
			this.viewFactory = options.viewFactory;
		}

		if(options.dispatcher)
		{
			this.dispatcher = options.dispatcher;
		}
		else this.dispatcher = null;

		if(options.actions && this.dispatcher)
		{
			this.actions = options.actions;
		}
		else this.actions = null;

		if(options.env)
		{
			this.env = options.env;
		}

		this.options = options;

	},


	/**
	 * Renders the view. It will be called automatically. Should not be called
	 * directly.
	 */
	render: kff.noop,

	/**
	 * Renders the view. It will be called automatically. Should not be called
	 * directly.
	 */
	run: kff.noop,

	/**
	 * Method for refreshing the view. Does nothing in this base class, it's intended to be overloaded in subclasses.
	 */
	refresh: kff.noop,

	/**
	 * Destroys the view (destroys all subviews and unbinds previously bound DOM events.
	 * It will be called automatically. Should not be called directly.
	 */
	destroy: kff.noop,

	/**
	 * Initializes the view. Calls the render method. Should not be overloaded
	 * by subclasses.
	 *
	 * @private
	 * @param
	 */
	init: function()
	{
		this.renderAll();
		this.runAll();
	},

	/**
	 * Renders the view. It will be called automatically. Should not be called
	 * directly.
	 */
	renderAll: function()
	{
		if(!this.modelBindersMap) this.initBinding();
		if(!this.collectionBinder)
		{
			if(!this.viewFactory) this.viewFactory = new kff.ViewFactory();
			this.explicitSubviewsStruct = null;
			this.renderRegions(this.options.regions);
			if(this.render !== kff.noop) this.render();
			this.renderSubviews();
		}
	},

	/**
	 * Runs the view (i.e. binds events and models). It will be called automatically. Should not be called
	 * directly.
	 */
	runAll: function()
	{
		if(this.collectionBinder)
		{
			this.runSubviews();
		}
		else
		{
			if(this.modelBindersMap) this.modelBindersMap.initBinders();

			if(this.run !== kff.noop) this.run();
			this.runSubviews();

			this.delegateEvents();

			if(this.actions)
			{
				if(!this.dispatcher) this.dispatcher = new kff.Dispatcher();
				this.dispatcher.registerActions(this.actions);
			}

			if(this.dispatcher)
			{
				this.dispatcher.on('refresh', this.f('refreshAll'));
				this.dispatcher.on('refreshFromRoot', this.f('refreshFromRoot'));
			}

			if(typeof this.afterRender === 'function') this.afterRender();

			this.$element[0].setAttribute(kff.DATA_RENDERED_ATTR, true);

			this.refreshOwnBinders(true);
		}
	},

	requestRefreshAll: function()
	{
		if(this.env.window.requestAnimationFrame)
		{
			if(!this.pendingRefresh)
			{
				this.pendingRefresh = true;
				this.env.window.requestAnimationFrame(this.f('refreshAll'));
			}
		}
		else this.refreshAll();
	},

	/**
	 * Refreshes all binders, subviews and bound views
	 */
	refreshAll: function()
	{
		if(typeof this.refresh === 'function') this.refresh();
		if(this.collectionBinder)
		{
			this.collectionBinder.refreshBoundViews();
			this.collectionBinder.refreshAll();
		}
		else
		{
			this.rebindCursors();
			this.refreshOwnBinders();
			if(this.subviews !== null)
			{
				for(var i = 0, l = this.subviews.length; i < l; i++) this.subviews[i].refreshAll();
			}
		}
		this.pendingRefresh = false;
	},

	/**
	 * Refreshes all views from root
	 */
	refreshFromRoot: function()
	{
		var view = this;
		while(view.parentView)
		{
			view = view.parentView;
		}

		if(view.dispatcher !== null)
		{
			view.dispatcher.trigger({ type: 'refresh' });
		}
	},

	/**
	 * Destroys the view (destroys all subviews and unbinds previously bound DOM events.
	 * It will be called automatically. Should not be called directly.
	 */
	destroyAll: function()
	{
		this.destroyBinding();

		if(this.collectionBinder) this.collectionBinder.destroyBoundViews();

		this.modelBindersMap = null;
		this.collectionBinder = null;
		this.bindingIndex = null;
		this.itemAlias = null;

		this.$element[0].removeAttribute(kff.DATA_RENDERED_ATTR);
		this.undelegateEvents();
		this.destroySubviews();
		if(this.dispatcher)
		{
			this.dispatcher.off('refresh', this.f('refreshAll'));
			this.dispatcher.off('refreshFromRoot', this.f('refreshFromRoot'));
		}

		if(this.destroy !== kff.noop) this.destroy();
		if(typeof this.afterDestroy === 'function') this.afterDestroy();

		this.subviewsStruct = null;
		this.explicitSubviewsStruct = null;
		this.subviews = null;

		this.clearRegions(this.options.regions);
	},

	/**
	 * Renders subviews. Will find all DOM descendats with
	 * kff.DATA_KFF_VIEW (or kff.DATA_BIND_ATTR) attribute and
	 * initializes subviews on them. If an element has the
	 * kff.DATA_BIND_ATTR but not the kff.DATA_KFF_VIEW attribute,
	 * adds kff.DATA_KFF_VIEW attribute = "kff.BindingView" and inits
	 * implicit data-binding.
	 */
	renderSubviews: function()
	{
		if(!this.collectionBinder)
		{
			var i, l, element = this.$element[0],
				subView, options, opt, rendered, subviewsStruct = null;

			if(element) this.subviewsStruct = this.findViewElements(element);

			if(this.explicitSubviewsStruct !== null)
			{
				if(this.subviewsStruct === null) this.subviewsStruct = [];
				subviewsStruct = kff.arrayConcat(this.subviewsStruct, this.explicitSubviewsStruct);
			}
			else if(this.subviewsStruct !== null) subviewsStruct = this.subviewsStruct.slice();

			// Render subviews
			if(subviewsStruct !== null)
			{
				for(i = 0, l = subviewsStruct.length; i < l; i++)
				{
					options = subviewsStruct[i].options;
					options.element = subviewsStruct[i].$element[0];
					options.env = this.env;
					subView = this.createView(subviewsStruct[i].viewName, options);
					if(subView instanceof kff.View)
					{
						subView.renderAll();
					}
				}
			}
		}
	},

	/**
	 * Runs subviews
	 */
	runSubviews: function()
	{
		if(this.collectionBinder)
		{
			this.collectionBinder.renderBoundViews();
		}
		else
		{
			if(this.subviews)
			{
				for(var i = 0, l = this.subviews.length; i < l; i++)
				{
					this.subviews[i].runAll();
				}
			}
		}
	},

	/**
	 * Destroys the subviews. It will be called automatically. Should not be called directly.
	 */
	destroySubviews: function()
	{
		if(this.collectionBinder)
		{
			this.collectionBinder.destroyBoundViews();
		}
		else
		{
			var subView, i, l;

			// Destroy subviews
			if(this.subviews !== null)
			{
				for(i = 0, l = this.subviews.length; i < l; i++)
				{
					subView = this.subviews[i];
					subView.destroyAll();
				}
			}
			this.subviews = null;
			this.subviewsStruct = null;
		}
	},

	/**
	 * Destroys and renders+runs the view with optional new html content
	 * @param  {string} html HTML tepmlate (optional)
	 */
	rerender: function(html)
	{
		this.destroyAll();
		if(html !== undefined) this.$element[0].innerHTML = html;
		this.renderAll();
		this.runAll();
	},


	/**
	 * Returns a model object bound to the view or to the parent view.
	 *
	 * Accepts the model name as a string or key path in the form of "modelName.attribute.nextAttribute etc.".
	 * Will search for "modelName" in current view, then in parent view etc. When found, returns a value of
	 * "attribute.nextAtrribute" using model's	mget method.
	 *
	 * @param {string} modelPath Key path of model in the form of "modelName.attribute.nextAttribute etc.".
	 * @return {mixed} A model instance or attribute value or null if not found.
	 */
	getCursor: function(keyPath)
	{
		if(typeof keyPath === 'string') keyPath = keyPath.split('.');

		var rootCursorName = keyPath[0];
		var keyPath = keyPath.slice(1);
		var rootCursor = this.scope[rootCursorName];
		if(!(rootCursor instanceof kff.Cursor)) rootCursor = new kff.Cursor(rootCursor, keyPath);

		var cursor = rootCursor.refine(keyPath);

		return cursor;
	},

	/**
	 * Adds events config to the internal events array.
	 *
	 * @private
	 * @param {Array} events Array of arrays of binding config
	 */
	addEvents: function(events)
	{
		if(!(events instanceof Array))
		{
			if(arguments.length === 2 || arguments.length === 3) this.domEvents.push(Array.prototype.slice.apply(arguments));
			return;
		}
		else if(!(events[0] instanceof Array))
		{
			events = Array.prototype.slice.apply(arguments);
		}
		Array.prototype.push.apply(this.domEvents, events);
	},

	/**
	 * Binds DOM events to the view element. Accepts array of arrays in the form:
	 *
	 * [
	 *     ['mousedown, mouseup', '.title', 'edit'],
	 *     ['click',  '.button', 'save' ],
	 *     ['click', function(e) { ... }]
	 * ]
	 *
	 * The first item is name of DOM event (or comma separated event names).
	 * The second item is a CSS experession (jquery expression) relative to the view element for event delegation (optional)
	 * The third item is the view method name (string) that acts as an event handler
	 *
	 * @param {Array} events Array of arrays of binding config
	 * @param {jQuery} $element A jQuery object that holds the DOM element to bind. If not provided, the view element will be used.
	 */
	delegateEvents: function(events, $element)
	{
		var event, i, l, fn;
		this.undelegateEvents(events, $element);
		events = events || this.domEvents;
		$element = $element || this.$element;
		for(i = 0, l = events.length; i < l; i++)
		{
			event = events[i];
			if(event.length >= 3)
			{
				if(typeof event[2] === 'string') fn = this.f(event[2]);
				else fn = event[2];

				if(typeof event[1] === 'string') $element.on(event[0], event[1], fn);
				else event[1].on(event[0], fn);
			}
			else if(event.length === 2)
			{
				if(typeof event[1] === 'string') fn = this.f(event[1]);
				else fn = event[1];

				$element.on(event[0], fn);
			}
		}
	},

	/**
	 * Unbinds DOM events from the view element. Accepts array of arrays as in
	 * the delegateEvents method.
	 *
	 * @param {Array} events Array of arrays of binding config
	 * @param {jQuery} $element A jQuery object that holds the DOM element to
	 * unbind. If not provided, the view element will be used.
	 */
	undelegateEvents: function(events, $element)
	{
		var event, i, l, fn;
		events = events || this.domEvents;
		$element = $element || this.$element;
		for(i = 0, l = events.length; i < l; i++)
		{
			event = events[i];
			if(event.length >= 3)
			{
				if(typeof event[2] === 'string') fn = this.f(event[2]);
				else fn = event[2];

				if(typeof event[1] === 'string') $element.off(event[0], event[1], fn);
				else event[1].off(event[0], fn);
			}
			else if(event.length === 2)
			{
				if(typeof event[1] === 'string') fn = this.f(event[1]);
				else fn = event[1];

				$element.off(event[0], fn);
			}
		}
	},

	/**
	 * Creates a new subview and adds it to the internal subviews list.
	 * The new subview is created using the viewFactory and gets properly set
	 * parentView.
	 *
	 * Do not use this method directly, use addSubview method instead.
	 *
	 * @private
	 * @param  {String} viewName Name of the view
	 * @param  {Object} options  Options object for the subview constructor
	 * @return {kff.View}        Created view
	 */
	createView: function(viewName, options)
	{
		var subviewScope;
		options.parentView = this;

		if(this.subviewsScope)
		{
			subviewScope = this.subviewsScope[viewName];

			if(typeof subviewScope === 'object' && subviewScope !== null)
			{
				var defaultViewOptions = this.viewFactory.getDefaultViewOptions(viewName);
				if(defaultViewOptions) options = kff.mixins(defaultViewOptions, options);
				if(options.scope) kff.mixins(options.scope, subviewScope);
				else options.scope = subviewScope;
			}
		}
		var subView = this.viewFactory.createView(viewName, options);
		if(subView instanceof kff.View)
		{
			subView.viewFactory = this.viewFactory;
			if(this.subviews === null) this.subviews = [];
			this.subviews.push(subView);
		}
		return subView;
	},

	/**
	 * Adds subview metadata to the internal list. The subviews from this list
	 * are then rendered in renderSubviews method which is automatically called
	 * when the view is rendered.
	 *
	 * This method can be used is in the render method to manually create a view
	 * that is not parsed from html/template (for example for an element that
	 * sits at the end od the body element).
	 *
	 * @param {DOM element} element Element of the subview
	 * @param {String} viewName Name of the view
	 * @param {[type]} options  Options object for the subview constructor
	 */
	addSubview: function(element, viewName, options)
	{
		if(this.explicitSubviewsStruct === null) this.explicitSubviewsStruct = [];
		this.explicitSubviewsStruct.push({
			viewName: viewName,
			$element: $(element),
			options: options || {}
		});
	},

	setSubviewsScope: function(subviewsScope)
	{
		if(subviewsScope)
		{
			if(this.parentView === null)
			{
				this.subviewsScope = subviewsScope;
			}
			else if(this.subviewsScope)
			{
				var keys = Object.keys(subviewsScope);
				for(var i = 0, l = keys.length; i < l; i++)
				{
					key = keys[i];
					this.subviewsScope[key] = subviewsScope[key];
				}
			}
			else
			{
				this.subviewsScope = subviewsScope;
			}
		}
	},

	/**
	 * Finds possible subview elements inside an element
	 *
	 * @private
	 * @param  {DOM Element} el Root element from which search starts
	 * @param  {Array} viewNames Array that will be filled by found elements
	 *                           (items will be objects { objPath: viewName, $element: jQuery wrapper })
	 * @param  {string} filter  A jQuery selector for filtering elements (optional)
	 */
	findViewElements: function(el)
	{
		var node = el, viewName = null, rendered, onAttr, optAttr, index = 0, subviewsStruct = null;

		while((node = this.nextNode(el, node, viewName === null)) !== null)
		{
			viewName = null;
			rendered = node.getAttribute(kff.DATA_RENDERED_ATTR);

			if(!rendered)
			{
				viewName = node.getAttribute(kff.DATA_VIEW_ATTR);
				if(!viewName && node.getAttribute(kff.DATA_BIND_ATTR))
				{
					viewName = 'kff.View';
					node.setAttribute(kff.DATA_VIEW_ATTR, viewName);
				}
				if(viewName)
				{
					optAttr = node.getAttribute(kff.DATA_OPTIONS_ATTR);
					if(subviewsStruct === null) subviewsStruct = [];
					subviewsStruct.push({
						viewName: viewName,
						index: index,
						$element: $(node),
						options: optAttr ? JSON.parse(optAttr) : {}
					});
				}
			}
			index++;
		}
		return subviewsStruct;
	},

	/**
	 * Refreshes data-binders in all subviews.
	 *
	 * @param  {Object} event Any event object that caused refreshing
	 */
	refreshBinders: function(force)
	{
		if(this.collectionBinder)
		{
			this.collectionBinder.refreshBinders(force);
		}
		else
		{
			this.refreshOwnBinders(force);
			if(this.subviews !== null)
			{
				for(var i = 0, l = this.subviews.length; i < l; i++) this.subviews[i].refreshBinders(force);
			}
		}
	},

	/**
	 * Refreshes all indexed binders of this view or subviews
	 *
	 * @private
	 * @return {[type]} [description]
	 */
	refreshIndexedBinders: function()
	{
		if(this.collectionBinder)
		{
			this.collectionBinder.refreshIndexedBinders();
		}
		else
		{
			if(this.modelBindersMap)
			{
				this.modelBindersMap.refreshIndexedBinders();
			}
			if(this.subviews !== null)
			{
				for(var i = 0, l = this.subviews.length; i < l; i++) this.subviews[i].refreshIndexedBinders();
			}
		}
	},

	/**
	 * Dispatches event to the dispatcher
	 *
	 * @param  {object} event Event object to dispatch
	 */
	dispatchEvent: function(event)
	{
		var res, view = this;
		while(view)
		{
			if(view.dispatcher !== null && view.dispatcher.hasAction(event.type))
			{
				view.dispatcher.trigger(event);
				break;
			}
			view = view.parentView;
		}
	},

	/**
	 * Returns index of item in bound collection (closest collection in the view scope)
	 *
	 * @return {number} Item index
	 */
	getBindingIndex: function(modelName)
	{
		modelName = modelName || '*';
		if(this.bindingIndex !== null && this.scope.hasOwnProperty(modelName)) return this.bindingIndex;
		if(this.parentView instanceof kff.View) return this.parentView.getBindingIndex(modelName);
		return null;
	},

	/**
	 * Sets current binding index
	 *
	 * @private
	 */
	setBindingIndex: function(index)
	{
		this.bindingIndex = index;
	},


	/**
	 * Clones this binding view
	 *
	 * @return {kff.View} Cloned view
	 */
	clone: function()
	{
		var l;
		var clonedSubview;
		var options = this.options;

		options.parentView = null;
		options.env = this.env;

		var clonedView = new this.constructor(options);
		clonedView.viewFactory = this.viewFactory;


		if(this.subviews !== null)
		{
			l = this.subviews.length;
			clonedView.subviews = new Array(l);
			while(l--)
			{
				clonedSubview = this.subviews[l].clone();
				clonedView.subviews[l] = clonedSubview;
			}
		}

		if(this.subviewsStruct !== null)
		{
			clonedView.subviewsStruct = this.subviewsStruct.slice();
		}
		if(this.explicitSubviewsStruct !== null)
		{
			clonedView.explicitSubviewsStruct = this.explicitSubviewsStruct.slice();
		}
		if(this.cachedRegions)
		{
			clonedView.cachedRegions = this.cachedRegions;
			clonedView.cloneCachedRegions();
		}


		if(this.collectionBinder)
		{
			clonedView.collectionBinder = new kff.CollectionBinder(
			{
				view: clonedView,
				collection: null,
				collectionPathArray: this.collectionBinder.collectionPathArray
			});
		}

		if(this.modelBindersMap)
		{
			clonedView.modelBindersMap = this.modelBindersMap.clone();
			clonedView.modelBindersMap.setView(clonedView);
		}
		clonedView.itemAlias = this.itemAlias;

		return clonedView;
	},

	setParentView: function(parentView)
	{
		var oldScope, key, i, l;

		this.parentView = parentView;

		oldScope = this.scope || null;

		this.scope = kff.createObject(parentView.scope);

		if(oldScope)
		{
			var keys = Object.keys(oldScope);
			for(i = 0, l = keys.length; i < l; i++)
			{
				key = keys[i];
				this.scope[key] = oldScope[key];

			}
		}

		var oldSubviewsScope = this.subviewsScope || null;

		if(parentView.subviewsScope)
		{
			this.subviewsScope = kff.createObject(parentView.subviewsScope);

			if(oldSubviewsScope)
			{
				var keys = Object.keys(oldSubviewsScope);
				for(i = 0, l = keys.length; i < l; i++)
				{
					key = keys[i];
					this.subviewsScope[key] = oldSubviewsScope[key];
				}
			}
		}

		if(this.subviews !== null)
		{
			for(i = 0, l = this.subviews.length; i < l; i++)
			{
				this.subviews[i].setParentView(this);
			}
		}
	},

	setViewFactory: function(viewFactory)
	{
		this.viewFactory = viewFactory;
	},


	/**
	 * Rebinds the view to another DOM element
	 *
	 * @private
	 * @param  {DOMELement} element New DOM element of the view
	 */
	rebindElement: function(element)
	{
		var i, l;

		this.$element = $(element);

		this.rebindSubViews(element, {
			subviewIndex: 0,
			subviewsStructIndex: 0,
			index: 0
		});

		if(this.modelBindersMap)
		{
			this.modelBindersMap.setView(this);
		}

		if(this.collectionBinder)
		{
			this.collectionBinder.view = this;
		}

	},

	rebindSubViews: function(el, ids)
	{
		var node = el, doSubviews = true;
		var subviews = this.subviews, subviewsStruct = this.subviewsStruct;
		if(subviewsStruct !== null)
		{
			if(subviews === null) this.subviews = subviews = [];

			while((node = this.nextNode(el, node, doSubviews)) !== null)
			{
				if(subviewsStruct[ids.subviewIndex])
				{
					ids.subviewsStructIndex = subviewsStruct[ids.subviewIndex].index;
					if(ids.index === ids.subviewsStructIndex)
					{
						if(subviews[ids.subviewIndex])
						{
							subviews[ids.subviewIndex].rebindElement(node);
						}
						ids.subviewIndex++;
						doSubviews = false;
					}
					else doSubviews = true;
				}
				ids.index++;
			}
		}
	},

	nextNode: function(root, node, deep)
	{
		var parentNode, nextSibling, tempNode;
		do {
			if(deep && (tempNode = node.firstChild))
			{
				node = tempNode;
			}
			else
			{
				parentNode = node.parentNode;
				nextSibling = node.nextSibling;
				while(node !== root && nextSibling === null && parentNode !== null)
				{
					node = parentNode;
					parentNode = node.parentNode;
					nextSibling = node.nextSibling;
				}
				if(node && node !== root) node = nextSibling;
				else node = null;
			}
		} while (node && node.nodeType !== 1);
		return node;
	},

	renderRegions: function(regions)
	{
		var selector, env = this.env;

		var saveRegion = function(regions, cachedRegions, nodes, selector)
		{
			var node, fragment, childNodes;
			for(var i = 0, l = nodes.length; i < l; i++)
			{
				node = nodes[i];
				if(node.hasChildNodes())
				{
					if(!cachedRegions[selector]) cachedRegions[selector] = [];

					cachedRegions[selector][i] = fragment = env.document.createDocumentFragment();

					childNodes = new Array(node.childNodes.length);
					for(var i2 = 0, l2 = childNodes.length; i2 < l2; i2++)
					{
						childNodes[i2] = node.childNodes[i2];
					}
					for(i2 = 0, l2 = childNodes.length; i2 < l2; i2++)
					{
						fragment.appendChild(childNodes[i2]);
					}
				}
				node.innerHTML = regions[selector];
			}
		};

		if(kff.isPlainObject(regions))
		{
			if(!this.cachedRegions) this.cachedRegions = {};
			if('self' in regions) saveRegion(regions, this.cachedRegions, [this.$element[0]], 'self');
			for(selector in regions)
			{
				if(selector !== 'self')
				{
					saveRegion(regions, this.cachedRegions, this.$element[0].querySelectorAll(selector), selector);
				}

			}
		}
	},

	clearRegions: function(regions)
	{
		var selector, i, l, nodes, node, fragment;

		var unsaveRegion = function(regions, cachedRegions, nodes, selector)
		{
			var node, fragment;
			for(var i = nodes.length - 1; i >= 0; i--)
			{
				node = nodes[i];
				node.innerHTML = '';
				if(cachedRegions[selector])
				{
					fragment = cachedRegions[selector][i];
					if(fragment)
					{
						node.appendChild(fragment);
						cachedRegions[selector][i] = null;
					}
				}
			}
		};

		if(kff.isPlainObject(regions))
		{
			if('self' in regions) unsaveRegion(regions, this.cachedRegions, [this.$element[0]], 'self');
			for(var selector in regions)
			{
				if(selector !== 'self')
				{
					unsaveRegion(regions, this.cachedRegions, this.$element[0].querySelectorAll(selector), selector);
				}
			}
		}
	},

	cloneCachedRegions: function()
	{
		var selector, i, l, nodes, node, fragment;
		if(this.cachedRegions)
		{
			for(selector in this.cachedRegions)
			{
				fragments = this.cachedRegions[selector];
				for(i = 0, l = fragments.length; i < l; i++)
				{
					if(fragments[i].hasChildNodes())
					{
						childNodes = fragments[i].childNodes;
						fragment = this.env.document.createDocumentFragment();

						for(i2 = 0, l2 = childNodes.length; i2 < l2; i2++)
						{
							fragment.appendChild(childNodes[i2].cloneNode(true));
						}
						fragments[i] = fragment;
					}
				}
			}
		}
	},

	/* Methods from former BindingView */

	/**
	 * Initializes all bindings.
	 *
	 * Parses data-kff-bind attribute of view element and creates appropriate binder objects.
	 */
	initBinding: function()
	{
		var model, attr, result, result2, modelPathArray, i, ret, modelArgs;
		var dataBindAttr = this.$element[0].getAttribute(kff.DATA_BIND_ATTR);
		var modelName;

		bindingRegex.lastIndex = 0;

		this.modelBindersMap = new kff.BinderMap();

		while((result = bindingRegex.exec(dataBindAttr)) !== null)
		{
			modelPathArray = result[1].replace(leadingPeriodRegex, '*.').replace(trailingPeriodRegex, '.*').split('.');

			modelArgs = result[2];

			if(modelArgs)
			{
				modelArgs = modelArgs.split(commaSeparateRegex);
				for(var k = 0, kl = modelArgs.length; k < kl; k++)
				{
					if(modelArgs[k].charAt(0) === '@')
					{
						modelArgs[k] = modelArgs[k].slice(1).split('.');
					}
				}
			}

			var keyPath = modelPathArray;
			if(keyPath.length > 1 && keyPath[keyPath.length - 1] === '*') keyPath.pop();

			ret = this.parseBindingRegexp(result, true);

			if(ret.binderName === 'each')
			{
				if(!this.options.isBoundView)
				{
					this.collectionBinder = new kff.CollectionBinder({
						view: this,
						keyPath: keyPath,
						collectionArgs: modelArgs,
						filter: (ret.filter && ret.filter.length > 0) ? ret.filter[0] : null,
						sort: (ret.sort && ret.sort.length > 0) ? ret.sort[0] : null
					});
					if(ret.itemAliases && ret.itemAliases.length > 0)
					{
						this.itemAlias = ret.itemAliases[0];
					}
				}
			}
			else
			{
				if(!ret.binderName || !(ret.binderName in kff.View.binders)) break;

				var indexed = false;

				for(var j = ret.formatters.length - 1; j >= 0; j--)
				{
					if(ret.formatters[j].fn.indexed === true) indexed = true;
				}

				var modelBinder = new kff.View.binders[ret.binderName]({
					view: this,
					$element: this.$element,
					params: ret.binderParams,
					keyPath: keyPath,
					modelArgs: modelArgs,
					formatters: ret.formatters,
					parsers: ret.parsers,
					dispatch: ret.dispatch,
					eventNames: ret.eventNames,
					eventFilters: ret.eventFilters,
					fill: ret.fill,
					nopreventdef: ret.nopreventdef,
					indexed: indexed
				});

				this.modelBindersMap.add(modelBinder);
			}
		}
	},

	/**
	 * Parses single binding expression
	 *
	 * @private
	 * @param  {string} result           binding subexpression
	 * @param  {boolean} parseBinderName False for collection binder, true for regular binder
	 * @return {object}                  Object with parsed binding data
	 */
	parseBindingRegexp: function(result, parseBinderName)
	{
		var result2, i, modifierName, modifierParams;

		operatorsRegex.lastIndex = 0;

		var ret = {
			binderName: null,
			binderParams: null,
			formatters: [],
			parsers: [],
			setters: [],
			getters: [],
			eventNames: [],
			eventFilters: [],
			dispatch: null,
			fill: false,
			watchModelPath: false,
			nopreventdef: false,
			itemAliases: [],
			filter: [],
			sort: []
		};

		i = 0;
		while((result2 = operatorsRegex.exec(result[3])) !== null)
		{
			if(parseBinderName && i === 0)
			{
				// Parse binder name and params
				ret.binderName = result2[1];
				ret.binderParams = result2[2];

				if(ret.binderParams)
				{
					ret.binderParams = ret.binderParams.split(commaSeparateRegex);
				}
				else ret.binderParams = [];
			}
			else
			{
				modifierName = result2[1];
				modifierParams = [];

				if(result2[2])
				{
					modifierParams = result2[2].match(modifierSeparateRegex);
				}

				switch(modifierName){
					case 'f':
						this.parseHelpers(modifierParams, ret.formatters);
						break;
					case 'p':
						this.parseHelpers(modifierParams, ret.parsers);
						break;
					case 'on':
						this.parseSetters(modifierParams, ret.eventNames);
						break;
					case 'as':
						this.parseSetters(modifierParams, ret.itemAliases);
						break;
					case 'evf':
						this.parseHelpers(modifierParams, ret.eventFilters);
						break;
					case 'dispatch':
						ret.dispatch = [];
						this.parseSetters(modifierParams, ret.dispatch);
						break;
					case 'filter':
						this.parseSetters(modifierParams, ret.filter);
						break;
					case 'sort':
						this.parseSetters(modifierParams, ret.sort);
						break;
					case 'fill':
						ret.fill = true;
						break;
					case 'nopreventdef':
						ret.nopreventdef = true;
						break;
				}
			}
			i++;
		}
		return ret;
	},

	/**
	 * Parses modifier parameters of binding. Used to create parsers and formatters.
	 *
	 * @param {Array} modifierParams An arrray with modifier names
	 * @param {Array} modifiers An empty array that will be filled by modifier classes that corresponds to modifier names
	 */
	parseHelpers: function(modifierParams, modifiers)
	{
		var modifierParam, modifierArgs;

		for(var j = 0, l = modifierParams.length; j < l; j++)
		{
			modifierParam = modifierParams[j];

			if(j + 1 < l && modifierParams[j + 1].indexOf('{') === 0)
			{
				modifierArgs = modifierParams[j + 1].match(/([^,{}]+)/g);
				j++;
			}
			else
			{
				modifierArgs = [];
			}
			if(this.scope[modifierParam]) modifiers.push({ fn: this.scope[modifierParam], args: modifierArgs });
			else if(kff.View.helpers[modifierParam]) modifiers.push({ fn: kff.View.helpers[modifierParam], args: modifierArgs });
		}
	},

	/**
	 * Parses modifier that accepts one or more parameters
	 * @param  {Array} modifierParams Array of modifier params
	 * @param  {Array} modifiers      Array of modifiers
	 */
	parseGetters: function(modifierParams, modifiers)
	{
		var modifierParam, modifierArgs;

		for(var j = 0, l = modifierParams.length; j < l; j++)
		{
			modifierParam = modifierParams[j];

			if(j + 1 < l && modifierParams[j + 1].indexOf('{') === 0)
			{
				modifierArgs = modifierParams[j + 1].match(/([^,{}]+)/g);
				j++;
			}
			else
			{
				modifierArgs = [];
			}
			for(var i = 0, n = modifierArgs.length; i < n; i++)
			{
				modifierArgs[i] = modifierArgs[i].replace(/^\s+|\s+$/g, '').replace(/^\./, '*.');
			}
			modifiers.push({ fn: modifierParam, args: modifierArgs });
		}
	},

	/**
	 * Parses modifier parameters of binding. Used to create parsers and formatters.
 	 *
	 * @param {Array} modifierParams An arrray with modifier names
	 * @param {Array} modifiers An empty array that will be filled by modifier classes that corresponds to modifier names
	 */
	parseSetters: function(modifierParams, modifiers)
	{
		for(var j = 0; j < modifierParams.length; j++)
		{
			modifiers.push(modifierParams[j]);
		}
	},

	/**
	 * Destroys all bindings
	 */
	destroyBinding: function()
	{
		if(this.modelBindersMap)
		{
			this.modelBindersMap.destroyBinders();
			this.modelBindersMap = null;
		}
	},

	/**
	 * Rebinds cursors of all binders that belong to this view
	 *
	 * @private
	 */
	rebindCursors: function()
	{
		if(this.modelBindersMap) this.modelBindersMap.rebindCursors();
	},

	/**
	 * Refreshes own data-binders
	 *
	 * @private
	 */
	refreshOwnBinders: function(force)
	{
		if(this.modelBindersMap) this.modelBindersMap.refreshBinders(force);
	}

});
})()

kff.BindingView = kff.View;


kff.PageView = kff.createClass(
{
	extend: kff.View,
	statics:
	{
		precedingView: null,
		args: [{
			viewFactory: '@kff.ViewFactory'
		}]
	}
},
/** @lends kff.PageView.prototype */
{
	/**
	 * Class for the full page view. PageViews behave as normal views but can be used by FrontController as
	 * targets for routing.
	 *
	 * @constructs
	 * @augments kff.View
	 * @param {Object} options Options object (see kff.View for details)
	 */
	constructor: function(options)
	{
		options = options || {};
		this.$docElement = options.element ? $(options.element) : $(options.env.document);
		options.element = options.element || options.env.document.body;

		kff.View.call(this, options);
	},

	/**
	 * @see kff.View#delegateEvents
	 */
	delegateEvents: function(events, $element)
	{
		if(!$element) $element = this.$docElement;
		kff.PageView._super.delegateEvents.call(this, events, $element);
	},

	/**
	 * @see kff.View#undelegateEvents
	 */
	undelegateEvents: function(events, $element)
	{
		if(!$element) $element = this.$docElement;
		kff.PageView._super.undelegateEvents.call(this, events, $element);
	}

});


kff.BinderMap = kff.createClass(
/** @lends kff.BinderMap.prototype */
{
	/**
	 * Class for keeping multiple view binders together
	 *
	 * @constructs
	 */
	constructor: function()
	{
		this.binders = [];
	},

	/**
	 * Adds binder
	 * @param {kff.Binder} binder Binder to add
	 */
	add: function(binder)
	{
		this.binders.push(binder);
	},

	/**
	 * Clones binder map
	 *
	 * @return {kff.BinderMap}  Cloned binder map
	 */
	clone: function()
	{
		var clonedBinderMap = new kff.BinderMap(),
			clonedBinders = clonedBinderMap.binders,
			l = this.binders.length;

		while(l--)
		{
			clonedBinders[l] = this.binders[l].clone();
		}
		return clonedBinderMap;
	},

	/**
	 * Sets an owner view to the binder map
	 *
	 * @param {kff.BindingView} view Owner view
	 */
	setView: function(view)
	{
		var i, l, b;
		for(i = 0, l = this.binders.length; i < l; i++)
		{
			b = this.binders[i];
			b.view = view;
			b.$element = view.$element;
			b.model = null;
			b.value = null;
		}
	},

	/**
	 * Inits all binders
	 */
	initBinders: function()
	{
		for(var i = 0, l = this.binders.length; i < l; i++) this.binders[i].init();
	},

	/**
	 * Destroys all binders
	 */
	destroyBinders: function()
	{
		for(var i = 0, l = this.binders.length; i < l; i++) this.binders[i].destroy();
	},

	/**
	 * Refreshes all binders
	 *
	 * @param  {boolean} force Force rebinding models and refreshing DOM
	 */
	refreshBinders: function(force)
	{
		for(var i = 0, l = this.binders.length; i < l; i++) this.binders[i].modelChange(null, force);
	},

	/**
	 * Rebinds models of all binders
	 */
	rebindCursors: function()
	{
		for(var i = 0, l = this.binders.length; i < l; i++) this.binders[i].rebindCursor();
	},

	/**
	 * Refreshes only binders that depend on their binding index
	 */
	refreshIndexedBinders: function()
	{
		for(var i = 0, l = this.binders.length; i < l; i++)
		{
			if(this.binders[i].isIndexed())
			{
				this.binders[i].modelChange(null, true);
			}
		}
	}

});


(function(){
	var index = function(v, modelName)
	{
		var bindingIndex = this.getBindingIndex(modelName);
		if(bindingIndex !== null) return bindingIndex;
		return v;
	};
	index.indexed = true;
	kff.BindingView.registerHelper('index', index);

	var indexFromOne = function(v, modelName)
	{
		var bindingIndex = this.getBindingIndex(modelName);
		if(bindingIndex !== null) return bindingIndex + 1;
		return v;
	};
	indexFromOne.indexed = true;
	kff.BindingView.registerHelper('indexFromOne', indexFromOne);

})();


kff.BindingView.registerHelper('boolean', function(v)
{
	var parsed = parseInt(v, 10);
	if(!isNaN(parsed)) return !!parsed;
	return v === 'true';
});

kff.BindingView.registerHelper('not', function(v)
{
	return !v;
});

kff.BindingView.registerHelper('null', function(v)
{
	return v === null || v === 'null' ? null : v;
});

kff.BindingView.registerHelper('int', function(v)
{
	v = parseInt(v, 10);
	if(isNaN(v)) v = 0;
	return v;
});

kff.BindingView.registerHelper('float', function(v)
{
	v = parseFloat(v);
	if(isNaN(v)) v = 0;
	return v;
});

kff.BindingView.registerHelper('string', function(v)
{
	return v.toString();
});


kff.Binder = kff.createClass(
/** @lends kff.Binder.prototype */
{
	/**
	 * @constructs
	 */
	constructor: function(options)
	{
		this.options = options;
		this.options.events = options.events || null;

		this.view = options.view;
		this.$element = options.$element;
		this.cursor = null;
		this.keyPath = options.keyPath;
		this.dispatch = options.dispatch;
		this.currentValue = null;
		this.value = null;
	},

	/**
	 * Initializes the binder, binds DOM or model events if needed and optionally fetches data from DOM
	 */
	init: function()
	{
		if(!this.options.nobind)
		{
			if(this.$element && this.options.events !== null) this.delegateEvents(this.options.events);
		}
		this.rebindCursor();
		if(this.options.fill) this.fill();
	},

	/**
	 * Destroys the binder, unbinds any events or model watchers
	 */
	destroy: function()
	{
		if(this.$element && this.options.events !== null) this.undelegateEvents(this.options.events);
		this.currentValue = null;
		this.value = null;
	},

	/**
	 * Delegates events. Using the method from kff.View
	 */
	delegateEvents: kff.View.prototype.delegateEvents,

	/**
	 * Undelegates events. Using the method from kff.View
	 */
	undelegateEvents: kff.View.prototype.undelegateEvents,

	/**
	 * Refreshes the binder whenever the model changes.
	 * @param  {Object} event  Event from the model change
	 * @param  {boolean} force If true, force refreshing even if value does not change
	 */
	modelChange: function(event, force)
	{
		var modelValue, formattedValue;

		modelValue = this.cursor.get();

		if(typeof modelValue === 'function')
		{
			modelValue = this.callModelAsFunction(modelValue, this.options.modelArgs);
		}

		if(modelValue !== 'undefined')
		{
			formattedValue = this.format(modelValue);
			if(force || !this.compareValues(formattedValue, this.value))
			{
				this.value = formattedValue;
				this.currentValue = modelValue;
				this.refresh();
			}
		}
	},

	/**
	 * Simple compare two values using strict equal operator.
	 *
	 * @param  {mixed} value1 Value 1
	 * @param  {mixed} value2 Value 2
	 * @return {boolean}      Result of comparsion
	 */
	compareValues: function(value1, value2)
	{
		return value1 === value2;
	},

	/**
	 * Returns current formatted value of the model prepared to insertion to the DOM
	 *
	 * @return {mixed} Formatted value
	 */
	getFormattedValue: function()
	{
		return this.value;
	},

	/**
	 * Updates model with the value changed by some DOM event
	 *
	 * @param  {mixed} value    Raw unparsed value from the DOM
	 * @param  {DOMEvent} event Original DOM event
	 */
	updateModel: function(value, event)
	{
		var i, l;
		this.value = value;
		if(value instanceof Array)
		{
			for(i = 0, l = value.length; i < l; i++) value[i] = this.parse(value[i]);
		}
		else
		{
			value = this.parse(value);
		}
		if(this.compareValues(value, this.currentValue)) return;

		this.currentValue = value;

		var action = 'set';
		var params = [];
		if(this.dispatch && this.dispatch.length > 0)
		{
			action = this.dispatch[0];
			for(i = 1, l = this.dispatch.length; i < l; i++)
			{
				if(this.dispatch[i].charAt(0) === '@') params.push(this.view.getCursor(this.dispatch[i].slice(1)));
				else
				{
					if(this.options.parsers.length === 0) params.push(this.convertValueType(this.dispatch[i]));
					else params.push(this.parse(this.dispatch[i]));
				}
			}
		}

		this.view.dispatchEvent({
			type: action,
			cursor: this.cursor,
			value: value,
			domEvent: event,
			params: params
		});
	},

	/**
	 * Process a value from model through formatting pipeline
	 *
	 * @param  {mixed} value The original value from model
	 * @return {mixed}       Formatted value
	 */
	format: function(value)
	{
		var i, l, j, k, value2;
		for(i = 0, l = this.options.formatters.length; i < l; i++)
		{
			if(value instanceof Array)
			{
				value2 = [];
				for(j = 0, k = value.length; j < k; j++) value2[j] = this.options.formatters[i].fn.apply(this, kff.arrayConcat([value[j]], this.options.formatters[i].args));
				value = value2;
			}
			else value = this.options.formatters[i].fn.apply(this, kff.arrayConcat([value], this.options.formatters[i].args));
		}
		return value;
	},

	/**
	 * Process a value from DOM through parsing pipeline
	 *
	 * @param  {mixed} value The original value from DOM
	 * @return {mixed}       Parsed value
	 */
	parse: function(value)
	{
		var i, l, j, k, value2;
		for(i = 0, l = this.options.parsers.length; i < l; i++)
		{
			if(value instanceof Array)
			{
				value2 = [];
				for(j = 0, k = value.length; j < k; j++) value2[j] = this.options.parsers[i].fn.apply(this, kff.arrayConcat([value[j]], this.options.parsers[i].args));
				value = value2;
			}
			else value = this.options.parsers[i].fn.apply(this, kff.arrayConcat([value], this.options.parsers[i].args));
		}
		return value;
	},

	/**
	 * Returns binding index of the view in a colelction binding
	 * @param  {string} modelName Model keypath
	 * @return {number}           BInding index
	 */
	getBindingIndex: function(modelName)
	{
		modelName = modelName || this.options.modelName;
		return this.view.getBindingIndex(modelName);
	},

	/**
	 * Create a clone of this object
	 * @return {mixed} Clone of type kff.Binding
	 */
	clone: function()
	{
		return new this.constructor(this.options);
	},

	/**
	 * Refreshes DOM projection of the binding
	 */
	refresh: kff.noop,

	/**
	 * In case of two-way binding, fetches the current binding state/value from the DOM and passes it to
	 * the corresponding model. Most useful for fetching form data into the model.
	 */
	fill: kff.noop,

	/**
	 * Rebinds model event listeners for the actual model retrieved by model keypath.
	 *
	 * @private
	 */
	rebindCursor: function()
	{
		this.cursor = this.view.getCursor(this.keyPath);
	},

	/**
	 * Returns true if any of formatters uses binding index property.
	 * Used by the binding view to decide which binders need to be refreshed when their binding index changes
	 *
	 * @private
	 * @return {Boolean} True if rendering of the value depends on the binding index
	 */
	isIndexed: function()
	{
		return this.options.indexed;
	},

	/**
	 * Creates a new function that works as event pipeline when event filter is used
	 *
	 * @private
	 * @param  {DOMEvent} originalTriggerEvent Original event
	 * @param  {function} eventFilter          Filter function
	 * @return {function}                      Composed function
	 */
	createFilterTriggerEvent: function(originalTriggerEvent, eventFilter)
	{
		return function(event)
		{
			return eventFilter.fn.apply(this, [originalTriggerEvent, event].concat(eventFilter.args));
		}
	},

	/**
	 * Converts string from binder atribute to primitive type using some basic implicit rules.
	 * 'null' => null
	 * 'true' => true
	 * 'false' => false
	 * numeric values => number
	 * otherwise => keep original string
	 *
	 * @private
	 * @param  {string} value Original value
	 * @return {mixed}        Converted value
	 */
	convertValueType: function(value)
	{
		if(value === 'null') return null;
		if(value === 'true') return true;
		if(value === 'false') return false;
		var n = value - 0;
		if(n == value) return n;
		return value;
	},

	callModelAsFunction: function(model, modelArgs)
	{
		var args = [];
		if(modelArgs instanceof Array)
		{
			for(i = 0, l = modelArgs.length; i < l; i++)
			{
				if(modelArgs[i] instanceof Array) args[i] = this.view.getCursor(modelArgs[i]);
				else args[i] = kff.Binder.prototype.convertValueType(modelArgs[i]);
			}
		}
		return model.apply(null, args);
	}
});


kff.CollectionBinder = kff.createClass(
/** @lends kff.Binder.prototype */
{
	/**
	 * @constructs
	 */
	constructor: function(options)
	{
		this.collection = null;
		this.keyPath = options.keyPath;
		this.collectionArgs = options.collectionArgs;
		this.view = options.view;
		this.$elementTemplate = null;
		this.boundViews = null;
		this.anchor = null;
		this.viewTemplate = null;
		this.filter = options.filter;
		this.sort = options.sort;
	},

	/**
	 * Renders "bound" views.
	 * This method generates DOM elements corresponding to each item in the bound collection and
	 * creates the bindingView for each element. If the collection changes, it reflects those changes
	 * automatically in real time.
	 *
	 * @private
	 */
	renderBoundViews: function()
	{
		this.anchor = this.view.env.document.createTextNode('');
		var el = this.view.$element[0];

		if(el.parentNode)
		{
			el.parentNode.insertBefore(this.anchor, el.nextSibling);
			el.parentNode.removeChild(el);
		}

		this.boundViews = [];

		// Boundview options:
		this.boundViewName = this.view.$element[0].getAttribute(kff.DATA_VIEW_ATTR);
		var opt = this.view.$element[0].getAttribute(kff.DATA_OPTIONS_ATTR);

		this.initCollectionFilter();
		this.initCollectionSorter();
		// this.initCollectionCounter();

		this.boundViewOptions = opt ? JSON.parse(opt) : {};
		this.boundViewOptions.parentView = this.view;
		this.boundViewOptions.viewFactory = this.view.viewFactory;
		this.boundViewOptions.env = this.view.env;
		this.boundViewOptions.isBoundView = true;

		this.refreshBoundViews();
	},

	/**
	 * Destroys previously bound views.
	 *
	 * @private
	 */
	destroyBoundViews: function()
	{
		var boundView, i, l;

		// Destroy boundviews
		if(this.boundViews !== null)
		{
			for(i = 0, l = this.boundViews.length; i < l; i++)
			{
				boundView = this.boundViews[i];
				boundView.destroyAll();
				boundView.$element.remove();
			}
			this.boundViews = null;
		}

		if(this.anchor)
		{
			if(this.anchor.parentNode)
			{
				this.anchor.parentNode.insertBefore(this.view.$element[0], this.anchor.nextSibling);
				this.anchor.parentNode.removeChild(this.anchor);
			}
			this.anchor = null;
		}
		if(this.$elementTemplate)
		{
			this.$elementTemplate.remove();
			this.$elementTemplate = null;
		}
		this.viewTemplate = null;
		if(this.filteredCollection) this.filteredCollection = null;
	},

	refreshAll: function()
	{
		if(this.boundViews !== null)
		{
			for(var i = 0, l = this.boundViews.length; i < l; i++) this.boundViews[i].refreshAll();
		}
	},

	/**
	 * Updates bound views when collection changes.
	 *
	 * @private
	 * @param {Object} event An event triggered by collection change
	 */
	refreshBoundViews: function(event)
	{
		this.refreshBoundViewsAll();
	},

	rebindCollection: function()
	{
		this.cursor = this.view.getCursor(this.keyPath);
		this.collection = this.cursor.get();

		if(typeof this.collection === 'function')
		{
			this.collection = kff.Binder.prototype.callModelAsFunction.call(this, this.collection, this.collectionArgs);
		}
		if(!(this.collection instanceof Array)) this.collection = [];
	},

	/**
	 * Updates bound views when collection changes on other events.
	 *
	 * @private
	 */
	refreshBoundViewsAll: function()
	{
		var collectionFilter, filterModel, filterFnName, boundView, i, l, newIndex, el, a;
		var docFragment = null;
		var lastView, lastChild, parentNode, item;

		this.rebindCollection();

		if(this.boundViews === null) this.boundViews = [];

		if(this.collectionFilter || this.collectionSorter)
		{
			if(this.collectionFilter)
			{
				this.filteredCollection = [];
				collectionFilter = this.collectionFilter;

				a = this.collection;
				for(i = 0, l = a.length; i < l; i++)
				{
					item = a[i];
					var render = !!collectionFilter(item);

					if(render) this.filteredCollection.push(item);
				}
			}
			else
			{
				this.filteredCollection = this.collection.slice();
			}

			if(this.collectionSorter)
			{
				this.filteredCollection.sort(this.collectionSorter);
			}
		}
		else
		{
			this.filteredCollection = this.collection;
		}

		if(this.boundViews.length === 0)
		{
			// Fast initial rendering:
			l = this.filteredCollection.length;
			if(l > 0)
			{
				a = this.filteredCollection;
				lastChild = this.anchor;
				if(this.anchor.parentNode)
				{
					parentNode = this.anchor.parentNode;
				}
				for(i = 0; i < l; i++)
				{
					boundView = this.createBoundView(a[i]);
					el = boundView.$element[0];
					parentNode.insertBefore(el, lastChild.nextSibling);
					boundView.setBindingIndex(i);
					lastChild = el;
				}

				for(i = 0; i < l; i++)
				{
					this.boundViews[i].runAll();
				}
			}
		}
		else
		{
			// Diff based rendering:
			var positions = new Array(this.filteredCollection.length);
			var toRemoveViews = [];
			var pos;
			var lastViewIndex = null;
			for(i = 0, l = this.boundViews.length; i < l; i++)
			{
				boundView = this.boundViews[i];
				item = boundView.scope['*'].get();
				if(typeof(item) !== 'object') newIndex = -1;
				else newIndex = kff.arrayIndexOf(this.filteredCollection, item);
				pos = boundView;
				if(newIndex !== -1)
				{
					positions[newIndex] = pos;
					lastView = boundView;
					lastViewIndex = i;
				}
				else {
					toRemoveViews.push(pos);
				}
			}

			for(i = 0, l = positions.length; i < l; i++)
			{
				item = this.filteredCollection[i];
				if(!positions[i])
				{
					pos = toRemoveViews.shift();
					if(pos)
					{
						boundView = pos;
						if(this.filteredCollection === this.collection)
						{
							boundView.scope['*'] = this.cursor.refine([i]);
						}
						else
						{
							boundView.scope['*'] = this.cursor.refine([this.collection.indexOf(item)]);
						}
						if(this.view.itemAlias) boundView.scope[this.view.itemAlias] = item;
						boundView.setBindingIndex(i);
						boundView.refreshAll();
						if(i >= lastViewIndex) lastView = boundView;
					}
					else
					{
						boundView = this.createBoundView(item);
						boundView.setBindingIndex(i);
						boundView.runAll();
					}
					positions[i] = boundView;
				}
			}

			// Remove old views:
			for(i = 0, l = toRemoveViews.length; i < l; i++)
			{
				toRemoveViews[i].destroyAll();
				toRemoveViews[i].$element.remove();
			}

			var newBoundViews = new Array(positions.length);

			if(lastView)
			{
				// Reordering elements from the last one:
				lastChild = lastView.$element[0];
				i = positions.length - 1;

				el = positions[i].$element[0];
				if(el !== lastChild && lastChild.parentNode && lastChild.parentNode.nodeType === 1)
				{
					lastChild.parentNode.insertBefore(el, lastChild.nextSibling);
					lastChild = el;
				}

				for(; i >= 0; i--)
				{
					el = positions[i].$element[0];

					if(el !== lastChild && el.nextSibling !== lastChild && lastChild.parentNode && lastChild.parentNode.nodeType === 1)
					{
						lastChild.parentNode.insertBefore(el, lastChild);
					}

					lastChild = el;
					newBoundViews[i] = positions[i];
					newBoundViews[i].setBindingIndex(i);
					newBoundViews[i].refreshIndexedBinders(true);
				}
			}
			else
			{
				lastChild = this.anchor;
				if(this.anchor.parentNode)
				{
					parentNode = this.anchor.parentNode;
				}
				for(i = 0, l = positions.length; i < l; i++)
				{
					el = positions[i].$element[0];

					if(el !== lastChild.nextSibling)
					{
						parentNode.insertBefore(el, lastChild.nextSibling);
					}
					newBoundViews[i] = positions[i];
					newBoundViews[i].setBindingIndex(i);
					newBoundViews[i].refreshIndexedBinders(true);
					lastChild = el;
				}
			}
			this.boundViews = newBoundViews;
		}
	},

	/**
	 * Inits filtering of collection items
	 *
	 * @private
	 */
	initCollectionFilter: function()
	{
		if(this.filter)
		{
			this.collectionFilter = this.view.getCursor(this.filter).get();
			if(typeof this.collectionFilter !== 'function') this.collectionFilter = null;
		}
	},

	/**
	 * Inits sorting of collection
	 *
	 * @private
	 */
	initCollectionSorter: function()
	{
		if(this.sort)
		{
			this.collectionSorter = this.view.getCursor(this.sort).get();
			if(typeof this.collectionSorter !== 'function') this.collectionSorter = null;
		}
	},

	/**
	 * Removes a view at given index (rendered index)
	 *
	 * @private
	 * @param  {number} renderIndex Rendered index of item
	 */
	removeBoundViewAt: function(renderIndex)
	{
		var boundView = this.boundViews[renderIndex];
		if(boundView)
		{
			this.boundViews.splice(renderIndex, 1);

			boundView.$element[0].parentNode.removeChild(boundView.$element[0]);
			boundView.destroyAll();

			this.reindexBoundviews(renderIndex);
		}
	},

	/**
	 * Refreshes view indices when the collection changes
	 *
	 * @private
	 * @param  {nubmer} from Render index at which reindexing starts
	 * @param  {number} to   Render index at which reindexing ends
	 */
	reindexBoundviews: function(from, to)
	{
		if(!from) from = 0;
		if(!to || to > this.boundViews.length) to = this.boundViews.length;

		// Reindex subsequent boundviews:
		for(var i = from; i < to; i++)
		{
			this.boundViews[i].setBindingIndex(i);
			this.boundViews[i].refreshBinders(true);
		}
	},

	/**
	 * Creates a new bound view for item in collection
	 *
	 * @private
	 * @param  {Object} item Item for data-binding
	 * @param  {number} i 		Binding index
	 * @return {kff.View} 		created view
	 */
	createBoundView: function(item)
	{
		var boundView, $element, i;

		if(!this.viewTemplate)
		{
			$element = $(this.view.$element[0].cloneNode(true));

			this.boundViewOptions.element = $element[0];

			boundView = new this.view.constructor(this.boundViewOptions);

			boundView.collectionBinder = null;
			boundView.modelBindersMap = this.view.modelBindersMap.clone();

			this.boundViews.push(boundView);
			i = this.boundViews.length - 1;


			if(this.filteredCollection === this.collection)
			{
				boundView.scope['*'] = this.cursor.refine([i]);
			}
			else
			{
				boundView.scope['*'] = this.cursor.refine([this.collection.indexOf(item)]);
			}


			if(this.view.itemAlias) boundView.scope[this.view.itemAlias] = item;

			boundView.setBindingIndex(i);

			boundView.renderAll();

			this.viewTemplate = boundView.clone();
			this.$elementTemplate = $($element[0].cloneNode(true));
		}
		else
		{
			$element = $(this.$elementTemplate[0].cloneNode(true));
			boundView = this.viewTemplate.clone();
			boundView.setParentView(this.view);

			this.boundViews.push(boundView);
			i = this.boundViews.length - 1;

			if(this.filteredCollection === this.collection)
			{
				boundView.scope['*'] = this.cursor.refine([i]);
			}
			else
			{
				boundView.scope['*'] = this.cursor.refine([this.collection.indexOf(item)]);
			}

			if(this.view.itemAlias) boundView.scope[this.view.itemAlias] = item;

			boundView.setBindingIndex(i);
			boundView.rebindElement($element[0]);
		}

		$element[0].setAttribute(kff.DATA_RENDERED_ATTR, true);

		boundView.itemAlias = this.view.itemAlias;
		boundView.modelBindersMap.setView(boundView);

		return boundView;
	},

	refreshBinders: function(force)
	{
		this.refreshBoundViews();
		if(this.boundViews !== null)
		{
			for(var i = 0, l = this.boundViews.length; i < l; i++) this.boundViews[i].refreshBinders(force);
		}
	},

	refreshIndexedBinders: function()
	{
		if(this.boundViews !== null)
		{
			for(var i = 0, l = this.boundViews.length; i < l; i++) this.boundViews[i].refreshIndexedBinders();
		}
	},

	getCollectionIndex: function(item)
	{
		if(this.collection instanceof Array)
		{
			return kff.arrayIndexOf(this.collection, item);
		}
		else return -1;
	}
});


kff.ModelView = kff.createClass({
	extend: kff.View
},
{
	constructor: function(options)
	{
		kff.View.call(this, options);
		this.scope['*'] = new kff.Cursor({});
	}
});


kff.EventBinder = kff.createClass(
{
	extend: kff.Binder
},
/** @lends kff.EventBinder.prototype */
{
	/**
	 * One-way data binder (DOM to model) for generic DOM event.
	 * Sets model atrribute to defined value when event occurs.
	 * Event defaults to click.
	 *
	 * @constructs
	 * @augments kff.Binder
	 * @param {Object} options Options object
	 */
	constructor: function(options)
	{
		var eventNames = options.eventNames.length > 0 ? options.eventNames.join(' ') : 'click';
		options.events = [
			[eventNames, 'triggerEvent']
		];

		kff.Binder.call(this, options);
	},

	init: function()
	{
		this.userValue = null;

		if(this.options.params[0])
		{
			if(this.options.parsers.length === 0) this.userValue = this.convertValueType(this.options.params[0]);
			else this.userValue = this.parse(this.options.params[0]);
		}

		if(this.options.eventFilters && this.options.eventFilters[0])
		{
			this.triggerEvent = this.createFilterTriggerEvent(this.triggerEvent, this.options.eventFilters[0]);
		}
		kff.EventBinder._super.init.call(this);
	},

	triggerEvent: function(event)
	{
		if(!this.options.nopreventdef) event.preventDefault();
		this.updateModel(this.userValue, event);
	},

	compareValues: function(value1, value2)
	{
		return false;
	}

});

kff.BindingView.registerBinder('event', kff.EventBinder);



kff.AttrBinder = kff.createClass(
{
	extend: kff.Binder
},
/** @lends kff.AttrBinder.prototype */
{
	/**
	 * One-way data binder (model to DOM) for an element attribute.
	 * Sets the attribute of the element to defined value when model atrribute changes.
	 *
	 * @constructs
	 * @augments kff.Binder
	 * @param {Object} options Options objectt
	 */
	constructor: function(options)
	{
		kff.Binder.call(this, options);
	},

	init: function()
	{
		this.attribute = this.options.params[0] || null;
		this.prefix = this.options.params[1] || '';
		this.suffix = this.options.params[2] || '';
		kff.AttrBinder._super.init.call(this);
	},

	refresh: function()
	{
		var val = this.value;
		if(val === null || val === undefined) val = '';
		if(this.attribute)
		{
			this.$element[0].setAttribute(this.attribute, this.prefix + val + this.suffix);
		}
	}
});

kff.BindingView.registerBinder('attr', kff.AttrBinder);


kff.CheckBinder = kff.createClass(
{
	extend: kff.Binder
},
/** @lends kff.CheckBinder.prototype */
{
	/**
	 * Two-way data binder for checkbox.
	 * Checks input when model atrribute evaluates to true, unchecks otherwise.
	 *
	 * @constructs
	 * @augments kff.Binder
	 * @param {Object} options Options object
	 */
	constructor: function(options)
	{
		var eventNames = options.eventNames.length > 0 ? options.eventNames.join(' ') : 'click';
		options = options || {};
		options.events = [
			[eventNames, 'inputChange']
		];
		kff.Binder.call(this, options);
		if(this.options.fill) this.fillVal = this.$element[0].checked;
	},

	inputChange: function(event)
	{
		this.updateModel(this.$element[0].checked, event);
	},

	refresh: function()
	{
		this.$element[0].checked = !!this.value;
	},

	fill: function()
	{
		if(!this.fillVal) this.fillVal = this.$element[0].checked;
		this.updateModel(this.fillVal);
	}
});

kff.BindingView.registerBinder('check', kff.CheckBinder);


kff.DisabledBinder = kff.createClass(
{
	extend: kff.Binder
},
/** @lends kff.DisabledBinder.prototype */
{
	/**
	 * Two-way data binder for checkbox.
	 * Checks input when model atrribute evaluates to true, unchecks otherwise.
	 *
	 * @constructs
	 * @augments kff.Binder
	 * @param {Object} options Options object
	 */
	constructor: function(options)
	{
		kff.Binder.call(this, options);
	},

	refresh: function()
	{
		this.$element[0].disabled = !!this.value;
	},

	fill: function()
	{
		if(!this.fillVal) this.fillVal = !!this.$element[0].disabled;
		this.updateModel(this.fillVal);
	}
});

kff.BindingView.registerBinder('disabled', kff.DisabledBinder);

var createClassBinder = function(negate)
{
	var ClassBinder = kff.createClass(
	{
		extend: kff.Binder
	},
	/** @lends kff.ClassBinder.prototype */
	{
		/**
		 * One-way data binder (model to DOM) for CSS class.
		 * Sets/Unsets the class of the element to some predefined value when model atrribute changes.
		 *
		 * @constructs
		 * @augments kff.Binder
		 * @param {Object} options Options objectt
		 */
		constructor: function(options)
		{
			kff.Binder.call(this, options);
		},

		init: function()
		{
			this.className = this.options.params[0] || null;
			this.equalsTo = true;

			if(this.options.params[1])
			{
				if(this.options.parsers.length === 0) this.equalsTo = this.convertValueType(this.options.params[1]);
				else this.equalsTo = this.parse(this.options.params[1]);
				if(this.equalsTo == null) this.equalsTo = null;
			}

			this.negate = this.options.params[2] === 'ne' || negate;

			kff.ClassBinder._super.init.call(this);
		},

		refresh: function()
		{
			if(this.className)
			{
				if(this.matchValue())
				{
					this.$element[0].classList.add(this.className);
				}
				else
				{
					this.$element[0].classList.remove(this.className);
				}
			}
		},

		matchValue: function()
		{
			if(this.options.params.length > 1)
			{
				var value = this.value;
				if(value == null) value = null;
				if(this.negate) return value !== this.equalsTo;
				else return value === this.equalsTo;
			}
			else return this.value;
		}
	});

	if(typeof document === 'object' && document !== null)
	{
		if(!('classList' in document.documentElement))
		{
			ClassBinder.prototype.refresh = function(value)
			{
				if(this.className)
				{
					this.$element[this.matchValue() ? 'addClass' : 'removeClass'](this.className);
				}
			};
		}
	}

	return ClassBinder;

};

kff.ClassBinder = createClassBinder(false);
kff.ClassNotBinder = createClassBinder(true);

kff.BindingView.registerBinder('class', kff.ClassBinder);
kff.BindingView.registerBinder('classnot', kff.ClassNotBinder);


kff.StyleBinder = kff.createClass(
{
	extend: kff.Binder
},
/** @lends kff.StyleBinder.prototype */
{
	/**
	 * One-way data binder (model to DOM) for any CSS style property.
	 * Sets the CSS property of the element to defined value when model atrribute changes.
	 *
	 * @constructs
	 * @augments kff.Binder
	 * @param {Object} options Options objectt
	 */
	constructor: function(options)
	{
		kff.Binder.call(this, options);
	},

	init: function()
	{
		this.styleProperty = this.options.params[0] || null;
		this.styleUnit = this.options.params[1] || '';
		kff.StyleBinder._super.init.call(this);
	},

	refresh: function()
	{
		var value = this.value;

		if(this.styleProperty)
		{
			if(value === undefined) delete this.$element[0].style[this.styleProperty];
			else
			{
				if(this.styleUnit) value += this.styleUnit;
				try {
					this.$element[0].style[this.styleProperty] = value;
				}
				catch(e) {}
			}
		}
	}
});

kff.BindingView.registerBinder('style', kff.StyleBinder);


kff.ClickBinder = kff.createClass(
{
	extend: kff.EventBinder
},
/** @lends kff.ClickBinder.prototype */
{
	/**
	 * One-way data binder (DOM to model) for click event.
	 * Sets model atrribute to defined value when click event occurs.
	 *
	 * @constructs
	 * @augments kff.Binder
	 * @param {Object} options Options object
	 */
	constructor: function(options)
	{
		if(options.eventNames.length === 0)	options.eventNames = ['click'];
		kff.EventBinder.call(this, options);
	}

});

kff.BindingView.registerBinder('click', kff.ClickBinder);



kff.CallBinder = kff.createClass(
{
	extend: kff.EventBinder
},
/** @lends kff.EventBinder.prototype */
{
	/**
	 * One-way data binder (DOM to model) for generic DOM event.
	 * Calls a model method with optional parameters.
	 * Event defaults to click.
	 *
	 * @constructs
	 * @augments kff.Binder
	 * @param {Object} options Options object
	 */

	updateModel: function(value)
	{
		var i, l, args, fn;
		var callParams = this.options.params;

		if(this.model && this.options.attr) fn = this.model[this.options.attr];
		if(typeof fn !== 'function') return;

		args = [];
		for(i = 0, l = callParams.length; i < l; i++)
		{
			if(callParams[i].charAt(0) === '@') args[i] = this.view.getModel(callParams[i].slice(1));
			else
			{
				if(this.options.parsers.length === 0) args[i] = this.convertValueType(callParams[i]);
				else args[i] = this.parse(callParams[i]);
			}
		}
		fn.apply(this.model, args);
	}
});

kff.BindingView.registerBinder('call', kff.CallBinder);


kff.DoubleClickBinder = kff.createClass(
{
	extend: kff.EventBinder
},
/** @lends kff.DoubleClickBinder.prototype */
{
	/**
	 * One-way data binder (DOM to model) for double click event.
	 * Sets model atrribute to defined value when dblclick event occurs.
	 *
	 * @constructs
	 * @augments kff.Binder
	 * @param {Object} options Options object
	 */
	constructor: function(options)
	{
		if(options.eventNames.length === 0)	options.eventNames = ['dblclick'];
		kff.EventBinder.call(this, options);
	}

});

kff.BindingView.registerBinder('dblclick', kff.DoubleClickBinder);

kff.FocusBinder = kff.createClass(
{
	extend: kff.EventBinder
},
/** @lends kff.FocusBinder.prototype */
{
	/**
	 * One-way data binder (DOM to model) for focus event.
	 * Sets model atrribute to defined value when element gets focus.
	 *
	 * @constructs
	 * @augments kff.EventBinder
	 * @param {Object} options Options object
	 */
	constructor: function(options)
	{
		if(options.eventNames.length === 0)	options.eventNames = ['focus'];
		kff.EventBinder.call(this, options);
	}

});

kff.BindingView.registerBinder('focus', kff.FocusBinder);

kff.BlurBinder = kff.createClass(
{
	extend: kff.EventBinder
},
/** @lends kff.BlurBinder.prototype */
{
	/**
	 * One-way data binder (DOM to model) for blur event.
	 * Sets model atrribute to defined value when element looses focus.
	 *
	 * @constructs
	 * @augments kff.EventBinder
	 * @param {Object} options Options object
	 */
	constructor: function(options)
	{
		if(options.eventNames.length === 0)	options.eventNames = ['blur'];
		kff.EventBinder.call(this, options);
	}

});

kff.BindingView.registerBinder('blur', kff.BlurBinder);

kff.FocusBlurBinder = kff.createClass(
{
	extend: kff.EventBinder
},
/** @lends kff.FocusBlurBinder.prototype */
{
	/**
	 * Two-way data binder for focus/blur event.
	 * Sets model atrribute to true when element gets focus or to false when it looses focus.
	 * Also triggers focus/blur event on attribute change.
	 * Values are passed throught eventual parsers/formatters of course.
	 *
	 * @constructs
	 * @augments kff.EventBinder
	 * @param {Object} options Options object
	 */
	constructor: function(options)
	{
		if(options.eventNames.length === 0)	options.eventNames = ['focus blur'];
		kff.EventBinder.call(this, options);
	},

	triggerEvent: function(event)
	{
		this.updateModel(this.view.env.document.activeElement === this.$element[0], event);
	},

	refresh: function()
	{
		if(this.value)
		{
			if(this.view.env.document.activeElement !== this.$element[0]) this.$element[0].focus();
		}
		else
		{
			if(this.view.env.document.activeElement === this.$element[0]) this.$element[0].blur();
		}
	}
});

kff.BindingView.registerBinder('focusblur', kff.FocusBlurBinder);

kff.HtmlBinder = kff.createClass(
{
	extend: kff.Binder
},
/** @lends kff.HtmlBinder.prototype */
{
	/**
	 * One-way data binder for html content of the element.
	 * Renders html content of the element on change of the bound model attribute.
	 *
	 * @constructs
	 * @augments kff.Binder
	 * @param {Object} options Options object
	 */
	constructor: function(options)
	{
		kff.Binder.call(this, options);
	},

	refresh: function()
	{
		var val = this.value;
		if(val === null || val === undefined) val = '';
		this.$element[0].innerHTML = val;
	}
});

kff.BindingView.registerBinder('html', kff.HtmlBinder);


kff.RadioBinder = kff.createClass(
{
	extend: kff.Binder
},
/** @lends kff.RadioBinder.prototype */
{
	/**
	 * Two-way data binder for radio button.
	 * Checks radio when model atrribute evaluates to true, unchecks otherwise.
	 *
	 * @constructs
	 * @augments kff.Binder
	 * @param {Object} options Options object
	 */
	constructor: function(options)
	{
		var eventNames = options.eventNames.length > 0 ? options.eventNames.join(' ') : 'click';
		options = options || {};
		options.events = [
			[eventNames, 'inputChange']
		];
		kff.Binder.call(this, options);
		if(this.options.fill) this.fillVal = this.$element[0].checked;
	},

	inputChange: function(event)
	{
		if(this.$element[0].checked)
		{
			this.updateModel(this.$element[0].value, event);
		}
	},

	refresh: function()
	{
		this.$element[0].checked = this.parse(this.$element[0].value) === this.currentValue;
	},

	fill: function()
	{
		if(!this.fillVal) this.fillVal = this.$element[0].checked;
		if(this.fillVal)
		{
			this.updateModel(this.$element[0].value);
		}
	}

});

kff.BindingView.registerBinder('radio', kff.RadioBinder);


kff.TextBinder = kff.createClass(
{
	extend: kff.Binder
},
/** @lends kff.TextBinder.prototype */
{
	/**
	 * One-way data binder for plain text content of the element.
	 * Renders text content of the element on change of the bound model attribute.
	 *
	 * @constructs
	 * @augments kff.Binder
	 * @param {Object} options Options object
	 */
	constructor: function(options)
	{
		kff.Binder.call(this, options);
	},

	refresh: function(value)
	{
		var val = this.value;
		if(val === null || val === undefined) val = '';
		this.$element[0].textContent = val;
	}
});

if(typeof document === 'object' && document !== null)
{
	if(!('textContent' in document.documentElement))
	{
		kff.TextBinder.prototype.refresh = function(value)
		{
			var val = this.value;
			if(val === null || val === undefined) val = '';
			this.$element[0].innerText = val;
		};
	}
}

kff.BindingView.registerBinder('text', kff.TextBinder);


kff.ValueBinder = kff.createClass(
{
	extend: kff.Binder
},
/** @lends kff.ValueBinder.prototype */
{
	/**
	 * Two-way data binder for input, select, textarea elements.
	 * Triggers model change on keydown, drop and change events on default.
	 *
	 * @constructs
	 * @augments kff.Binder
	 * @param {Object} options Options object
	 */
	constructor: function(options)
	{
		var eventNames = options.eventNames.length > 0 ? options.eventNames.join(' ') : 'keypress keydown drop change';
		options.events = [
			[eventNames, 'inputChange']
		];
		this.multiple = false;
		kff.Binder.call(this, options);
		if(this.options.fill) this.fillVal = this.getValue();
	},

	init: function()
	{
		this.multiple = this.$element[0].nodeName === 'SELECT' && this.$element[0].multiple;
		if(this.multiple)
		{
			this.getValue = this.getArrayValue;
			this.setValue = this.setArrayValue;
			this.compareValues = kff.compareArrays;
		}
		if(this.options.eventFilters && this.options.eventFilters[0])
		{
			this.inputChange = this.createFilterTriggerEvent(this.inputChange, this.options.eventFilters[0]);
		}
		kff.Binder.prototype.init.call(this);
	},

	inputChange: function(event)
	{
		kff.setZeroTimeout(this.f(function()
		{
			this.updateModel(this.getValue(), event);
		}));
	},

	refresh: function()
	{
		var val = this.getFormattedValue();
		if(val === null || val === undefined) val = '';

		if(this.$element[0].nodeName === 'SELECT')
		{
			kff.setZeroTimeout(this.f(function()
			{
				this.setValue(val);
			}));
		}
		else
		{
			this.setValue(val);
		}
	},

	fill: function()
	{
		if(!this.fillVal)
		{
			this.fillVal = this.getValue();
		}
		this.updateModel(this.fillVal);
	},

	getValue: function()
	{
		return this.$element[0].value;
	},

	setValue: function(val)
	{
		this.$element[0].value = val;
	},

	getArrayValue: function()
	{
		var result = [];
		var options = this.$element[0] && this.$element[0].options;
		var option;

		for(var i = 0, l = options.length; i < l; i++)
		{
			option = options[i];
			if(option.selected)
			{
				result.push(option.value || option.text);
			}
		}
		return result;
	},

	setArrayValue: function(val)
	{
		if(!(val instanceof Array)) val = [val];
		var options = this.$element[0] && this.$element[0].options;
		var option;

		for(var i = 0, l = options.length; i < l; i++)
		{
			option = options[i];
			option.selected = kff.arrayIndexOf(val, this.parse(option.value)) !== -1;
		}
	}
});

kff.BindingView.registerBinder('val', kff.ValueBinder);


var createInsertBinder = function(negate, force){

	return kff.createClass(
	{
		extend: kff.Binder
	},
	/** @lends kff.InsertBinder.prototype */
	{
		/**
		 * One-way data binder (model to DOM) for inserting/removing element from DOM.
		 *
		 * @constructs
		 * @augments kff.Binder
		 * @param {Object} options Options objectt
		 */
		constructor: function(options)
		{
			kff.Binder.call(this, options);
		},

		init: function()
		{
			this.equalsTo = true;

			if(this.options.params[0])
			{
				if(this.options.parsers.length === 0) this.equalsTo = this.convertValueType(this.options.params[0]);
				else this.equalsTo = this.parse(this.options.params[0]);
			}
			else this.options.params[0] = this.equalsTo;

			this.negate = this.options.params[1] === 'ne' || negate;

			this.forceRerender = force || this.options.params[2] === 'force' || this.options.params[1] === 'force';

			this.isInserted = true;

			if(this.forceRerender)
			{
				this.isRun = false;
				this.isRendered = true;

				this.renderSubviews = this.view.renderSubviews;
				this.runSubviews = this.view.runSubviews;
				this.destroySubviews = this.view.destroySubviews;

				this.view.renderSubviews = kff.noop;
				this.view.runSubviews = kff.noop;
				this.view.destroySubviews = kff.noop;
			}

			kff.InsertBinder._super.init.call(this);
		},

		destroy: function()
		{
			if(this.forceRerender)
			{
				this.view.renderSubviews = this.renderSubviews;
				this.view.runSubviews = this.runSubviews;
				this.view.destroySubviews = this.destroySubviews;
			}
			if(!this.isInserted)
			{
				parentNode = this.anchor.parentNode;

				if(parentNode)
				{
					parentNode.replaceChild(this.$element[0], this.anchor);
				}
				this.isInserted = true;
			}
			this.anchor = null;

			kff.InsertBinder._super.destroy.call(this);
		},

		refresh: function()
		{
			var parentNode;
			if(!this.anchor) this.anchor = this.view.env.document.createTextNode('');
			if(this.matchValue())
			{
				if(!this.isInserted)
				{
					parentNode = this.anchor.parentNode;

					if(parentNode)
					{
						parentNode.replaceChild(this.$element[0], this.anchor);
					}
					this.isInserted = true;
				}
				if(this.forceRerender)
				{
					if(!this.isRendered)
					{
						this.renderSubviews.call(this.view);
						this.isRendered = true;
					}
					if(!this.isRun)
					{
						this.runSubviews.call(this.view);
						this.isRun = true;
					}
				}
			}
			else
			{
				if(this.isInserted)
				{
					parentNode = this.$element[0].parentNode;

					if(parentNode)
					{
						parentNode.replaceChild(this.anchor, this.$element[0]);
					}
					this.isInserted = false;
				}
				if(this.forceRerender && this.isRendered)
				{
					this.destroySubviews.call(this.view);
					this.isRendered = false;
					this.isRun = false;
				}
			}
		},

		matchValue: function()
		{
			if(this.options.params.length > 0)
			{
				if(this.negate) return this.value !== this.equalsTo;
				else return this.value === this.equalsTo;
			}
			else return this.value;
		}
	});

};

kff.InsertBinder = createInsertBinder(false, false);
kff.IfBinder = createInsertBinder(false, true);
kff.IfNotBinder = createInsertBinder(true, true);

kff.BindingView.registerBinder('insert', kff.InsertBinder);
kff.BindingView.registerBinder('if', kff.IfBinder);
kff.BindingView.registerBinder('ifnot', kff.IfNotBinder);


kff.ViewFactory = kff.createClass(
{
	args: [{
		serviceContainer: '@'
	}],
	shared: true
},
/** @lends kff.ViewFactory.prototype */
{
	/**
	 * Factory class for creating views.
	 * This class uses dependency injection container (kff.ServiceContainer)
	 * to lookup and instantiation of views.
	 *
	 * @param  {Object} options Configuration object
	 * @param  {kff.ServiceContainer} options.serviceContainer DI container for instantiation of views
	 * @param  {Object} options.precedingViews Object containing key-value pairs of preceding page views
	 * @constructs
	 */
	constructor: function(options)
	{
		options = options || {};
		this.serviceContainer = options.serviceContainer || null;
		this.precedingViews = options.precedingViews || {};
	},

	/**
	 * Creates a new view instance. Uses the service container when provided.
	 * If not, tries to lookup for a view name in global namespace (treating
	 * viewName as object keypath)
	 *
	 * @param  {String} viewName Name of the view
	 * @param  {Object} options  Options object passed to the view constuctor
	 * @return {kff.View}        Created view
	 */
	createView: function(viewName, options)
	{
		var view = null, viewClass;
		options = options || {};

		if(typeof viewName !== 'function' && this.serviceContainer && this.serviceContainer.hasService(viewName))
		{
			view = this.serviceContainer.getService(viewName, [options]);
		}
		else
		{
			if(typeof viewName !== 'function') viewClass = kff.evalObjectPath(viewName);
			else viewClass = viewName;
			if(viewClass) view = new viewClass(kff.mixins({}, options));
			if(view) view.setViewFactory(this);
			else kff.log('Could not create a view "' + viewName + '" (kff.ViewFactory#createView)');
		}
		return view;
	},

	getDefaultViewOptions: function(viewName)
	{
		var viewConfig = this.serviceContainer.getServiceConfigAnnotation(viewName);
		if(typeof viewConfig === 'object' && viewConfig !== null && viewConfig.args instanceof Array) return this.serviceContainer.resolveParameters(viewConfig.args[0]);
		else return null;
	},

	/**
	 * Returns constructor function of the view. Used only as fallback in the
	 * getPrecedingView method.
	 *
	 * @private
	 * @param  {[type]} viewName [description]
	 * @return {[type]}          [description]
	 */
	getServiceConstructor: function(viewName)
	{
		if(typeof viewName === 'function') return viewName;
		if(this.serviceContainer && this.serviceContainer.hasService(viewName)) return this.serviceContainer.getServiceConstructor(viewName);
		else return kff.evalObjectPath(viewName);
	},

	/**
	 * Returns a name of the preceding page view.
	 *
	 * @param  {String} viewName Name of the view
	 * @return {String}          Name of the preceding view
	 */
	getPrecedingView: function(viewName)
	{
		var viewCtor;
		if(typeof viewName === 'string' && this.precedingViews[viewName] !== undefined) return this.precedingViews[viewName];
		else
		{
			viewCtor = this.getServiceConstructor(viewName);
			if(viewCtor && viewCtor.precedingView) return viewCtor.precedingView;
		}
		return null;
	}

});

/*
 *  Parts of kff.Route code from https://github.com/visionmedia/page.js
 *  Copyright (c) 2012 TJ Holowaychuk <tj@vision-media.ca>
 */

kff.Route = kff.createClass(
/** @lends kff.Route.prototype */
{
	/**
	 * @constructs
	 */
	constructor: function(pattern, target)
	{
		this.pattern = pattern;
		this.target = target;
		this.keys = null;
		this.regexp = this.compileRegex();
	},

	getTarget: function()
	{
		return this.target;
	},

	match: function(path, params)
	{
		var keys = this.keys,
			qsIndex = path.indexOf('?'),
			pathname = ~qsIndex ? path.slice(0, qsIndex) : path,
			m = this.regexp.exec(pathname);

		if (!m) return false;

		for (var i = 1, len = m.length; i < len; ++i) {
			var key = keys[i - 1];

			var val = 'string' == typeof m[i]
				? decodeURIComponent(m[i])
				: m[i];

			if (key) {
				params[key.name] = undefined !== params[key.name]
					? params[key.name]
					: val;
			} else {
				params.push(val);
			}
		}

		return true;
	},

	/**
	 * Normalize the given path string,
	 * returning a regular expression.
	 *
	 * An empty array should be passed,
	 * which will contain the placeholder
	 * key names. For example "/user/:id" will
	 * then contain ["id"].
	 *
	 * @param  {String|RegExp|Array} path
	 * @param  {Array} keys
	 * @param  {Boolean} sensitive
	 * @param  {Boolean} strict
	 * @return {RegExp}
	 * @api private
	 */
	compileRegex: function(sensitive, strict)
	{
		var keys = this.keys = [];
		var path;

		path = this.pattern
			.concat(strict ? '' : '/?')
			.replace(/\/\(/g, '(?:/')
			.replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g, function(_, slash, format, key, capture, optional){
				keys.push({ name: key, optional: !! optional });
				slash = slash || '';
				return ''
					+ (optional ? '' : slash)
					+ '(?:'
					+ (optional ? slash : '')
					+ (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')'
					+ (optional || '');
			})
			.replace(/([\/.])/g, '\\$1')
			.replace(/\*/g, '(.*)');
		return new RegExp('^' + path + '$', sensitive ? '' : 'i');
	}
});


kff.Router = kff.createClass(
/** @lends kff.Router.prototype */
{
	/**
	 * @constructs
	 */
	constructor: function(options)
	{
		this.options = options || {};
		this.routes = [];
		this.params = options.params || null;
		this.buildRoutes();
	},

	buildRoutes: function()
	{
		this.routes = [];
		var routesConfig = this.options.routes;
		for(var key in routesConfig)
		{
			this.routes.push(new kff.Route(key, routesConfig[key]));
		}
	},

	match: function(path)
	{
		var params;
		for(var i = 0, l = this.routes.length; i < l; i++)
		{
			params = [];
			if(this.routes[i].match(path, params))
			{
				return { target: this.routes[i].getTarget(), params: params };
			}
		}
		return null;
	}

});


kff.HashStateHandler = kff.createClass(
{
	mixins: kff.EventsMixin,
	shared: true
},
/** @lends kff.StateHandler.prototype */
{
	init: function()
	{
		this.stateHistory = {};
		this.initialHash = location.hash;
		$(window).on('hashchange', this.f('hashChange'));
		this.hashChange();
	},

	destroy: function()
	{
		$(window).off('hashchange', this.f('hashChange'));
	},

	pushState: function(state, title, url)
	{
		location.hash = url;
	},

	replaceState: function(state, title, url)
	{
		if(location.hash !== this.initialHash) history.back();
		location.hash = url;
	},

	hashChange: function(event)
	{
		var hash = location.hash;
		if(hash.indexOf('#') !== 0 && hash != '') return false;

		this.trigger('popstate', { path: hash, params: {} });
		return false;
	}
});


kff.FrontController = kff.createClass(
{
	statics: {
		service: {
			args: [{
				viewFactory: '@kff.ViewFactory',
				defaultView: 'kff.PageView',
				stateHandler: '@kff.HashStateHandler',
				element: null
			}],
			shared: true
		}
	}
},
/** @lends kff.FrontController.prototype */
{
	/**
	 * @constructs
	 */
	constructor: function(options)
	{
		options = options || {};
		this.options = options;
		this.views = null;
		this.viewsQueue = [];
		this.viewFactory = options.viewFactory;
		this.defaultView = options.defaultView;
		this.router = options.router || null;
		this.rootElement = options.element || null;
		this.stateHandler = options.stateHandler || null;
		this.middlewares = options.middlewares || [];
		this.dispatcher = options.dispatcher || null;
		this.env = options.env || { document: document, window: window };
	},

	/**
	 * Inits front controller
	 */
	init: function()
	{
		if(!this.viewFactory) this.viewFactory = new kff.ViewFactory();
		if(this.router && this.stateHandler)
		{
			this.stateHandler.on('popstate', this.f('setState'));
			this.stateHandler.init();
		}
		else this.setState(null);
	},

	/**
	 * Destroys front controller
	 */
	destroy: function()
	{
		var destroyQueue = [], lastViewName, i;
		while((lastViewName = this.getLastView() ? this.getLastView().name : null) !== null)
		{
			destroyQueue.push(this.popView());
		}

		for(i = 0; i < destroyQueue.length; i++)
		{
			destroyQueue[i].instance.destroyAll();
		}

		this.destroyDone();
	},

	/**
	 * Async callback for destroy method
	 *
	 * @private
	 */
	destroyDone: function()
	{
		if(this.router && this.stateHandler)
		{
			this.stateHandler.off('popstate', this.f('setState'));
			this.stateHandler.destroy();
		}
		if(this.viewFactory) this.viewFactory = null;
	},

	/**
	 * Constructs view name from state object
	 *
	 * @param  {object} state State object
	 * @return {string}       Name (service name) of the view
	 */
	createViewFromState: function(state)
	{
		var result = null, viewName = this.defaultView;
		if(this.router && this.state)
		{
			var path = state.path;

			if(path === '') path = '#';

			result = this.router.match(path);
			if(result)
			{
				state.params = result.params;
			}
		}
		if(result) viewName = result.target;

		viewName = this.processMiddlewares(viewName, state);

		return viewName;
	},

	/**
	 * Process/transforms view name by middleware functions
	 *
	 * @private
	 * @param  {string} viewName Service name of the view
	 * @param  {object} state    State object
	 * @return {string}          Transformed view name
	 */
	processMiddlewares: function(viewName, state)
	{
		for(var i = 0, l = this.middlewares.length; i < l; i++)
		{
			viewName = this.middlewares[i].call(null, viewName, state);
		}
		return viewName;
	},

	/**
	 * Returns last view metaobject in the views queue
	 *
	 * @private
	 * @return {object} Metaobject with the last view
	 */
	getLastView: function()
	{
		if(this.viewsQueue.length > 0) return this.viewsQueue[this.viewsQueue.length - 1];
		else return null;
	},

	/**
	 * Adds view metaobject to the queue
	 *
	 * @private
	 * @param  {object} view View metaobject
	 */
	pushView: function(view)
	{
		this.viewsQueue.push(view);
	},

	/**
	 * Returns, destroys and removes last view from the queue
	 * @return {object} View metaobject
	 */
	popView: function()
	{
		if(this.viewsQueue.length === 0) return;

		var removedView = this.viewsQueue.pop();

		return removedView;
	},

	cascadeState: function()
	{
		if(this.viewsQueue[0]) this.viewsQueue[0].instance.setState(this.state);
	},

	setState: function(state)
	{
		var destroyQueue = [], lastViewName, sharedViewName, i;

		this.state = state;
		this.newViewName = this.createViewFromState(state);
		lastViewName = this.getLastView() ? this.getLastView().name : null;
		sharedViewName = this.findSharedView(this.newViewName, lastViewName);

		while((lastViewName = this.getLastView() ? this.getLastView().name : null) !== null)
		{
			if(lastViewName === sharedViewName) break;
			destroyQueue.push(this.popView());
		}

		for(i = 0; i < destroyQueue.length; i++)
		{
			destroyQueue[i].instance.destroyAll();
		}

		this.startInit();

		if(this.dispatcher)
		{
			this.dispatcher.trigger({
				type: 'route',
				state: state
			});
		}
	},

	startInit: function()
	{
		var i, l, view, options = {},
			precedingViewNames = this.getPrecedingViews(this.newViewName),
			from = 0;

		if(this.rootElement) options = { element: this.rootElement };
		if(this.dispatcher) options.dispatcher = this.dispatcher;
		options.env = this.env;

		for(i = 0, l = precedingViewNames.length; i < l; i++)
		{
			if(i >= this.viewsQueue.length)
			{
				view = this.viewFactory.createView(precedingViewNames[i], options);
				view.setViewFactory(this.viewFactory);
				this.pushView({ name: precedingViewNames[i], instance: view });
			}
			else from = i + 1;
		}

		this.newViewName = null;

		for(i = from; i < this.viewsQueue.length; i++)
		{
			this.viewsQueue[i].instance.init();
		}
	},

	findSharedView: function(c1, c2)
	{
		var i, l,
			c1a = this.getPrecedingViews(c1),
			c2a = this.getPrecedingViews(c2),
			c = null;

		for(i = 0, l = c1a.length < c2a.length ? c1a.length : c2a.length; i < l; i++)
		{
			if(c1a[i] !== c2a[i]) break;
			c = c1a[i];
		}
		return c;
	},

	getPrecedingViews: function(viewName)
	{
		var c = viewName, a = [c];

		while(c)
		{
			c = this.viewFactory.getPrecedingView(c);
			if(c) a.unshift(c);
		}
		return a;
	},

	getViewFactory: function()
	{
		return this.viewFactory;
	},

	setViewFactory: function(viewFactory)
	{
		this.viewFactory = viewFactory;
	},

	getRouter: function()
	{
		return this.router;
	},

	setRouter: function(router)
	{
		this.router = router;
	},

	setDefaultView: function(defaultView)
	{
		this.defaultView = defaultView;
	},

	setStateHandler: function(stateHandler)
	{
		this.stateHandler = stateHandler;
	},

	setDispatcher: function(dispatcher)
	{
		this.dispatcher = dispatcher;
	}
});

function filterByEventType(type)
{
	return function(o){ return o.type === type; };
}

kff.Dispatcher = kff.createClass(
{
	constructor: function(actions)
	{
		this.eventStream = new kff.EventStream();
		this.actionStreams = {};
		this.registerActions(actions);
	},

	createCallback: function(fn)
	{
		var dispatcher = this;
		if(typeof fn !== 'function') {
			throw new Error('Dispatcher action "' + fn + '" is not a function');
		}
		if(fn.length <= 1)
		{
			return function(event)
			{

				var nextEvent = fn.call(null, event);
				if(nextEvent instanceof kff.EventStream)
				{
					nextEvent.on(dispatcher.f('trigger'));
				}
				else if(nextEvent) dispatcher.trigger(nextEvent);
			};
		}
		else
		{
			return function(event)
			{
				var done = function(err, nextEvent)
				{
					if(err) return;
					if(nextEvent) dispatcher.trigger(nextEvent);
				};
				fn.call(null, event, done);
			};
		}
	},

	registerActions: function(actions)
	{
		var callbacks;
		if(typeof actions === 'object')
		{
			for(var action in actions)
			{
				if(typeof actions[action] !== 'function') {
					throw new Error('Dispatcher action "' + action + '" is not a function');
				}
				this.actionStreams[action] = this.eventStream.filter(filterByEventType(action)).on(this.createCallback(actions[action]));
			}
		}
	},

	trigger: function(event)
	{
		this.eventStream.trigger(event);
	},

	on: function(type, fn)
	{
		if(!(type in this.actionStreams)) this.actionStreams[type] = this.eventStream.filter(filterByEventType(type));
		this.actionStreams[type].on(this.createCallback(fn));
	},

	off: function(type, fn)
	{
		// if(type in this.actionStreams) this.actionStreams[action].on(this.createCallback(fn));
	},


	hasAction: function(action)
	{
		return action in this.actionStreams;
	}
});

kff.App = kff.createClass(
/** @lends kff.App.prototype */
{
	/**
	 * Convenient class for basic application structure. Contains service
	 * container with preddefined services:
	 *
	 * * kff.ViewFactory
	 * * kff.FrontController
	 * * kff.PageView
	 *
	 * @constructs
	 */
	constructor: function(options)
	{
		var scope, element, require, middlewares, dispatcher;
		this.options = options = options || {};
		scope = options.scope || {};
		element = options.element || null;
		require = options.require || null;
		var modules = options.modules || null;
		this.env = options.env || { document: document, window: window };
		this.dispatcher = null;

		if(this.options.middlewares instanceof Array) middlewares = this.options.middlewares;
		else middlewares = [];

		// Dependency injection container configuration:
		var config = {
			parameters: {},
			services: {
				'kff.PageView': {
					args: [{
						element: element,
						scope: scope
					}]
				},
				'kff.FrontController': {
					args: [{
						viewFactory: '@kff.ViewFactory',
						defaultView: 'kff.PageView',
						stateHandler: '@kff.HashStateHandler',
						middlewares: middlewares,
						element: null,
						env: this.env
					}],
					shared: true
				}
			},
			modules: modules
		};

		if(this.options.dispatcher)
		{
			config.services['kff.Dispatcher'] = {
				args: [this.options.dispatcher.actions || {}]
			};

			config.services['kff.FrontController'].args[0].dispatcher = '@kff.Dispatcher';
		}

		this.serviceContainer = new kff.ServiceContainer(config, require);
		if('parameters' in options) this.serviceContainer.registerParameters(options.parameters, true);
		if('services' in options) this.serviceContainer.registerServices(options.services, true);

		return this;
	},

	/**
	 * Initiates application. Gets a 'frontController' service from container
	 * and calls its init method.
	 *
	 * @return {[type]} [description]
	 */
	init: function()
	{
		var frontControllerOptions = { element: this.options.element };
		var frontController = this.frontController = this.serviceContainer.getService('kff.FrontController', [frontControllerOptions]);
		if(!frontController.getViewFactory()) frontController.setViewFactory(this.serviceContainer.getService('kff.ViewFactory'));
		if(this.options.router)
		{
			var routerOptions = {
				routes: this.options.router.routes || [],
				params: this.options.router.params || null
			};

			if(this.options.router.params) routerOptions.params = this.serviceContainer.resolveParameters(this.options.router.params);

			var router = this.serviceContainer.getService('kff.Router', [routerOptions]);
			frontController.setRouter(router);
		}
		if(this.options.stateHandler)
		{
			frontController.setStateHandler(this.serviceContainer.resolveParameters(this.options.stateHandler));
		}
		if(this.options.defaultView)
		{
			frontController.setDefaultView(this.options.defaultView);
		}
		frontController.init();
	},

	/**
	 * Destroys the application
	 */
	destroy: function()
	{
		if(this.frontController) this.frontController.destroy();
	},

	/**
	 * Returns internal service container instance.
	 *
	 * @return {kff.ServiceContainer} service container instance
	 */
	getServiceContainer: function()
	{
		return this.serviceContainer;
	}

});



})();
