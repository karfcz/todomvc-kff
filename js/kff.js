/**
 * KFF Frontend Framework v2.0.0-alpha.2
 * (c) 2008-2014 Karel Fučík
 * License: MIT
 * https://github.com/karfcz/kff
 */
(function(scope)
{
	var kff;

	if(typeof exports !== 'undefined') kff = exports;
	/**
	 * @namespace kff KFFnamespace
	 */
	else kff = 'kff' in scope ? scope.kff : (scope.kff = {}) ;
	kff.widgets = {};

// EventListener | @jon_neal | //github.com/jonathantneal/EventListener

if(typeof window === 'object' && window !== null)
{
	(function(){

		!this.addEventListener && this.Element && (function () {
			function addToPrototype(name, method) {
				Window.prototype[name] = HTMLDocument.prototype[name] = Element.prototype[name] = method;
			}

			var registry = [];

			addToPrototype("addEventListener", function (type, listener) {
				var target = this;

				registry.unshift({
					__listener: function (event) {
						event.currentTarget = target;
						event.pageX = event.clientX + document.documentElement.scrollLeft;
						event.pageY = event.clientY + document.documentElement.scrollTop;
						event.preventDefault = function () { event.returnValue = false };
						if(event.type === 'mouseleave' || event.type === 'mouseout') {
							event.relatedTarget = event.toElement || null;
						}
						else {
							event.relatedTarget = event.fromElement || null;
						}
						event.stopPropagation = function () { event.cancelBubble = true };
						event.target = event.srcElement || target;
						event.timeStamp = +new Date;

						listener.call(target, event);
					},
					listener: listener,
					target: target,
					type: type
				});

				this.attachEvent("on" + type, registry[0].__listener);
			});

			addToPrototype("removeEventListener", function (type, listener) {
				for (var index = 0, length = registry.length; index < length; ++index) {
					if (registry[index].target == this && registry[index].type == type && registry[index].listener == listener) {
						return this.detachEvent("on" + type, registry.splice(index, 1)[0].__listener);
					}
				}
			});

			addToPrototype("dispatchEvent", function (eventObject) {
				try {
					return this.fireEvent("on" + eventObject.type, eventObject);
				} catch (error) {
					for (var index = 0, length = registry.length; index < length; ++index) {
						if (registry[index].target == this && registry[index].type == eventObject.type) {
							registry[index].call(this, eventObject);
						}
					}
				}
			});
		})();

	})();


	// ClassList polyfill for IE8/9
	(function () {

		if (typeof window.Element === "undefined" || "classList" in document.documentElement) return;

		var prototype = Array.prototype,
			push = prototype.push,
			splice = prototype.splice,
			join = prototype.join;

		function DOMTokenList(el) {
			this.el = el;
			// The className needs to be trimmed and split on whitespace
			// to retrieve a list of classes.
			var classes = el.className.replace(/^\s+|\s+$/g,'').split(/\s+/);
			for (var i = 0; i < classes.length; i++) {
				push.call(this, classes[i]);
			}
		};

		DOMTokenList.prototype =
		{
			add: function(token) {
				if(this.contains(token)) return;
				push.call(this, token);
				this.el.className = this.toString();
			},

			contains: function(token) {
				return this.el.className.indexOf(token) != -1;
			},

			item: function(index) {
				return this[index] || null;
			},

			remove: function(token) {
				if (!this.contains(token)) return;
					for (var i = 0; i < this.length; i++) {
						if (this[i] == token) break;
					}
					splice.call(this, i, 1);
				this.el.className = this.toString();
			},

			toString: function() {
				return join.call(this, ' ');
			},

			toggle: function(token) {
				if (!this.contains(token)) {
					this.add(token);
				} else {
					this.remove(token);
				}

				return this.contains(token);
			}
		};

		window.DOMTokenList = DOMTokenList;

		function defineElementGetter (obj, prop, getter) {
			if (Object.defineProperty) {
				Object.defineProperty(obj, prop,{
					get : getter
				});
			} else {
				obj.__defineGetter__(prop, getter);
			}
		}

		defineElementGetter(Element.prototype, 'classList', function () {
			return new DOMTokenList(this);
		});

	})();

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

/**
 * Data-attribute name used for event triggers
 * @constant
 */
kff.DATA_TRIGGER_ATTR = 'data-kff-trigger';

/**
 * Data-attribute name used for collection filtering
 * @constant
 */
kff.DATA_FILTER_ATTR = 'data-kff-filter';

/**
 * Data-attribute name used for collection sorting
 * @constant
 */
kff.DATA_SORT_ATTR = 'data-kff-sort';

/**
 * Data-attribute name used forcollection count
 * @constant
 */
kff.DATA_COUNT_ATTR = 'data-kff-count';

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
		for(key in props)
		{
			if(props.hasOwnProperty(key))
			{
				prop = props[key];
				if(deep && kff.isPlainObject(prop))
				{
					objProp = obj[key];
					if(typeof objProp !== 'object' || objProp === null) objProp = {};
					kff.mixins(objProp, prop, deep);
				}
				else obj[key] = prop;
			}
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
	if(meta.staticProperties)
	{
		kff.mixins(constructor, meta.staticProperties);
	}

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
		kff.setZeroTimeout = function(fn)
		{
			callbacks.push(fn);
			window.postMessage(messageName, '*');
		};
		window.addEventListener('message', handleMessage, true);
	}
	else
	{
		kff.setZeroTimeout = function(fn)
		{
			setTimeout(fn, 0);
		};
	}

	kff.setZeroTimeout(fn);
};


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
	return kff.evalObjectPath(serviceName);
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



kff.imClone = function(obj)
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

kff.imSet = function(keypath, value, obj)
{
	var fn = value;
	if(typeof fn !== 'function') fn = function(){ return value; };
	if(typeof keypath === 'string') keypath = keypath.split('.');

	var root = kff.imClone(obj);
	var prev = root;
	if(keypath.length === 0) return fn(root);

	for(var i = 0, l = keypath.length; i < l - 1; i++)
	{
		prev = prev[keypath[i]] = kff.imClone(prev[keypath[i]]);
	}

	prev[keypath[i]] = fn(prev[keypath[i]]);

	return root;
};

kff.imRemove = function(keypath, obj)
{
	if(typeof keypath === 'string') keypath = keypath.split('.');

	var root = kff.imClone(obj);
	var prev = root;

	for(var i = 0, l = keypath.length; i < l - 1; i++)
	{
		prev = prev[keypath[i]] = kff.imClone(prev[keypath[i]]);
	}

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
	},

	/**
	 * Binds event handler.
	 *
	 * @param {string|Array} eventType Event name(s)
	 * @param {function} fn Event handler
	 */
	on: function(eventType, fn)
	{
		if(typeof eventType === 'string')
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


kff.Collection = kff.createClass(
{
	mixins: kff.EventsMixin
},
/** @lends kff.Collection.prototype	*/
{
	/**
	 * Class representing a collection of models.

	 * @constructs
	 * @param {Object} options Options object
	 * @param {function} options.itemFactory Factory function for creating new collection items (optional)
	 * @param {function} options.itemType Type (class or constructor function) of collection items
	 */
	constructor: function(options)
	{
		this.options = options = options || {};
		this.itemFactory = options.itemFactory || null;
		this.itemType = options.itemType || kff.Model;
		this.serializeAttrs = options.serializeAttrs || null;
		this.onEachEvents = [];
		this.array = [];
	},

	/**
	 * Creates a new item using itemType or itemFactory if provided
	 *
	 * @returns {mixed} Created item
	 */
	createItem: function()
	{
		var item;
		if(this.itemFactory) item = this.itemFactory();
		else item = new this.itemType();
		return item;
	},

	/**
	 * Appends the item at the end of the collection
	 *
	 * Triggers a change event with folloving event object:
	 *
	 *  { type: 'append', item: item }
	 *
	 * @param {mixed} item Item to be appended
	 * @param {Boolean} silent If true, do not trigger event
	 */
	append: function(item, silent)
	{
		this.array.push(item);
		this.bindOnOne(item);
		if(!silent) this.trigger('change', { type: 'append', item: item });
	},

	/**
	 * Concatenates collection with other collections, arrays or objects
	 *
	 * Method accepts variable length arguments, works like Array.concat
	 *
	 * @return {kff.Collection} A new collection
	 */
	concat: function()
	{
		var collection = new kff.Collection(this.options);
		var args = [];
		for(var i = 0, l = arguments.length; i < l; i++)
		{
			if(arguments[i] instanceof kff.Collection) args.push(arguments[i].array);
			else args.push(arguments[i]);
		}
		collection.array = Array.prototype.concat.apply(this.array, args);

		return collection;
	},

	/**
	 * Joins items of collection using toString method and separator
	 *
	 * Works like Array.join
	 *
	 * @return {String} Joined string
	 */
	join: function(separator)
	{
		return this.array.join(separator);
	},

	/**
	 * Creates a new collection with the results of calling a provided function on every element in this collection
	 *
	 * Works like Array.concat
	 *
	 * @param  {Function} callback Function that produces an element of the new collection, taking three arguments:
	 *                             currentValue: the current item being processed
	 *                             index: the index of the current value
	 *                             collection: the collection map was called upon
	 * @param  {mixed}	thisArg    Value to use as this when executing callback
	 * @return {kff.Collection}    Mapped collection
	 */
	map: function(callback, thisArg)
	{
		thisArg = thisArg || undefined;
		var mappedArray;
		var array = this.array;

		if(typeof callback !== "function") {
			throw new TypeError(callback + " is not a function");
		}

		mappedArray = new Array(array.length);

		for(var i = 0, l = array.length; i < l; i++)
		{
			mappedArray[i] = callback.call(thisArg, array[i], i, this);
		}

		var mappedCollection = new kff.Collection(this.options);
		mappedCollection.array = mappedArray;

		return mappedCollection;
	},

	/**
	 * The reduce() method applies a function against an accumulator and each value of the collection
	 * (from left-to-right) has to reduce it to a single value.
	 *
	 * Works like Array.reduce
	 *
	 * @param  {Function} callback Function to execute on each value in the collection, taking four arguments:
	 *                             previousValue: The value previously returned in the last invocation of the callback, or initialValue, if supplied.
	 *                             currentValue: the current item being processed
	 *                             index: the index of the current value
	 *                             collection: the collection reduce was called upon
	 * @param  {mixed}	initialValue  Object to use as the first argument to the first call of the callback.
	 * @return {mixed}  Reduced value
	 */
	reduce: function(callback, initialValue)
	{
		var array = this.array;
		var l = array.length, value, i = 0;

		if(typeof callback !== 'function')
		{
			throw new TypeError( callback + ' is not a function' );
		}

		if(arguments.length >= 2)
		{
			value = arguments[1];
		}
		else
		{
			if(l === 0) throw new TypeError('Reduce of empty collection with no initial value');
		  	value = array[i++];
		}

		for(; i < l; i++)
		{
			value = callback(value, array[i], i, this);
		}
		return value;
	},

	/**
	 * The reduceRight() method applies a function against an accumulator and each value of the collection
	 * (from right-to-left) has to reduce it to a single value.
	 *
	 * Works like Array.reduce
	 *
	 * @param  {Function} callback Function to execute on each value in the collection, taking four arguments:
	 *                             previousValue: The value previously returned in the last invocation of the callback, or initialValue, if supplied.
	 *                             currentValue: the current item being processed
	 *                             index: the index of the current value
	 *                             collection: the collection reduce was called upon
	 * @param  {mixed}	initialValue  Object to use as the first argument to the first call of the callback.
	 * @return {mixed}  Reduced value
	 */
	reduceRight: function(callback, initialValue)
	{
		var array = this.array;
		var l = array.length, value, i = l - 1;

		if(typeof callback !== 'function')
		{
			throw new TypeError( callback + ' is not a function' );
		}

		if(arguments.length >= 2)
		{
			value = arguments[1];
		}
		else
		{
			if(l === 0) throw new TypeError('Reduce of empty collection with no initial value');
		  	value = array[i--];
		}

		for(; i >= 0; i--)
		{
			value = callback(value, array[i], i, this);
		}
		return value;
	},

	/**
	 * Inserts an item at specified index
	 *
	 * Triggers a change event with folloving event object:
	 *
	 * { type: 'insert', item: item, index: index }
	 *
	 * @param {mixed} item Item to be inserted
	 * @param {Boolean} silent If true, do not trigger event
	 */
	insert: function(item, index, silent)
	{
		this.array.splice(index, 0, item);
		this.bindOnOne(item);
		if(!silent) this.trigger('change', { type: 'insert', item: item, index: index });
	},

	/**
	 * Sets an item at given position
	 *
	 * Triggers a change event with folloving event object:
	 *
	 * { type: 'set', item: item, index: index }
	 *
	 * @param {number} index Index of item
	 * @param {mixed} item Item to set
	 */
	set: function(index, item, silent)
	{
		var replacedItem = this.get(index);
		if(replacedItem) this.unbindOnOne(replacedItem);
		if(this.array[index] !== undefined)	this.array[index] = item;
		else throw new RangeError('Bad index in kff.List.set');
		this.bindOnOne(item);
		if(!silent) this.trigger('change', { type: 'set', item: item, index: index });
	},

	/**
	 * Removes the item from the collection
	 *
	 * Triggers a change event with folloving event object:
	 *
	 * { type: 'remove', item: item }
	 *
	 * @param {mixed} item Reference to the item to be removed
	 * @param {Boolean} silent If true, do not trigger event
	 * @returns {mixed} Removed item or false if not found
	 *
	 */
	remove: function(item, silent)
	{
		var i, a = this.array, currentItem, removed;
		if(typeof item === 'function')
		{
			removed = [];
			for(i = a.length - 1; i >= 0; i--)
			{
				currentItem = a[i];
				if(item(currentItem) === true)
				{
					this.array.splice(i, 1);
					removed.push({ item: currentItem, index: i });
					this.unbindOnOne(currentItem);
				}
			}
			if(removed.length === 0) return false;
			else
			{
				if(!silent) this.trigger('change', { type: 'remove', items: removed });
				return removed;
			}
		}
		else
		{
			i = kff.arrayIndexOf(a, item);
			if(i === -1) return false;
			a.splice(i, 1);
			this.unbindOnOne(item);
			if(!silent) this.trigger('change', { type: 'remove', item: item, index: i });
			return i;
		}
	},

	/**
	 * Creates a new collection with items that pass filter function test
	 * @param {function} fn Test function that accepts one argument (item).
	 */
	filter: function(fn)
	{
		var filteredColllection = this.clone();
		filteredColllection.remove(function(item){
			return !fn.call(null, item);
		});
		return filteredColllection;
	},

	/**
	 * Returns a shallow copy of a portion of an collection into a new collection
	 *
	 * Works like Array.slice
	 */
	slice: function()
	{
		var collection = new kff.Collection(this.options);
		collection.array = Array.prototype.slice.apply(this.array, arguments);
		for(var i = 0, l = collection.array.length; i < l; i++)
		{
			this.unbindOnOne(collection.array[i]);
		}
		return collection;
	},

	/**
	 * Works like Array.push
	 */
	push: function()
	{
		var i = this.array.length;
		var l = arguments.length;

		if(l > 0)
		{
			Array.prototype.push.apply(this.array, arguments);
			var event = { type: 'push', items: [], fromIndex: i };

			for(; l > 0 ; i++, l--)
			{
				event.items.push(this.array[i]);
				this.bindOnOne(this.array[i]);
			}
			this.trigger('change', event);
		}
		return this.array.length;
	},

	/**
	 * Removes the last element from a collection and returns that element.
	 * Works like Array.pop
	 */
	pop: function()
	{
		var item = this.array.pop();
		if(item) this.trigger('change', { type: 'pop', item: item});
		this.unbindOnOne(item);
		return item;
	},

	/**
	 * Removes the first element from a collection and returns that element.
	 * Works like Array.shift
	 */
	shift: function()
	{
		var item = this.array.shift();
		if(item) this.trigger('change', { type: 'shift', item: item});
		this.unbindOnOne(item);
		return item;
	},

	/**
	 * Adds one or more elements to the beginning of a collection and returns the new length of the collection.
	 * Works like Array.unshift
	 */
	unshift: function()
	{
		var l = arguments.length;

		if(l > 0)
		{
			Array.prototype.unshift.apply(this.array, arguments);
			var event = { type: 'unshift', items: []};

			for(var i = 0; i < l ; i++)
			{
				event.items.push(this.array[i]);
				this.bindOnOne(this.array[i]);
			}
			this.trigger('change', event);
		}
		return this.array.length;
	},

	/**
	 * Returns an item at given position
	 *
	 * @param {number} index Index of item
	 * @returns {mixed} Item at given position (or undefined if not found)
	 */
	get: function(index)
	{
		return this.array[index];
	},

	/**
	 * Returns the value of given attribute using deep lookup (object.attribute.some.value)
	 *
	 * @param {string} attrPath Attribute path
	 * @returns {mixed} Attribute value
	 * @example
	 * obj.mget('one.two.three');
	 * // equals to:
	 * obj.get('one').get('two').get('three');
	 */
	mget: function(attrPath)
	{
		var attr;
		if(typeof attrPath === 'string') attrPath = attrPath.split('.');
		attr = this.get(attrPath.shift());
		if(attrPath.length > 0)
		{
			if(attr instanceof kff.Model || attr instanceof kff.Collection) return attr.mget(attrPath);
			else return kff.evalObjectPath(attrPath, attr);
		}
		else return attr;
	},

	/**
	 * Creates a JSON representation of collection (= array object).
	 *
	 * If item of collection is object, tries to call toJson on it recursively.
	 * This function returns a plain object, not a stringified JSON.
	 *
	 * @returns {Array} Array representation of collection
	 */
	toJson: function()
	{
		var serializeAttrs = this.serializeAttrs, array = [];
		this.each(function(item)
		{
			if(item && item.toJson) array.push(item.toJson(serializeAttrs));
			else array.push(item);
		});
		return array;
	},

	/**
	 * Reads collection from JSON representation (= from JavaScript array)
	 *
	 * Triggers a change event with folloving event object:
	 *
	 * { type: 'fromJson' }
	 *
	 * @param {Array} array Array to read from
	 * @param {Boolean} silent If true, do not trigger event
	 */
	fromJson: function(array, silent)
	{
		var item;
		this.empty(true);
		for(var i = 0, l = array.length; i < l; i++)
		{
			item = this.createItem();
			item.fromJson(array[i], silent);
			this.append(item, true);
		}
		if(!silent) this.trigger('change', { type: 'fromJson' });
	},

	/**
	 * Finds an item with given attribute value
	 *
	 * @param {string} attr Attribute name
	 * @param {mixed} value Attribute value
	 * @returns {mixed} First found item or null
	 */
	findByAttr: function(attr, value)
	{
		var ret = null;
		this.each(function(val)
		{
			if(val && val.get(attr) === value)
			{
				ret = val;
				return false;
			}
		});
		return ret;
	},

	/**
	 * Removes all items from collection
	 *
	 * Triggers a change event with folloving event object:
	 *
	 * { type: 'empty' }
	 *
	 * @param {Boolean} silent If true, do not trigger event
	 */
	empty: function(silent)
	{
		this.unbindEach();
		this.array = [];
		if(!silent) this.trigger('change', { type: 'empty' });
	},

	/**
	 * Sorts collection using a compare function. The compare function follows the same specification
	 * as the standard Array.sort function
	 *
	 * Triggers a change event with folloving event object:
	 *
	 * { type: 'sort' }
	 *
	 * @param {function} compareFunction Compare function
	 * @param {Boolean} silent If true, do not trigger event
	 */
	sort: function(compareFunction, silent)
	{
		this.array.sort(compareFunction);
		if(!silent) this.trigger('change', { type: 'sort' });
	},

	// sortBy: function(valueFunction, silent)
	// {
	// 	var array = this.array;
	// 	for(var i = 0, l = array.length; i < l; i++)
	// 	{
	// 		array[i] = [array[i], valueFunction(array[i])];
	// 	}
	// 	this.array.sort(function(a, b){
	// 		return a[1] - b[1];
	// 	});
	// 	// this.array.sort(function(a, b){
	// 	// 	return valueFunction(a) - valueFunction(b);
	// 	// });
	// 	for(var i = 0, l = array.length; i < l; i++)
	// 	{
	// 		array[i] = array[i][0];
	// 	}
	// 	if(!silent) this.trigger('change', { type: 'sort' });
	// },


	/**
	 * Creates a clone (shallow copy) of the collection.
	 *
	 * @returns {kff.Collection} Cloned collection
	 */
	clone: function()
	{
		var clon = new kff.Collection(this.options);
		this.each(function(item){
			clon.append(item);
		});
		clon.onEachEvents = [].concat(this.onEachEvents);
		clon.rebindEach();
		return clon;
	},

	/**
	 * Randomizes items in the collection.
	 *
	 * Triggers a change event with folloving event object:
	 *
	 * { type: 'shuffle' }
	 *
	 * @param {Boolean} silent If true, do not trigger event
	 */
	shuffle: function(silent)
	{
		var arr = this.array,
			len = arr.length,
			i = len,
			p, t;

		while(i--)
		{
			p = parseInt(Math.random()*len, 10);
			t = arr[i];
			arr[i] = arr[p];
			arr[p] = t;
		}

		if(!silent) this.trigger('change', { type: 'shuffle' });
	},

	/**
	 * Splices the collection. Works exactly like the Array.splice method.
	 */
	splice: function()
	{
		this.unbindEach();
		Array.prototype.splice.apply(this.array, arguments);
		this.rebindEach();
		this.trigger('change', { type: 'splice' });
	},

	/**
	 * Returns an index of given item
	 *
	 * @param {mixed} item Value to be found
	 * @returns {number} index of the item or -1 if not found
	 */
	indexOf: function(item)
	{
		return kff.arrayIndexOf(this.array, item);
	},

	some: function(item)
	{
		if (!Array.prototype.some)
		{
			Array.prototype.some = function(fun /*, thisArg*/)
			{
				'use strict';

				if (this == null) {
					throw new TypeError('Array.prototype.some called on null or undefined');
				}

				if (typeof fun !== 'function') {
					throw new TypeError();
				}

				var t = Object(this);
				var len = t.length >>> 0;

				var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
				for (var i = 0; i < len; i++) {
					if (i in t && fun.call(thisArg, t[i], i, t)) {
						return true;
					}
				}

				return false;
			};
		}
		return this.array.some(item);
	},

	/**
	 * Returns number of items in the list.
	 *
	 * @return {number} Number of items (length of the list)
	 */
	count: function()
	{
		return this.array.length;
	},

	/**
	 * Iterates over each item in the list
	 * @param {function} fn A callback function to be called on each item. Takes two arguments - the iterated item and its index
	 */
	each: function(fn)
	{
		var a = this.array, l = a.length, i = 0;
		for(; i < l; i++)
		{
			if(fn.call(null, a[i], i) === false) break;
		}
	},

	/**
	 * Binds an event handler to each item in the collection.
	 * This bindings are persistent - when new items are added to the
	 * collection, event handlers are automatically bound to them. Handlers for
	 * removed items are automatically removed as well.
	 *
	 * @param  {String}   eventType Event type
	 * @param  {Function} fn        Event handler
	 */
	onEach: function(eventType, fn)
	{
		for(var i = 0, l = this.onEachEvents.length; i < l; i++)
		{
			if(this.onEachEvents[i].eventType === eventType && this.onEachEvents[i].fn === fn)
			{
				return;
			}
		}

		this.onEachEvents.push({ eventType: eventType, fn: fn });
		this.each(function(item, i){
			item.on(eventType, fn);
		});
	},

	/**
	 * Unbinds event handler previously bound by onEach method.
	 *
	 * @param  {String}   eventType Event type
	 * @param  {Function} fn        Event handler
	 */
	offEach: function(eventType, fn)
	{
		for(var i = 0, l = this.onEachEvents.length; i < l; i++)
		{
			if(this.onEachEvents[i].eventType === eventType && this.onEachEvents[i].fn === fn)
			{
				this.onEachEvents.splice(i, 1);
				l--;
			}
		}
		this.each(function(item, i){
			item.off(eventType, fn);
		});
	},

	/**
	 * Binds 'onEach' event handlers to a newly added collection item.
	 *
	 * @private
	 * @param  {kff.Model} item A new collection item (model)
	 */
	bindOnOne: function(item)
	{
		for(var i = 0, l = this.onEachEvents.length; i < l; i++)
		{
			item.on(this.onEachEvents[i].eventType, this.onEachEvents[i].fn);
		}
	},

	/**
	 * Unbinds 'onEach' event handlers from removed collection item.
	 *
	 * @private
	 * @param  {kff.Model} item Removed collection item (model)
	 */
	unbindOnOne: function(item)
	{
		for(var i = 0, l = this.onEachEvents.length; i < l; i++)
		{
			item.off(this.onEachEvents[i].eventType, this.onEachEvents[i].fn);
		}
	},

	/**
	 * Rebinds all 'onEach' event handlers for each collection item.
	 *
	 * @private
	 */
	rebindEach: function()
	{
		var that = this;
		this.each(function(item, i)
		{
			for(var j = 0, l = that.onEachEvents.length; j < l; j++)
			{
				item.on(that.onEachEvents[j].eventType, that.onEachEvents[j].fn);
			}
		});
	},

	/**
	 * Unbinds all 'onEach' event handlers for each collection item.
	 *
	 * @private
	 */
	unbindEach: function()
	{
		var that = this;
		this.each(function(item, i)
		{
			for(var j = 0, l = that.onEachEvents.length; j < l; j++)
			{
				item.off(that.onEachEvents[j].eventType, that.onEachEvents[j].fn);
			}
		});
	}

});

kff.Collection.prototype.findByIndex = kff.Collection.prototype.get;


kff.Model = kff.createClass(
{
	mixins: kff.EventsMixin
},
/** @lends kff.Model.prototype */
{
	/**
	 * Base class for models
	 * @constructs
	 */
	constructor: function(attrs)
	{
		this.initEvents();

		/**
		 * Attributes of model
		 * @private
		 */
		this.attrs = this.attrs || {};

		if(attrs) this.set(attrs);
	},

	/**
	 * Checks if the model has given attribute
	 *
	 * @public
	 * @param {string} attr Attribute name
	 * @returns {boolean} True if found, false otherwise
	 */
	has: function(attr)
	{
		return attr in this.attrs;
	},

	/**
	 * Returns the value of given attribute
	 *
	 * @param {string} attr Attribute name
	 * @returns {mixed} Attribute value
	 */
	get: function(attr)
	{
		return this.attrs[attr];
	},

	/**
	 * Returns the value of given attribute using deep lookup (object.attribute.some.value)

	 * @param {string} attrPath Attribute path
	 * @returns {mixed} Attribute value
	 * @example
	 *     obj.mget('one.two.three');
	 *     // equals to:
	 *     obj.get('one').get('two').get('three');
	 */
	mget: function(attrPath)
	{
		var attr;
		if(typeof attrPath === 'string') attrPath = attrPath.split('.');
		attr = this.get(attrPath.shift());
		if(attrPath.length > 0)
		{
			if(attr instanceof kff.Model || attr instanceof kff.Collection) return attr.mget(attrPath);
			else return kff.evalObjectPath(attrPath, attr);
		}
		else return attr;
	},

	/**
	 * Sets the value(s) of given attribute(s). Triggers a change event.
	 *
	 * @param {string|Object} attr Attribute name
	 * @param {mixed} value Attribute value
	 * @param {Boolean} silent If true, do not trigger event
	 */
	set: function(attr, value, silent)
	{
		var changed = {};

		if(typeof attr === 'string')
		{
			if(this.get(attr) === value) return;
			changed[attr] = value;
			this.attrs[attr] = value;
		}
		else if(attr !== null && typeof attr === 'object')
		{
			silent = value;
			changed = attr;
			for(var key in changed) this.attrs[key] = changed[key];
		}

		if(!silent)
		{
			for(var changedAttr in changed)
			{
				this.trigger('change:' + changedAttr, { model: this, changed: changed, changedAttributes: changed });
			}
			this.trigger('change', { model: this, changed: changed, changedAttributes: changed });
		}
	},

	/**
	 * Unsets (deletes) the attribute(s). Triggers a change event.
	 *
	 * @param {string|Array} attr Attribute name or array of attribute names
	 * @param {Boolean} silent If true, do not trigger event
	 */
	unset: function(attr,  silent)
	{
		var changed = {};

		if(typeof attr === 'string')
		{
			if(attr in this.attrs) delete this.attrs[attr];
			changed[attr] = undefined;
		}
		else if(attr !== null && attr instanceof Array)
		{
			for(var i = 0, l = attr.length; i < l; i++)
			{
				if(attr[i] in this.attrs)
				{
					delete this.attrs[attr[i]];
					changed[attr[i]] = undefined;
				}
			}
		}

		if(!silent)
		{
			for(var changedAttr in changed)
			{
				this.trigger('change:' + changedAttr, { model: this, changed: changed, changedAttributes: changed });
			}
			this.trigger('change', { model: this, changed: changed, changedAttributes: changed });
		}
	},

	unsetAll: function(silent)
	{
		var unset = [];

		for(var attr in this.attrs)
		{
			unset.push(attr);
		}

		this.unset(unset, silent);
	},

	/**
	 * Exports a JSON representation of model attributes. If an attribute is type of Object, tries to call a toJson
	 * method recursively.	This function returns a plain javascript object, not the stringified JSON.
	 *
	 * @param {Array.<string>} serializeAttrs Array of attribute names to be exported or all if omitted.
	 * @returns {Object} Plain JavaScript object representation of object's attributes
	 */
	toJson: function(serializeAttrs)
	{
		var obj = {};
		for(var key in this.attrs)
		{
			if((!serializeAttrs || kff.arrayIndexOf(serializeAttrs, key) !== -1) && this.attrs.hasOwnProperty(key))
			{
				if(this.attrs[key] && typeof this.attrs[key] === 'object' && 'toJson' in this.attrs[key]) obj[key] = this.attrs[key].toJson();
				else obj[key] = this.attrs[key];
			}
		}
		return obj;
	},

	/**
	 * Imports model's attributes from JSON (plain JavaScript object).
	 *
	 * If the attribute is type of Object, tries to read appropriate property using its fromJson method.
	 * This function returns plain object, not stringified JSON.
	 *
	 * @param {Object} obj Plain JS object to read attributes from
	 * @param {Boolean} silent If true, do not trigger event
	 */
	fromJson: function(obj, silent)
	{
		if(!obj) return;
		var attrs = {};
		for(var key in this.attrs)
		{
			if(this.attrs.hasOwnProperty(key) && obj.hasOwnProperty(key))
			{
				if(this.attrs[key] && typeof this.attrs[key] === 'object' && 'fromJson' in this.attrs[key]) this.attrs[key].fromJson(obj[key]);
				else this.attrs[key] = obj[key];
			}
		}
		this.set(this.attrs, silent);
	},

	/**
	 * Creates a new computed attribute.
	 *
	 * Computed attribute is like a normal attribute except its value is automatically recomputed each time the
	 * depending attributes change.
	 *
	 * @param  {String}   attr  A name of computed property
	 * @param  {Array}   attrs Array of attributes the computed attribute is depending on
	 * @param  {Function|String} fn    Function to be called when any of depending attributes changes. Arguments of this functin are depending attributes, returns a computed value.
	 */
	createComputed: function(attr, attrs, fn)
	{
		var computed, i, l;
		if(!this._computed) this._computed = [];

		computed = {
			args: [attr, attrs, fn],
			boundFn: this.f(function()
			{
				var vals = [];
				for(i = 0, l = attrs.length; i < l; i++)
				{
					vals[i] = this.get(attrs[i]);
				}
				this.set(attr, this.f(fn).apply(this, vals));
			})
		};

		this._computed.push(computed);

		for(i = 0, l = attrs.length; i < l; i++)
		{
			this.on('change:' + attrs[i], computed.boundFn);
		}

		computed.boundFn();
	},

	/**
	 * Iterates over model's attributes
	 * @param  {Function} fn Function to be called for each attribute. Arguments are (key, value).
	 */
	each: function(fn)
	{
		var key, attrs = this.attrs;
		for(key in attrs)
		{
			fn(key, attrs[key]);
		}
	}

});

(function()
{
	var createGetter = function(attr)
	{
		return function(value)
		{
			if(arguments.length === 0)	return this.get(attr);
			else return this.set(attr, value);
		};
	};

	kff.createModelClass = function(meta, properties)
	{
		if(arguments.length === 1)
		{
			properties = meta;
			meta = {};
		}

		if(!('extend' in meta)) meta.extend = kff.Model;

		var modelClass = kff.createClass(meta, properties);

		if('service' in modelClass && 'args' in modelClass.service)
		{
			var attrs = modelClass.service.args['0'];
			if(typeof attrs === 'object' && attrs !== null)
			{
				for(var attr in attrs)
				{
					if(!(attr in modelClass.prototype)) modelClass.prototype[attr] = createGetter(attr);
				}
			}
		}
		return modelClass;
	};

})();

kff.ModelPathWatcher = kff.createClass(
{
	mixins: kff.EventsMixin
},
{
	constructor: function(model, attrPath)
	{
		if(arguments.length === 1)
		{
			attrPath = model;
			model = null;
		}
		if(typeof attrPath === 'string') attrPath = attrPath.split('.');
		if(model === null)
		{
			model = window;
		}
		this.attr = attrPath.pop();
		this.rootModel = model;
		this.model = null;
		this.modelPathArray = attrPath;
		this.dynamicBindings = [];
	},

	init: function()
	{
		var model = this.rootModel,
			attr;

		this.dynamicBindings = [];

		for(var i = 0, l = this.modelPathArray.length; i < l; i++)
		{
			attr = this.modelPathArray[i];
			if(model instanceof kff.Model)
			{
				model.on('change:' + attr, this.f('rebindTimed'));
				this.dynamicBindings.push({ model: model, attr: attr });
				model = model.get(attr);
			}
			else if(model !== null && typeof model === 'object' && (attr in model)) model = model.attr;
			else model = null;
		}
		if(model instanceof kff.Model) this.model = model;
		else this.model = null;

		if(this.model instanceof kff.Model)
		{
			this.bindModel();
		}
	},

	destroy: function()
	{
		if(this.model instanceof kff.Model)
		{
			this.unbindModel();
		}

		if(this.dynamicBindings)
		{
			for(var i = 0, l = this.dynamicBindings.length; i < l; i++)
			{
				this.dynamicBindings[i].model.off('change:' + this.dynamicBindings[i].attr, this.f('rebindTimed'));
			}
			this.dynamicBindings = null;
		}
	},

	rebindTimed: function(event)
	{
		kff.setZeroTimeout(this.f('rebind'));
	},

	rebind: function(event)
	{
		this.destroy();
		this.init();
		this.modelChange();
	},

	bindModel: function()
	{
		this.model.on('change' + (this.attr === null ? '' : ':' + this.attr), this.f('modelChange'));
	},

	unbindModel: function()
	{
		this.model.off('change' + (this.attr === null ? '' : ':' + this.attr), this.f('modelChange'));
	},

	modelChange: function(event)
	{
		this.trigger('change' + (this.attr === null ? '' : ':' + this.attr), event);
	}

});


kff.ServiceContainer = kff.createClass(
{
	statics:
	{
		CONFIG_CONSTRUCTOR: 'construct',
		singleParamRegex: /^%[^%]+%$/g,
		multipleParamsRegex: /%([^%]+)%/g,
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
		this.config = config || { parameters: {}, services: {} };
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
	 * '%parameterName%' - resolves to reference to parameter parameterName
	 * '%someParameter% some %otherParameter% some more string' - resolves to string with 'inner parameters' resolved to strings as well
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
			else if(this.cachedParams[params] !== undefined) ret = this.cachedParams[params];
			else
			{
				if(params.search(kff.ServiceContainer.singleParamRegex) !== -1)
				{
					ret = config.parameters[params.slice(1, -1)];
				}
				else
				{
					ret = params.replace('%%', 'escpersign');
					ret = ret.replace(kff.ServiceContainer.multipleParamsRegex, function(match, p1)
					{
						if(config.parameters[p1]) return config.parameters[p1];
						else return '';
					});
					ret = ret.replace('escpersign', '%');
				}
				this.cachedParams[params] = ret;
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
	 * Registers a new parameters configuration
	 *
	 * @param  {Object} parameters Parameters configuration object
	 * @param  {Boolean} overwrite If parameter already exists, overwrite it with new config
	 */
	registerParameters: function(parameters, overwrite)
	{
		var parameter;
		for(parameter in parameters)
		{
			if(!this.config.parameters.hasOwnProperty(parameter) || overwrite)
			{
				this.config.parameters[parameter] = parameters[parameter];
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
		if(typeof serviceName === 'string')
		{
			var match = serviceName.match(kff.ServiceContainer.serviceNameRegex);
			if(match)
			{
				serviceName = match[0];
			}
		}
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





kff.View = kff.createClass(
{
	mixins: kff.EventsMixin,
	statics: {
		bindingRegex: /(?:([.a-zA-Z0-9*-]+))((?::[a-zA-Z0-9]+(?:\((?:[^()]*)\))?)*)/g,

		operatorsRegex: /:([a-zA-Z0-9]+)(?:\(([^()]*)\))?/g,

		commaSeparateRegex: /\s*,\s*/,

		modifierSeparateRegex: /([^{},\s]+)|({[a-zA-Z0-9,\[\]_\-\.\s@*]+})/g,

		leadingPeriodRegex: /^\./,

		trailingPeriodRegex: /\.$/,

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
	 * @param {Array} options.models Array of model instances to be used by the view
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
		this.eventTriggers = null;
		this.viewFactory = null;
		this.cachedRegions = null;
		this.pendingRefresh = false;

		this.initEvents();

		if(options.models)
		{
			this.models = options.models;
			options.models = null;
		}
		else this.models = {};

		if(options.helpers)
		{
			this.helpers = options.helpers;
			options.helpers = null;
		}
		else this.helpers = {};

		if(options.parentView)
		{
			this.setParentView(options.parentView);
		}

		if(options.events)
		{
			this.domEvents = options.events.slice();
		}
		else this.domEvents = [];

		if(options.modelEvents)
		{
			this.modelEvents = options.modelEvents.slice();
		}
		else this.modelEvents = [];

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
			this.processEventTriggers();
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

			var ret;

			if(this.run !== kff.noop) ret = this.run();
			this.runSubviews();

			this.delegateEvents();
			this.delegateModelEvents();
			if(this.dispatcher) this.dispatcher.on('refresh', this.f('requestRefreshAll'));

			if(typeof this.afterRender === 'function') this.afterRender();

			this.$element[0].setAttribute(kff.DATA_RENDERED_ATTR, true);

			this.refreshOwnBinders(true);

			return ret;
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
			this.collectionBinder.collection = this.getModel(this.collectionBinder.collectionPathArray);
			this.collectionBinder.refreshBoundViews();
			this.collectionBinder.refreshAll();
		}
		else
		{
			this.rebindModels();
			this.refreshOwnBinders();
			if(this.subviews !== null)
			{
				for(var i = 0, l = this.subviews.length; i < l; i++) this.subviews[i].refreshAll();
			}
		}
		this.pendingRefresh = false;
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

		var ret;
		this.$element[0].removeAttribute(kff.DATA_RENDERED_ATTR);
		this.undelegateEvents();
		this.undelegateModelEvents();
		this.destroySubviews();
		if(this.dispatcher) this.dispatcher.off('refresh', this.f('requestRefreshAll'));

		if(this.destroy !== kff.noop) ret = this.destroy();
		if(typeof this.afterDestroy === 'function') this.afterDestroy();

		this.subviewsStruct = null;
		this.explicitSubviewsStruct = null;
		this.subviews = null;
		this.eventTriggers = null;

		this.clearRegions(this.options.regions);

		return ret;
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
				subviewsStruct = this.subviewsStruct.concat(this.explicitSubviewsStruct);
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
			this.delegateEventTriggers();
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

			this.undelegateEvents(this.eventTriggers);

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
	getModel: function(modelPath)
	{
		var modelName, model;
		if(typeof modelPath === 'string') modelPath = modelPath.split('.');

		modelName = modelPath[0];
		modelPath = modelPath.slice(1);
		model = this.models[modelName];

		if(modelPath.length > 0)
		{
			if(model)
			{
				if(typeof model.mget === 'function') return model.mget(modelPath);
				else return kff.evalObjectPath(modelPath, model);
			}
			else return null;
		}
		else return model;
		return null;
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
	 * Adds events config to the internal events array.
	 *
	 * @private
	 * @param {Array} events Array of arrays of binding config
	 */
	addModelEvents: function(events)
	{
		if(!(events instanceof Array))
		{
			if(arguments.length === 3) this.modelEvents.push(Array.prototype.slice.apply(arguments));
			return;
		}
		else if(!(events[0] instanceof Array))
		{
			events = Array.prototype.slice.apply(arguments);
		}
		Array.prototype.push.apply(this.modelEvents, events);
	},

	/**
	 * Adds events config to the internal eventTriggers array.
	 *
	 * @private
	 * @param {Array} events Array of arrays of binding config
	 */
	addEventTriggers: function(events)
	{
		if(!this.eventTriggers) this.eventTriggers = [];
		Array.prototype.push.apply(this.eventTriggers, events);
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
	 * Delegates model events for this view, its binders and recursively for all subviews or boundviews
	 */
	delegateModelEventsAll: function()
	{
		if(this.collectionBinder)
		{
			this.collectionBinder.delegateModelEventsAll();
		}
		else
		{
			this.delegateModelEvents();
			if(this.subviews !== null)
			{
				for(var i = 0, l = this.subviews.length; i < l; i++) this.subviews[i].delegateModelEventsAll();
			}
		}
	},

	/**
	 * Undelegates model events for this view, its binders and recursively for all subviews or boundviews
	 */
	undelegateModelEventsAll: function()
	{
		if(this.collectionBinder)
		{
			this.collectionBinder.undelegateModelEventsAll();
		}
		else
		{
			this.undelegateModelEvents();
			if(this.subviews !== null)
			{
				for(var i = 0, l = this.subviews.length; i < l; i++) this.subviews[i].undelegateModelEventsAll();
			}
		}
	},


	/**
	 * Binds model events to the view. Accepts array of arrays in the form:
	 *
	 * [
	 *     ['modelName', 'eventType', 'methodName'],
	 * ]
	 *
	 * The first item is a name of the model.
	 * The second item is an event name
	 * The third item is the view method name (string) that acts as an event
	 * handler
	 *
	 * @param {Array} events Array of arrays of binding config
	 */
	delegateModelEvents: function(events)
	{
		var event, i, l, fn, model;
		this.undelegateModelEvents();
		events = events || this.modelEvents;

		for(i = 0, l = events.length; i < l; i++)
		{
			event = events[i];
			model = this.getModel(event[0]);
			if(event.length === 3 && model)
			{
				if(typeof event[2] === 'string') fn = this.f(event[2]);
				else fn = event[2];
				model.on(event[1], fn);
			}
		}
	},

	/**
	 * Unbinds model events from the view. Accepts array of arrays in the form:
	 *
	 * [
	 *     ['modelName', 'eventType', 'methodName']
	 * ]
	 *
	 * The first item is a name of the model. The second item is an event name
	 * The third item is the view method name (string) that acts as an event
	 * handler
	 *
	 * @param {Array} events Array of arrays of binding config
	 */
	undelegateModelEvents: function(events)
	{
		var event, i, l, fn, model;
		events = events || this.modelEvents;

		for(i = 0, l = events.length; i < l; i++)
		{
			event = events[i];
			model = this.getModel(event[0]);
			if(event.length === 3 && model)
			{
				if(typeof event[2] === 'string') fn = this.f(event[2]);
				else fn = event[2];
				model.off(event[1], fn);
			}
		}
	},

	delegateEventTriggers: function()
	{
		if(this.eventTriggers)
		{
			for(var i = 0, l = this.eventTriggers.length; i < l; i++)
			{
				this.eventTriggers[i][2] = this.f(function(){
					this.callTriggerMethod.apply(this, arguments);
				}, [this.eventTriggers[i][3]]);
			}
			this.delegateEvents(this.eventTriggers);
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
		options.parentView = this;
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
		var node, viewName, rendered, onAttr, optAttr, index = 0, subviewsStruct = null;

		if(el.hasChildNodes())
		{
			node = el.firstChild;
			while(node !== null)
			{
				viewName = null;
				if(node.nodeType === 1)
				{
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
						else
						{
							onAttr = node.getAttribute(kff.DATA_TRIGGER_ATTR);
							if(onAttr)
							{
								this.processChildEventTriggers(node, onAttr, index);
							}
						}
					}
					index++;
				}
				node = this.nextNode(el, node, viewName === null);
			}
		}
		return subviewsStruct;
	},

	/**
	 * Process declarative events bound throught data-kff-trigger attribute on root view element
	 *
	 * @private
	 */
	processEventTriggers: function()
	{
		this.processChildEventTriggers(this.$element[0]);
	},

	/**
	 * Process declarative events bound throught data-kff-trigger attribute on child element
	 * @private
	 * @param  {DOM Element} child  DOM Element
	 */
	processChildEventTriggers: function(child, onAttr, index)
	{
		var onAttrSplit, onAttrSplit2, events = [], i, l;
		onAttr = onAttr || child.getAttribute(kff.DATA_TRIGGER_ATTR);
		if(onAttr)
		{
			onAttrSplit = onAttr.split(/\s+/);
			for(i = 0, l = onAttrSplit.length; i < l; i++)
			{
				onAttrSplit2 = onAttrSplit[i].split(':');
				events.push([
					onAttrSplit2[0].replace('|', ' '),
					$(child),
					null,
					onAttrSplit2[1],
					index
				]);
			}
			this.addEventTriggers(events);
		}
	},

	/**
	 * Finds and calls a method registered as trigger handler.
	 *
	 * @private
	 * @param  {Function} fn Function to be called
	 */
	callTriggerMethod: function(fn)
	{
		if(typeof this[fn] === 'function')
		{
			this[fn].apply(this, Array.prototype.slice.call(arguments, 1));
		}

		else if(this.parentView)
		{
			this.parentView.callTriggerMethod.apply(this.parentView, arguments);
		}
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
	dispatchEvent: function(action, event)
	{
		var res, view = this;
		while(view)
		{
			if(view.dispatcher !== null && view.dispatcher.hasAction(action))
			{
				view.dispatcher.trigger(action, event);
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
		if(this.bindingIndex !== null && this.models.hasOwnProperty(modelName)) return this.bindingIndex;
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

		if(this.eventTriggers)
		{
			l = this.eventTriggers.length;
			clonedView.eventTriggers = new Array(l);
			while(l--)
			{
				clonedView.eventTriggers[l] = this.eventTriggers[l].slice();
			}
		}

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
				collectionPathArray: this.collectionBinder.collectionPathArray,
				nobind: this.collectionBinder.nobind
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
		var oldModels, oldHelpers, key, i, l;

		this.parentView = parentView;

		oldModels = this.models || null;

		this.models = kff.createObject(parentView.models);

		if(oldModels)
		{
			for(key in oldModels)
			{
				if(oldModels.hasOwnProperty(key))
				{
					this.models[key] = oldModels[key];
				}
			}
		}

		oldHelpers = this.helpers || null;

		this.helpers = kff.createObject(parentView.helpers);

		if(oldHelpers)
		{
			for(key in oldHelpers)
			{
				if(oldHelpers.hasOwnProperty(key))
				{
					this.helpers[key] = oldHelpers[key];
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
		var i, l, eventTriggersIndex = 0;

		this.$element = $(element);

		if(this.eventTriggers)
		{
			while(this.eventTriggers[eventTriggersIndex] && typeof this.eventTriggers[eventTriggersIndex][4] === 'undefined')
			{
				this.eventTriggers[eventTriggersIndex][1] = this.$element;
				eventTriggersIndex++;
			}
		}

		this.rebindSubViews(element, {
			subviewIndex: 0,
			subviewsStructIndex: 0,
			eventTriggersIndex: eventTriggersIndex,
			index: 0
		});

		if(this.modelBindersMap)
		{
			this.modelBindersMap.setView(this);
		}

		if(this.collectionBinder)
		{
			this.collectionBinder.collection = this.getModel(this.collectionBinder.collectionPathArray);
			this.collectionBinder.view = this;
		}

	},

	rebindSubViews: function(el, ids)
	{
		var node, doSubviews;
		if(this.subviewsStruct !== null)
		{
			if(this.subviews === null) this.subviews = [];
			if(el.hasChildNodes())
			{
				node = el.firstChild;

				while(node !== null)
				{
					if(node.nodeType === 1)
					{
						if(this.subviewsStruct[ids.subviewIndex])
						{
							ids.subviewsStructIndex = this.subviewsStruct[ids.subviewIndex].index;
							if(ids.index === ids.subviewsStructIndex)
							{
								if(this.subviews[ids.subviewIndex])
								{
									this.subviews[ids.subviewIndex].rebindElement(node);
								}
								ids.subviewIndex++;
								doSubviews = false;
							}
							else doSubviews = true;
						}
						else
						{
							if(!this.eventTriggers) this.eventTriggers = [];
							while(this.eventTriggers[ids.eventTriggersIndex] && this.eventTriggers[ids.eventTriggersIndex][4] === ids.index)
							{
								this.eventTriggers[ids.eventTriggersIndex][1] = $(node);
								ids.eventTriggersIndex++;
							}
						}
						ids.index++;
					}
					node = this.nextNode(el, node, doSubviews);
				}
			}
		}
	},

	nextNode: function(root, node, deep)
	{
		var parentNode, nextSibling;
		if(deep && node.hasChildNodes())
		{
			node = node.firstChild;
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
					saveRegion(regions, this.cachedRegions, this.$docElement[0].querySelectorAll(selector), selector);
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
					unsaveRegion(regions, this.cachedRegions, this.$docElement[0].querySelectorAll(selector), selector);
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
		var model, attr, result, result2, modelPathArray, i, ret;
		var dataBindAttr = this.$element[0].getAttribute(kff.DATA_BIND_ATTR);
		var modelName, isCollectionBinder;

		var bindingRegex = kff.View.bindingRegex;
		var leadingPeriodRegex = kff.View.leadingPeriodRegex;
		var trailingPeriodRegex = kff.View.trailingPeriodRegex;

		bindingRegex.lastIndex = 0;

		this.modelBindersMap = new kff.BinderMap();

		while((result = bindingRegex.exec(dataBindAttr)) !== null)
		{
			modelPathArray = result[1].replace(leadingPeriodRegex, '*.').replace(trailingPeriodRegex, '.*').split('.');

			model = this.getModel(modelPathArray);
			ret = null;

			isCollectionBinder = model instanceof kff.Collection;

			if(!isCollectionBinder)
			{
				ret = this.parseBindingRegexp(result, true);

				if(ret.binderName === 'list' || ret.binderName === 'each' && model instanceof Array)
				{
					isCollectionBinder = true;
				}
				else
				{
					if(!ret.binderName || !(ret.binderName in kff.View.binders)) break;


					if(modelPathArray.length > 1) attr = modelPathArray.pop();
					else attr = null;

					if(attr === '*') attr = null;

					modelName = modelPathArray.length > 0 ? modelPathArray[0] : null;
					model = this.getModel(modelPathArray);

					// Special binding for collection count property
					if(model instanceof kff.Collection && attr === 'count')
					{
						if(!this.collectionCountBinder) this.collectionCountBinder = new kff.CollectionCountBinder();
						model = this.collectionCountBinder.bindCollectionCount(model);
					}
					var indexed = false;

					for(var j = ret.formatters.length - 1; j >= 0; j--)
					{
						if(ret.formatters[j].fn.indexed === true) indexed = true;
					}

					var modelBinder = new kff.View.binders[ret.binderName]({
						view: this,
						$element: this.$element,
						params: ret.binderParams,
						attr: attr,
						model: model,
						modelName: modelName,
						modelPathArray: modelPathArray,
						formatters: ret.formatters,
						parsers: ret.parsers,
						setter: (ret.setters && ret.setters.length > 0) ? ret.setters[0] : null,
						getter: (ret.getters && ret.getters.length > 0) ? ret.getters[0] : null,
						dispatch: ret.dispatch,
						eventNames: ret.eventNames,
						eventFilters: ret.eventFilters,
						fill: ret.fill,
						nobind: ret.nobind,
						nopreventdef: ret.nopreventdef,
						watchModelPath: ret.watchModelPath,
						indexed: indexed
					});

					this.modelBindersMap.add(modelBinder);
				}
			}

			if(isCollectionBinder)
			{
				if(!ret) ret = this.parseBindingRegexp(result, false);
				else ret.nobind = true;

				if(!this.options.isBoundView)
				{
					this.collectionBinder = new kff.CollectionBinder({
						view: this,
						collection: model,
						collectionPathArray: modelPathArray,
						nobind: ret.nobind
					});
					if(ret.itemAliases && ret.itemAliases.length > 0)
					{
						this.itemAlias = ret.itemAliases[0];
					}
					// this.boundViews = [];
				}
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
		var modifierSeparateRegex = kff.View.modifierSeparateRegex;
		var commaSeparateRegex = kff.View.commaSeparateRegex;
		var operatorsRegex = kff.View.operatorsRegex;
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
			nobind: false,
			watchModelPath: false,
			nopreventdef: false,
			itemAliases: []
		};

		i = 0;
		while((result2 = operatorsRegex.exec(result[2])) !== null)
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
					case 'set':
						this.parseGetters(modifierParams, ret.setters);
						break;
					case 'get':
						this.parseGetters(modifierParams, ret.getters);
						break;
					case 'evf':
						this.parseHelpers(modifierParams, ret.eventFilters);
						break;
					case 'dispatch':
						ret.dispatch = [];
						this.parseSetters(modifierParams, ret.dispatch);
						break;
					case 'fill':
						ret.fill = true;
						break;
					case 'watch':
						ret.watchModelPath = true;
						break;
					case 'nobind':
						ret.nobind = true;
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
			if(this.helpers[modifierParam]) modifiers.push({ fn: this.helpers[modifierParam], args: modifierArgs });
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
		if(this.collectionCountBinder)
		{
			this.collectionCountBinder.destroy();
			this.collectionCountBinder = null;
		}
	},

	/**
	 * Rebinds models of all binders that belong to this view
	 *
	 * @private
	 */
	rebindModels: function()
	{
		if(this.modelBindersMap) this.modelBindersMap.rebindModels();
	},

	/**
	 * Refreshes own data-binders
	 *
	 * @private
	 */
	refreshOwnBinders: function(force)
	{
		if(this.modelBindersMap) this.modelBindersMap.refreshBinders(force);
	},

	getBoundModelPathArray: function(modelPathArray)
	{
		var rootModelPathArray = [];
		var modelName = modelPathArray[0];
		var view = this;
		var collectionBinder;

		while(view)
		{
			if(view.models.hasOwnProperty(modelName))
			{
				rootModelPathArray = modelPathArray.concat(rootModelPathArray);
				if(view.options.isBoundView)
				{
					if(modelName === '*' || modelName === view.itemAlias)
					{
						collectionBinder =  view.parentView.collectionBinder;
						rootModelPathArray[0] = collectionBinder.getCollectionIndex(view.models[modelName]);

						modelPathArray = collectionBinder.collectionPathArray;
						modelName = modelPathArray[0];
						view = view.parentView;
					}
				}
			}
			view = view.parentView;
		}

		return rootModelPathArray;
	}


});


kff.PageView = kff.createClass(
{
	extend: kff.View,
	mixins: kff.EventsMixin,
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
	},

	/**
	 * Sets a new state of the view. Called by the front controller.
	 *
	 * @param {Object} state The state object (POJO)
	 */
	setState: function(state)
	{
		this.trigger('setState', state);
	},

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
	 * Runs the view (i.e. binds events and models). It will be called automatically. Should not be called
	 * directly.
	 */
	runAll: function()
	{
		if(kff.View.prototype.runAll.call(this) !== false)
		{
			this.trigger('render');
		}
	},

	/**
	 * Destroys the view (destroys all subviews and unbinds previously bound DOM events.
	 * It will be called automatically. Should not be called directly.
	 *
	 * @param {Boolean} silent If true, the 'destroy' event won't be called
	 */
	destroyAll: function()
	{
		var ret = kff.View.prototype.destroyAll.call(this);

		if(ret !== false)
		{
			this.trigger('destroy');
		}
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
			b.model = view.getModel(b.options.modelPathArray);
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
	rebindModels: function()
	{
		for(var i = 0, l = this.binders.length; i < l; i++) this.binders[i].rebindModel();
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


kff.BindingView = kff.View;


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
		this.model = options.model;
		this.setter = options.setter;
		this.getter = options.getter;
		this.dispatch = options.dispatch;
		this.currentValue = null;
		this.bindingIndex = null;
		this.dynamicBindings = null;
		this.value = null;
		this.modelPathWatcher = null;
	},

	/**
	 * Initializes the binder, binds DOM or model events if needed and optionally fetches data from DOM
	 */
	init: function()
	{
		if(!this.options.nobind)
		{
			if(this.options.watchModelPath)
			{
				var rootModel = this.view.models[this.options.modelPathArray[0]];
				var modelPathArray = this.options.modelPathArray.slice(1);
				modelPathArray.push(this.options.attr);
				this.modelPathWatcher = new kff.ModelPathWatcher(rootModel, modelPathArray);
				this.modelPathWatcher.init();
				this.bindModelPathWatcher();
				if(this.$element && this.options.events !== null) this.delegateEvents(this.options.events);
			}
			else if(this.model instanceof kff.Model)
			{
				this.bindModel();
			}
			if(this.$element && this.options.events !== null) this.delegateEvents(this.options.events);
		}
		if(this.options.fill && this.model instanceof kff.Model) this.fill();
	},

	/**
	 * Destroys the binder, unbinds any events or model watchers
	 */
	destroy: function()
	{
		if(this.model instanceof kff.Model) this.unbindModel();
		if(this.options.watchModelPath) this.unbindModelPathWatcher();
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
		var modelValue;
		if(this.modelPathWatcher)
		{
			this.model = this.modelPathWatcher.model;
		}
		if(this.model instanceof kff.Model || (typeof this.model === 'object' && this.model !== null))
		{
			if(this.getter && typeof this.model[this.getter.fn] === 'function')
			{
				if(this.getter.args.length > 0)
				{
					var args = [];
					for(var i = 0, l = this.getter.args.length; i < l; i++)
					{
						if(this.getter.args[i] === '@attr') args[i] = this.options.attr;
						else args[i] = this.view.getModel(this.getter.args[i]);
					}
					modelValue = this.model[this.getter.fn].apply(this.model, args);
				}
				else
				{
					modelValue = this.model[this.getter.fn](this.options.attr);
				}
			}
			else if(event) modelValue = event.changed[this.options.attr];
			else if(typeof this.options.attr === 'string')
			{
				if(typeof this.model.get === 'function') modelValue = this.model.get(this.options.attr);
				else modelValue = this.model[this.options.attr];
			}
			else modelValue = null;
		}
		else if(typeof this.model === 'string' || typeof this.model === 'number' || typeof this.model === 'boolean')
		{
			modelValue = this.model;
		}
		if(modelValue !== 'undefined')
		{
			if(force || !this.compareValues(modelValue, this.currentValue))
			{
				this.value = this.format(modelValue);
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
	 * Compare if two arrays are of the same length and contain the same values compared by the strict equal operator
	 *
	 * @param  {Array} value1 Array 1
	 * @param  {Array} value2 Array 2
	 * @return {boolean}      Result of comparsion
	 */
	compareArrayValues: function(value1, value2)
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

		if(this.dispatch)
		{
			var action = 'set';
			var params = [];
			if(this.dispatch.length > 0)
			{
				action = this.dispatch[0];
				for(i = 1, l = this.dispatch.length; i < l; i++)
				{
					if(this.dispatch[i].charAt(0) === '@') params.push(this.view.getModel(this.dispatch[i].slice(1)));
					else
					{
						if(this.options.parsers.length === 0) params.push(this.convertValueType(this.dispatch[i]));
						else params.push(this.parse(this.dispatch[i]));
					}
				}

			}

			var rootModelPathArray = this.view.getBoundModelPathArray(this.options.modelPathArray);
			var rootModel = this.view.models[rootModelPathArray.shift()];
			if(this.options.attr) rootModelPathArray.push(this.options.attr);
			this.view.dispatchEvent(action, {
				model: rootModel,
				keyPath: rootModelPathArray,
				value: value,
				domEvent: event,
				params: params
			});
		}
		else if(typeof this.model === 'object' && this.model !== null)
		{
			if(this.setter && typeof this.model[this.setter.fn] === 'function')
			{
				if(this.setter.args.length > 0)
				{
					var args = [];
					for(i = 0, l = this.setter.args.length; i < l; i++)
					{
						if(this.setter.args[i] === '@val') args[i] = this.currentValue;
						else if(this.setter.args[i] === '@attr') args[i] = this.options.attr;
						else args[i] = this.view.getModel(this.setter.args[i]);
					}
					this.model[this.setter.fn].apply(this.model, args);
				}
				else if(this.options.attr === null)
				{
					this.model[this.setter.fn](this.currentValue);
				}
				else
				{
					this.model[this.setter.fn](this.options.attr, this.currentValue);
				}
			}
			else if(typeof this.model.set === 'function') this.model.set(this.options.attr, this.currentValue);
		}
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
				for(j = 0, k = value.length; j < k; j++) value2[j] = this.options.formatters[i].fn.apply(this, [value[j]].concat(this.options.formatters[i].args));
				value = value2;
			}
			else value = this.options.formatters[i].fn.apply(this, [value].concat(this.options.formatters[i].args));
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
				for(j = 0, k = value.length; j < k; j++) value2[j] = this.options.parsers[i].fn.apply(this, [value[j]].concat(this.options.parsers[i].args));
				value = value2;
			}
			else value = this.options.parsers[i].fn.apply(this, [value].concat(this.options.parsers[i].args));
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
	 * Binds event listeners to the model
	 */
	bindModel: function()
	{
		if(this.model instanceof kff.Model) this.model.on('change' + (this.options.attr === null ? '' : ':' + this.options.attr), this.f('modelChange'));
	},

	/**
	 * Unbinds event listeners from the model
	 */
	unbindModel: function()
	{
		if(this.model instanceof kff.Model) this.model.off('change' + (this.options.attr === null ? '' : ':' + this.options.attr), this.f('modelChange'));
	},

	/**
	 * Sets up the model path watcher on the model. The model path watcher binds listeners to every model in model
	 * keypath and rebinds them on a change of any intermediate model so that model is always up to date.
	 *
	 * @private
	 */
	bindModelPathWatcher: function()
	{
		this.modelPathWatcher.on('change' + (this.options.attr === null ? '' : ':' + this.options.attr), this.f('modelChange'));
	},

	/**
	 * Unbinds any listeners previously bound by bindModelPathWatcher
	 *
	 * @private
	 */
	unbindModelPathWatcher: function()
	{
		this.modelPathWatcher.off('change' + (this.options.attr === null ? '' : ':' + this.options.attr), this.f('modelChange'));
	},

	/**
	 * Rebinds model event listeners for the actual model retrieved by model keypath.
	 *
	 * @private
	 */
	rebindModel: function()
	{
		if(!this.options.nobind)
		{
			this.unbindModel();
		}
		this.model = this.view.getModel(this.options.modelPathArray);
		if(!this.options.nobind)
		{
			this.bindModel();
		}
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
	}
});


kff.CollectionCountBinder = kff.createClass(
/** @lends kff.CollectionCountBinder.prototype */
{
	/**
	 * @constructs
	 */
	constructor: function()
	{
		this.boundCollectionCounts = [];
	},

	/**
	 * Special binding for Collection count property which is not bindable in a standard way.
	 * Creates a proxy model object that observes the collection for a change event and mirrors the
	 * count property of collection in the count attribute of the proxy model.
	 *
	 * @param {kff.Collection} collection The collection to be observed
	 */
	bindCollectionCount: function(collection)
	{
		var model = new kff.Model();
		var handler = function(){
			model.set('count', collection.count());
		};

		handler();

		this.boundCollectionCounts.push({
			collection: collection,
			handler: handler
		});
		collection.on('change', handler);
		return model;
	},

	/**
	 * Destroys all collection count bindings previously created by the bindCollectionCount method
	 */
	destroy: function()
	{
		if(this.boundCollectionCounts)
		{
			for(var i = 0, l = this.boundCollectionCounts.length; i < l; i++)
			{
				this.boundCollectionCounts[i].collection.off('change', this.boundCollectionCounts[i].handler);
			}
		}
		this.boundCollectionCounts = [];
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
		this.collection = options.collection || null;
		this.collectionPathArray = options.collectionPathArray;
		this.view = options.view;
		this.nobind = options.nobind;
		this.$elementTemplate = null;
		this.collectionCounter = null;
		this.boundViews = null;
		this.anchor = null;
		this.viewTemplate = null;
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
		this.initCollectionCounter();

		this.boundViewOptions = opt ? JSON.parse(opt) : {};
		this.boundViewOptions.parentView = this.view;
		this.boundViewOptions.viewFactory = this.view.viewFactory;
		this.boundViewOptions.env = this.view.env;
		this.boundViewOptions.isBoundView = true;

		if(this.nobind === false && this.collection instanceof kff.Collection)
		{
			this.collection.on('change', this.f('refreshBoundViews'));
			if(this.collectionFilter || this.collectionSorter) this.collection.onEach('change', this.f('collectionItemChange'));
		}

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

		if(this.nobind === false)
		{
			this.collection.off('change', this.f('refreshBoundViews'));
			if(this.collectionFilter || this.collectionSorter) this.collection.offEach('change', this.f('collectionItemChange'));
		}

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
		if(this.collectionSorter) this.refreshBoundViewsAll();
		else
		{
			switch(event ? event.type : null)
			{
				case 'append':
					this.refreshBoundViewsOnAppend(event);
					break;
				case 'remove':
					this.refreshBoundViewsOnRemove(event);
					break;
				default:
					this.refreshBoundViewsAll();
			}
		}
		if(this.collectionCounter) this.collectionCounter.model.set(this.collectionCounter.attr, this.boundViews ? this.boundViews.length : 0);
	},

	/**
	 * Event handler for collection item change
	 *
	 * @private
	 * @param  {mixed} event Model's event object
	 */
	collectionItemChange: function(event)
	{
		if(this.collectionSorter) this.refreshBoundViews();
		else
		{
			var render = this.filterCollectionItem(event.model);
			var index = this.filteredCollection.indexOf(event.model);
			if((index !== -1) !== render) this.refreshBoundViews();
		}
	},

	/**
	 * Accepts or rejects an item of filtered collection binding
	 *
	 * @private
	 * @param  {object} item  Item to filter
	 * @return {boolean}      True if the item matches filter, false otherwise
	 */
	filterCollectionItem: function(item)
	{
		if(this.collectionFilter)
		{
			var collectionFilter = this.collectionFilter;
			var filterModel = this.collectionFilter.model || null;
			var filterFnName = this.collectionFilter.fn;
			var currentFilterModel = filterModel || item;
			return !!currentFilterModel[filterFnName](item);
		}
		return true;
	},

	/**
	 * Updates bound views when collection changes by appending item.
	 *
	 * @private
	 * @param {Object} event An event triggered by collection change
	 */
	refreshBoundViewsOnAppend: function(event)
	{
		var item = event.item;

		if(this.filterCollectionItem(item))
		{
			if(this.collectionFilter)
			{
				if(!this.filteredCollection) this.filteredCollection = new kff.Collection();
				this.filteredCollection.append(item);
			}
			else this.filteredCollection = this.collection;

			var boundView = this.createBoundView(item);
			boundView.runAll();
			boundView.setBindingIndex(this.filteredCollection.count() - 1);
			boundView.refreshBinders(true);

			if(this.boundViews.length === 1)
			{
				if(this.anchor.parentNode)
				{
					this.anchor.parentNode.insertBefore(boundView.$element[0], this.anchor.nextSibling);
				}
			}
			else
			{
				var $lastElement = this.boundViews[this.boundViews.length - 2].$element;
				if($lastElement && $lastElement[0].parentNode)
				{
					$lastElement[0].parentNode.insertBefore(boundView.$element[0], $lastElement[0].nextSibling);
				}
			}
		}
	},

	/**
	 * Updates bound views when collection changes by removing item.
	 *
	 * @private
	 * @param {Object} event An event triggered by collection change
	 */
	refreshBoundViewsOnRemove: function(event)
	{
		var i, l;
		if(event.items !== undefined)
		{
			for(i = 0, l = event.items.length; i < l; i++)
			{
				this.refreshBoundViewsOnRemove(event.items[i]);
			}
		}
		else
		{
			if(this.collectionFilter)
			{
				var renderIndex = this.filteredCollection.indexOf(event.item);
				if(renderIndex !== -1) this.removeBoundViewAt(renderIndex);
				this.filteredCollection.splice(renderIndex, 1);
			}
			else
			{
				this.removeBoundViewAt(event.index);
			}
		}
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

		if(this.boundViews === null) this.boundViews = [];

		if(this.collectionFilter || this.collectionSorter)
		{
			if(this.collectionFilter)
			{
				this.filteredCollection = new kff.Collection();
				collectionFilter = this.collectionFilter;
				filterModel = this.collectionFilter.model || null;
				filterFnName = this.collectionFilter.fn;

				if(this.collection instanceof kff.Collection) a = this.collection.array;
				else if(this.collection instanceof Array) a = this.collection;
				for(i = 0, l = a.length; i < l; i++)
				{
					item = a[i];
					var currentFilterModel = filterModel || item;
					var render = !!currentFilterModel[filterFnName](item);

					if(render) this.filteredCollection.append(item);
				}
			}
			else
			{
				if(this.collection instanceof kff.Collection) this.filteredCollection = this.collection.clone();
				else
				{
					this.filteredCollection = new kff.Collection();
					this.filteredCollection.array = this.collection.slice();
				}
			}

			if(this.collectionSorter)
			{
				var sorterFn = this.collectionSorter.model.f(this.collectionSorter.fn);
				this.filteredCollection.sort(sorterFn);
			}
		}
		else
		{
			if(this.collection instanceof kff.Collection) this.filteredCollection = this.collection;
			else
			{
				this.filteredCollection = new kff.Collection();
				this.filteredCollection.array = this.collection;
			}
		}

		if(this.boundViews.length === 0)
		{
			// Fast initial rendering:
			l = this.filteredCollection.count();
			if(l > 0)
			{
				a = this.filteredCollection.array;
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
			var positions = new Array(this.filteredCollection.count());
			var toRemoveViews = [];
			var pos;
			var lastViewIndex = null;
			for(i = 0, l = this.boundViews.length; i < l; i++)
			{
				boundView = this.boundViews[i];
				item = boundView.models['*'];
				if(typeof(item) !== 'object') newIndex = -1;
				else newIndex = this.filteredCollection.indexOf(item);
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
				item = this.filteredCollection.get(i);
				if(!positions[i])
				{
					pos = toRemoveViews.shift();
					if(pos)
					{
						boundView = pos;
						boundView.undelegateModelEventsAll();
						boundView.models['*'] = item;
						if(this.view.itemAlias) boundView.models[this.view.itemAlias] = item;
						boundView.setBindingIndex(i);
						boundView.delegateModelEventsAll();
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
		var filterName = this.view.$element[0].getAttribute(kff.DATA_FILTER_ATTR);

		if(filterName)
		{
			this.collectionFilter =
			{
				model: null,
				fn: null
			};
			filterName = filterName.replace(/^\./, '').split('.');
			if(filterName.length === 1)
			{
				this.collectionFilter.fn = filterName[0];
			}
			else
			{
				this.collectionFilter.fn =  filterName.pop();
				this.collectionFilter.model =  this.view.getModel([].concat(filterName));
			}
		}
	},

	/**
	 * Inits sorting of collection
	 *
	 * @private
	 */
	initCollectionSorter: function()
	{
		var sorterName = this.view.$element[0].getAttribute(kff.DATA_SORT_ATTR);

		if(sorterName)
		{
			this.collectionSorter =
			{
				model: null,
				fn: null
			};
			sorterName = sorterName.replace(/^\./, '').split('.');
			if(sorterName.length === 1)
			{
				this.collectionSorter.fn = sorterName[0];
			}
			else
			{
				this.collectionSorter.fn =  sorterName.pop();
				this.collectionSorter.model =  this.view.getModel([].concat(sorterName));
			}
		}
		else this.collectionSorter = null;
	},

	/**
	 * Inits counting of collection
	 *
	 * @private
	 */
	initCollectionCounter: function()
	{
		var counterName = this.view.$element[0].getAttribute(kff.DATA_COUNT_ATTR);

		if(counterName)
		{
			this.collectionCounter =
			{
				model: null,
				attr: null
			};
			counterName = counterName.replace(/^\./, '').split('.');
			if(counterName.length >= 2)
			{
				this.collectionCounter.attr = counterName.pop();
				this.collectionCounter.model =  this.view.getModel(counterName);
			}
			else this.collectionCounter = null;
		}
		else this.collectionCounter = null;
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
	 * @param  {kff.Model} item Item for data-binding
	 * @param  {number} i 		Binding index
	 * @return {kff.View} 		created view
	 */
	createBoundView: function(item, i)
	{
		var boundView, $element;

		if(!this.viewTemplate)
		{
			$element = $(this.view.$element[0].cloneNode(true));

			this.boundViewOptions.element = $element[0];

			boundView = new this.view.constructor(this.boundViewOptions);

			boundView.collectionBinder = null;
			boundView.modelBindersMap = this.view.modelBindersMap.clone();
			if(i === undefined)
			{
				this.boundViews.push(boundView);
				i = this.boundViews.length - 1;
			}
			else
			{
				this.boundViews.splice(i, 0, boundView);
			}
			boundView.models['*'] = item;
			if(this.view.itemAlias) boundView.models[this.view.itemAlias] = item;

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

			if(i === undefined)
			{
				this.boundViews.push(boundView);
				i = this.boundViews.length - 1;
			}
			else
			{
				this.boundViews.splice(i, 0, boundView);
			}

			boundView.models['*'] = item;
			if(this.view.itemAlias) boundView.models[this.view.itemAlias] = item;

			boundView.setBindingIndex(i);
			boundView.rebindElement($element[0]);
		}

		$element[0].setAttribute(kff.DATA_RENDERED_ATTR, true);

		boundView.itemAlias = this.view.itemAlias;
		boundView.modelBindersMap.setView(boundView);

		return boundView;
	},

	delegateModelEventsAll: function()
	{
		if(this.boundViews !== null)
		{
			for(var i = 0, l = this.boundViews.length; i < l; i++) this.boundViews[i].delegateModelEventsAll();
		}
	},

	undelegateModelEventsAll: function()
	{
		if(this.boundViews !== null)
		{
			for(var i = 0, l = this.boundViews.length; i < l; i++) this.boundViews[i].undelegateModelEventsAll();
		}
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
		if(this.collection instanceof kff.Collection)
		{
			return this.collection.indexOf(item)
		}
		else if(this.collection instanceof Array)
		{
			return kff.arrayIndexOf(this.collection, item);
		}
		else return -1;
	}
});


kff.ModelView = kff.createClass({
	extend: kff.BindingView
},
{
	constructor: function(options)
	{
		kff.BindingView.call(this, options);
		this.models['*'] = new kff.Model();
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
			this.compareValues = this.compareArrayValues;
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
				if(this.params instanceof kff.Model)
				{
					var attrs = {};
					var unset = [];
					for(var key in params)
					{
						if(isNaN(parseFloat(key)) && params.hasOwnProperty(key))
						{
							attrs[key] = params[key];
						}
					}
					this.params.each(function(key, val)
					{
						if(!(key in attrs))
						{
							unset.push(key);
						}
					});

					attrs.unnamed = params.slice();

					this.params.unset(unset);
					this.params.set(attrs);
				}
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
		this.pendingRefresh = false;
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
			if(destroyQueue[i + 1]) destroyQueue[i].instance.on('destroy', kff.bindFn(destroyQueue[i + 1].instance, 'destroyAll'));
			else destroyQueue[i].instance.on('destroy', kff.bindFn(this, 'destroyDone'));
		}

		if(destroyQueue[0]) destroyQueue[0].instance.destroyAll();
		else this.destroyDone();
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
		var lastView = this.getLastView();
		this.viewsQueue.push(view);
		if(lastView)
		{
			lastView.instance.on('render', kff.bindFn(view.instance, 'init'));
			lastView.instance.on('setState', kff.bindFn(view.instance, 'setState'));
		}
	},

	/**
	 * Returns, destroys and removes last view from the queue
	 * @return {object} View metaobject
	 */
	popView: function()
	{
		if(this.viewsQueue.length === 0) return;

		var removedView = this.viewsQueue.pop(),
			lastView = this.getLastView();

		removedView.instance.off('render', kff.bindFn(this, 'cascadeState'));
		if(lastView)
		{
			lastView.instance.off('render', kff.bindFn(removedView.instance, 'init'));
			lastView.instance.off('setState', kff.bindFn(removedView.instance, 'setState'));
		}
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
			if(destroyQueue[i + 1]) destroyQueue[i].instance.on('destroy', kff.bindFn(destroyQueue[i + 1].instance, 'destroyAll'));
			else destroyQueue[i].instance.on('destroy', kff.bindFn(this, 'startInit'));
		}

		if(destroyQueue[0]) destroyQueue[0].instance.destroyAll();
		else this.startInit();

		if(this.dispatcher)
		{
			this.dispatcher.trigger('route', {
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
		if(this.getLastView()) this.getLastView().instance.on('render', kff.bindFn(this, 'cascadeState'));
		if(this.viewsQueue[from]) this.viewsQueue[from].instance.init();
		else this.cascadeState();
	},

	findSharedView: function(c1, c2)
	{
		var i,
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

kff.Dispatcher = kff.createClass({
	mixins: kff.EventsMixin
},
{
	constructor: function(actions)
	{
		this.actions = {};
		this.registerActions(actions);
	},

	createCallback: function(fn)
	{
		var dispatcher = this;
		return function(event)
		{
			fn.call(null, event, dispatcher);
		};
	},

	registerActions: function(actions)
	{
		var callbacks;
		if(typeof actions === 'object')
		{
			for(var action in actions)
			{
				if(!(actions[action] instanceof Array)) callbacks = [actions[action]];
				else callbacks = actions[action];

				if(!(action in this.actions)) this.actions[action] = [];

				this.actions[action] = this.actions[action].concat(callbacks);

				for(var i = 0; i < callbacks.length; i++)
				{
					this.on(action, this.createCallback(callbacks[i]));
				}
			}
		}
	},

	hasAction: function(action)
	{
		return action in this.actions;
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
		var models, helpers, element, require, middlewares, dispatcher;
		this.options = options = options || {};
		models = options.models || {};
		helpers = options.helpers || {};
		element = options.element || null;
		require = options.require || kff.require;
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
						models: models,
						helpers: helpers
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
			}
		};

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
		if(this.options.dispatcher)
		{
			var dispatcher = this.serviceContainer.resolveParameters(this.options.dispatcher);
			if(dispatcher && typeof dispatcher.registerActions === 'function')
			{
				if(this.options.actions) dispatcher.registerActions(this.options.actions);
				frontController.setDispatcher(dispatcher);
			}
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



})(this);
