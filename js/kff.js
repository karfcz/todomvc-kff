/**
 * KFF Frontend Framework v2.0.0-alpha.1
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
						event.relatedTarget = event.fromElement || null;
						event.stopPropagation = function () { event.cancelBubble = true };
						event.relatedTarget = event.fromElement || null;
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
 * Binds function to an object.
 * Note that it adds a _boundFns property to the object which is an object
 * containing references to the bound methods for caching purposes.
 *
 * @param {Object} obj Object to which bind a function
 * @param {string} fnName Method name to bind
 */
kff.bindFn = function(obj, fnName, args)
{
	if(typeof obj[fnName] !== 'function') throw new TypeError("Expected function: " + fnName + ' (kff.bindFn)');
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
 * Evaluates object path recursively and returns last property in chain
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

kff.arrayIndexOf = function(array, item)
{
	for(var i = 0, l = array.length; i < l; i++)
	{
		if(array[i] === item) return i;
	}
	return -1;
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
{
	constructor: function(element)
	{
		this['0'] = element;
		this.handlers = null;
		this.$element = null;
	},

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

	matches: function(el, target, selector)
	{
		var elements = el.querySelectorAll(selector);
		return kff.arrayIndexOf(elements, target) !== -1;
	},

	html: function(html)
	{
		this['0'].innerHTML = html;
	},

	remove: function()
	{
		if(this['0'].parentNode)
		{
			this['0'].parentNode.removeChild(this['0']);
			this['0'] = null;
		}
	}
});

kff.$ = function(element)
{
	if(kff.useJquery && window.jQuery)
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
		@constructs
	*/
	constructor: function()
	{
		this.subscribers = {};
		this.oneSubscribers = {};
	},

	/**
		Binds event handler.

		@param {string|Array} eventType Event name(s)
		@param {function} fn Event handler
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
		Binds event handler that will be executed only once.

		@param {string|Array} eventType Event name(s)
		@param {function} fn Event handler
	*/
	one: function(eventType, fn)
	{
		if(!(eventType in this.oneSubscribers)) this.oneSubscribers[eventType] = [];
		this.oneSubscribers[eventType].push(fn);
		this.on(eventType, fn);
	},

	/**
		Unbinds event handler.

		@param {string|Array} eventType Event name(s)
		@param {function} fn Event handler
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
		Triggers an event.

		@param {string|Array} eventType Event name(s)
		@param {mixed} eventData Arbitrary data that will be passed to the event handlers as an argument
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
	// extend: kff.List,
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
		options = options || {};
		this.itemFactory = options.itemFactory || null;
		this.itemType = options.itemType || kff.Model;
		this.serializeAttrs = options.serializeAttrs || null;
		this.onEachEvents = [];
		this.initEvents();
		this.array = [];
		return this;
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
		this.empty();
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
	mixins: kff.EventsMixin
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

		this.subviewsStruct = null;
		this.explicitSubviewsStruct = null;
		this.subviews = null;
		this.eventTriggers = null;
		this.viewFactory = null;

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

		this.options = options;

		return this;
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
		var modelName;
		if(typeof modelPath === 'string') modelPath = modelPath.split('.');

		modelName = modelPath[0];
		modelPath = modelPath.slice(1);

		if(modelPath.length > 0)
		{
			if(this.models[modelName])
			{
				if(typeof this.models[modelName].mget === 'function') return this.models[modelName].mget(modelPath);
				else return kff.evalObjectPath(modelPath, this.models[modelName]);

			}
			else return null;
		}
		else return this.models[modelName];
		return null;
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
	 * Adds events config to the internal events array.
	 *
	 * @private
	 * @param {Array} events Array of arrays of binding config
	 */
	addEvents: function(events)
	{
		Array.prototype.push.apply(this.domEvents, events);
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
	 *
	 * @param {Boolean} silent If true, the 'render' event won't be called
	 */
	render: function(){},

	/**
	 * Renders the view. It will be called automatically. Should not be called
	 * directly.
	 *
	 * @param {Boolean} silent If true, the 'render' event won't be called
	 */
	run: function(){},

	/**
	 * Renders the view. It will be called automatically. Should not be called
	 * directly.
	 */
	renderAll: function()
	{
		if(!this.viewFactory) this.viewFactory = new kff.ViewFactory();
		this.explicitSubviewsStruct = null;
		this.render();
		this.renderSubviews();
		this.processEventTriggers();
	},

	/**
	 * Runs the view (i.e. binds events and models). It will be called automatically. Should not be called
	 * directly.
	 */
	runAll: function(silent)
	{
		var ret = this.run();
		this.runSubviews();

		this.delegateEvents();
		this.delegateModelEvents();

		if(typeof this.afterRender === 'function') this.afterRender();

		this.$element[0].setAttribute(kff.DATA_RENDERED_ATTR, true);

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
				options.element = subviewsStruct[i].$element;
				subView = this.createView(subviewsStruct[i].viewName, options);
				if(subView instanceof kff.View)
				{
					subView.renderAll();
				}
			}
		}
	},

	runSubviews: function()
	{
		this.delegateEventTriggers();
		if(this.subviews)
		{
			for(var i = 0, l = this.subviews.length; i < l; i++)
			{
				this.subviews[i].runAll();
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
	 * @param {jQuery} $element Element of the subview
	 * @param {String} viewName Name of the view
	 * @param {[type]} options  Options object for the subview constructor
	 */
	addSubview: function($element, viewName, options)
	{
		if(this.explicitSubviewsStruct === null) this.explicitSubviewsStruct = [];
		this.explicitSubviewsStruct.push({
			viewName: viewName,
			$element: $element,
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
							viewName = 'kff.BindingView';
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
	 * Destroys the view (destroys all subviews and unbinds previously bound DOM events.
	 * It will be called automatically. Should not be called directly.
	 *
	 * @param {Boolean} silent If true, the 'destroy' event won't be called
	 */
	destroy: function(){},

	/**
	 * Destroys the view (destroys all subviews and unbinds previously bound DOM events.
	 * It will be called automatically. Should not be called directly.
	 *
	 * @param {Boolean} silent If true, the 'destroy' event won't be called
	 */
	destroyAll: function(silent)
	{
		var ret;
		this.$element[0].removeAttribute(kff.DATA_RENDERED_ATTR);
		this.undelegateEvents();
		this.undelegateModelEvents();
		this.destroySubviews();

		ret = this.destroy();
		if(typeof this.afterDestroy === 'function') this.afterDestroy();

		this.subviewsStruct = null;
		this.explicitSubviewsStruct = null;
		this.subviews = null;
		this.eventTriggers = null;

		return ret;
	},

	/**
	 * Destroys the subviews. It will be called automatically. Should not be called directly.
	 */
	destroySubviews: function()
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
	 * Method for refreshing the view. Does nothing in this base class, it's intended to be overloaded in subclasses.
	 */
	refresh: function(){},

	/**
	 * Refreshes data-binders in all subviews.
	 *
	 * @param  {Object} event Any event object that caused refreshing
	 */
	refreshBinders: function(force)
	{
		if(this.subviews !== null)
		{
			for(var i = 0, l = this.subviews.length; i < l; i++) this.subviews[i].refreshBinders(force);
		}
	},

	refreshIndexedBinders: function()
	{
		if(this.subviews !== null)
		{
			for(var i = 0, l = this.subviews.length; i < l; i++) this.subviews[i].refreshIndexedBinders();
		}
	},

	refreshAll: function()
	{
		if(typeof this.refresh === 'function') this.refresh();
		if(this.subviews !== null)
		{
			for(var i = 0, l = this.subviews.length; i < l; i++) this.subviews[i].refreshAll();
		}
	},

	/**
	 * Returns index of item in bound collection (closest collection in the view scope)
	 *
	 * @return {number} Item index
	 */
	getBindingIndex: function(modelName)
	{
		if(this.parentView instanceof kff.View) return this.parentView.getBindingIndex(modelName);
		return null;
	},

	clone: function()
	{
		var l;
		var clonedSubview;
		var options = this.options;

		options.parentView = null;

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

		return clonedView;
	},

	setParentView: function(parentView)
	{
		var oldModels, oldHelpers, F, key, i, l;

		this.parentView = parentView;

		oldModels = this.models || null;

		this.models = kff.createObject(this.parentView.models);

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

		this.helpers = kff.createObject(this.parentView.helpers);

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
		if(deep && node.hasChildNodes())
		{
			node = node.firstChild;
		}
		else
		{
			while(node !== root && node.nextSibling === null && node.parentNode !== null)
			{
				node = node.parentNode;
			}
			if(node && node !== root) node = node.nextSibling;
			else node = null;
		}
		return node;
	}
});


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
		options.element = $(document.getElementsByTagName('body')[0]);
		return kff.View.call(this, options);
	},

	/**
	 * @see kff.View#delegateEvents
	 */
	delegateEvents: function(events, $element)
	{
		kff.PageView._super.delegateEvents.call(this, events, $element || $(document));
	},

	/**
	 * @see kff.View#undelegateEvents
	 */
	undelegateEvents: function(events, $element)
	{
		kff.PageView._super.undelegateEvents.call(this, events, $element || $(document));
	},

	/**
	 * Sets a new state of the view. Called by the front controller.
	 *
	 * @param {Object} state The state object (POJO)
	 */
	setState: function(state, silent)
	{
		if(!silent) this.trigger('setState', state);
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
	runAll: function(silent)
	{
		var ret = kff.View.prototype.runAll.call(this, silent);

		if(!((silent === true) || (ret === false)))
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
	destroyAll: function(silent)
	{
		var ret = kff.View.prototype.destroyAll.call(this, silent);

		if(!((silent === true) || (ret === false)))
		{
			this.trigger('destroy');
		}
	}

});


kff.BinderMap = kff.createClass(
{
	constructor: function()
	{
		this.binders = [];
	},

	add: function(binder)
	{
		this.binders.push(binder);
	},

	clone: function(options)
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

	initBinders: function()
	{
		for(var i = 0, l = this.binders.length; i < l; i++) this.binders[i].init();
	},

	destroyBinders: function()
	{
		for(var i = 0, l = this.binders.length; i < l; i++) this.binders[i].destroy();
	},

	refreshBinders: function(force)
	{
		for(var i = 0, l = this.binders.length; i < l; i++) this.binders[i].modelChange(null, force);
	},

	rebindModels: function(event)
	{
		for(var i = 0, l = this.binders.length; i < l; i++) this.binders[i].rebindModel();
	},

	refreshIndexedBinders: function()
	{
		for(var i = 0, l = this.binders.length; i < l; i++)
		{
			if(this.binders[i].isIndexed) this.binders[i].modelChange(null, true);
		}
	},

});


kff.BindingView = kff.createClass(
{
	extend: kff.View,
	statics:
	/** @lends kff.BindingView */
	{
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
			kff.BindingView.binders[alias] = binder;
		},

		/**
		 * Registers helper function to be used as parser/formatter
		 *
		 * @param {string} alias Name of helper function
		 * @param {function} helper Helper function
		 */
		registerHelper: function(alias, helper)
		{
			kff.BindingView.helpers[alias] = helper;
		}
	}
},
/** @lends kff.BindingView.prototype */
{
	/**
	 * Specialized View class for two-way data binding.
	 *
	 * @constructs
	 * @augments kff.View
	 */
	constructor: function(options)
	{
		this.modelBindersMap = null;
		this.collectionBinder = null;
		this.bindingIndex = null;
		this.itemAlias = null;
		this.boundViews = null;
		this.anchor = null;

		kff.View.call(this, options);
	},

	/**
	 * Renders the view and inits bindings.
	 *
	 * @param {Boolean} silent If true, does not trigger events
	 */
	renderAll: function(silent)
	{
		if(this.modelBindersMap === null) this.initBinding();
		if(!this.collectionBinder) kff.BindingView._super.renderAll.call(this, silent);
	},

	runAll: function()
	{
		if(this.collectionBinder)
		{
			this.runSubviews();
		}
		else
		{
			if(this.modelBindersMap !== null) this.modelBindersMap.initBinders();
			kff.BindingView._super.runAll.call(this);
			this.refreshOwnBinders(true);
		}
	},

	/**
	 * Destroys the view including bindings.
	 *
	 * @param {Boolean} silent If true, does not trigger events
	 */
	destroyAll: function(silent)
	{
		this.destroyBinding();
		this.destroyBoundViews();

		this.modelBindersMap = null;
		this.collectionBinder = null;
		this.bindingIndex = null;
		this.itemAlias = null;
		this.boundViews = null;

		kff.BindingView._super.destroyAll.call(this, true);
	},

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

		var bindingRegex = kff.BindingView.bindingRegex;
		var leadingPeriodRegex = kff.BindingView.leadingPeriodRegex;
		var trailingPeriodRegex = kff.BindingView.trailingPeriodRegex;

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

				if(ret.binderName === 'list' && model instanceof Array)
				{
					isCollectionBinder = true;
				}
				else
				{
					if(!ret.binderName || !(ret.binderName in kff.BindingView.binders)) break;


					if(modelPathArray.length > 1) attr = modelPathArray.pop();
					else attr = null;

					if(attr === '*') attr = null;

					modelName = modelPathArray.length > 0 ? modelPathArray[0] : null;
					model = this.getModel(modelPathArray);

					// Special binding for collection count property
					if(model instanceof kff.Collection)
					{
						if(attr === 'count') model = this.bindCollectionCount(model);
					}
					var indexed = false;

					for(var j = ret.formatters.length - 1; j >= 0; j--)
					{
						if(ret.formatters[j].fn.indexed === true) indexed = true;
					}

					var modelBinder = new kff.BindingView.binders[ret.binderName]({
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
						eventNames: ret.eventNames,
						eventFilters: ret.eventFilters,
						fill: ret.fill,
						nobind: ret.nobind,
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
					this.collectionBinder = {
						collection: model,
						collectionPathArray: modelPathArray,
						nobind: ret.nobind
					};
					if(ret.itemAliases && ret.itemAliases.length > 0)
					{
						this.itemAlias = ret.itemAliases[0];
					}
					this.boundViews = [];
				}
			}
		}
	},

	parseBindingRegexp: function(result, parseBinderName)
	{
		var result2, i, modifierName, modifierParams;
		var modifierSeparateRegex = kff.BindingView.modifierSeparateRegex;
		var commaSeparateRegex = kff.BindingView.commaSeparateRegex;
		var operatorsRegex = kff.BindingView.operatorsRegex;
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
			fill: false,
			nobind: false,
			watchModelPath: false,
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
					case 'fill':
						ret.fill = true;
						break;
					case 'watch':
						ret.watchModelPath = true;
						break;
					case 'nobind':
						ret.nobind = true;
						break;
				}
			}
			i++;
		}
		return ret;
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

		if(!this.boundCollectionCounts) this.boundCollectionCounts = [];
		this.boundCollectionCounts.push({
			collection: collection,
			handler: handler
		});
		collection.on('change', handler);
		return model;
	},

	/**
	 * Destroys all collectin count bindings previously created by the bindCollectionCount method
	 */
	destroyCollectionCountBindings: function()
	{
		if(this.boundCollectionCounts)
		{
			for(var i = 0, l = this.boundCollectionCounts.length; i < l; i++)
			{
				this.boundCollectionCounts[i].collection.off('change', this.boundCollectionCounts[i].handler);
			}
		}
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
			else if(kff.BindingView.helpers[modifierParam]) modifiers.push({ fn: kff.BindingView.helpers[modifierParam], args: modifierArgs });
		}
	},

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
		if(this.modelBindersMap !== null)
		{
			this.modelBindersMap.destroyBinders();
			this.modelBindersMap = null;
		}
		this.destroyCollectionCountBindings();
		this.collectionFilter = null;
		this.collectionSorter = null;
		this.collectionCounter = null;
	},

	/**
	 * Renders "bound" views.
	 * This method generates DOM elements corresponding to each item in the bound collection and
	 * creates the bindingView for each element. If the collection changes, it reflects those changes
	 * automatically in real time.
	 */
	renderBoundViews: function()
	{
		this.anchor = document.createTextNode('');
		var el = this.$element[0];

		if(el.parentNode)
		{
			el.parentNode.insertBefore(this.anchor, el.nextSibling);
			el.parentNode.removeChild(el);
		}

		this.boundViews = [];

		// Boundview options:
		this.boundViewName = this.$element[0].getAttribute(kff.DATA_VIEW_ATTR);
		var opt = this.$element[0].getAttribute(kff.DATA_OPTIONS_ATTR);

		this.initCollectionFilter();
		this.initCollectionSorter();
		this.initCollectionCounter();

		this.boundViewOptions = opt ? JSON.parse(opt) : {};
		this.boundViewOptions.parentView = this;
		this.boundViewOptions.viewFactory = this.viewFactory;
		this.boundViewOptions.isBoundView = true;

		if(this.collectionBinder.nobind === false && this.collectionBinder.collection instanceof kff.Collection)
		{
			this.collectionBinder.collection.on('change', this.f('refreshBoundViews'));
			if(this.collectionFilter || this.collectionSorter) this.collectionBinder.collection.onEach('change', this.f('collectionItemChange'));
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

		if(this.collectionBinder && this.collectionBinder.nobind === false)
		{
			this.collectionBinder.collection.off('change', this.f('refreshBoundViews'));
			if(this.collectionFilter || this.collectionSorter) this.collectionBinder.collection.offEach('change', this.f('collectionItemChange'));
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
				this.anchor.parentNode.insertBefore(this.$element[0], this.anchor.nextSibling);
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

	/**
	 * Updates bound views when collection changes.
	 *
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
				// case 'insert':
				// 	this.refreshBoundViewsOnInsert(event);
				// 	break;
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
			else this.filteredCollection = this.collectionBinder.collection;

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
	 * Updates bound views when collection changes by inserting item.
	 *
	 * @param {Object} event An event triggered by collection change
	 */
	// refreshBoundViewsOnInsert: function(event)
	// {
	// 	this.boundViewsMap.splice(event.index, 0, false);
	// 	this.collectionItemChange({ model: event.item });
	// },

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

				a = this.collectionBinder.collection.array;
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
				if(this.collectionBinder.collection instanceof kff.Collection) this.filteredCollection = this.collectionBinder.collection.clone();
				else
				{
					this.filteredCollection = new kff.Collection();
					this.filteredCollection.array = this.collectionBinder.collection.slice();
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
			if(this.collectionBinder.collection instanceof kff.Collection) this.filteredCollection = this.collectionBinder.collection;
			else
			{
				this.filteredCollection = new kff.Collection();
				this.filteredCollection.array = this.collectionBinder.collection;
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
			for(i = 0, l = this.boundViews.length; i < l; i++)
			{
				boundView = this.boundViews[i];
				newIndex = this.filteredCollection.indexOf(boundView.models['*']);
				pos = boundView;
				if(newIndex !== -1)
				{
					positions[newIndex] = pos;
					lastView = boundView;
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
						boundView.destroyAll();
						boundView.models['*'] = item;
						if(this.itemAlias) boundView.models[this.itemAlias] = item;
						boundView.setBindingIndex(i);
						boundView.renderAll();
						boundView.runAll();
						// boundView.refreshBinders(true);
					}
					else
					{
						boundView = this.createBoundView(item);
						boundView.setBindingIndex(i);
						boundView.runAll();
						// boundView.refreshBinders(true);
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
					parentNode.insertBefore(el, lastChild.nextSibling);
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
		var filterName = this.$element[0].getAttribute(kff.DATA_FILTER_ATTR);

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
				this.collectionFilter.model =  this.getModel([].concat(filterName));
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
		var sorterName = this.$element[0].getAttribute(kff.DATA_SORT_ATTR);

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
				this.collectionSorter.model =  this.getModel([].concat(sorterName));
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
		var counterName = this.$element[0].getAttribute(kff.DATA_COUNT_ATTR);

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
				this.collectionCounter.model =  this.getModel(counterName);
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
	 * @param  {kff.Model} item Item for data-binding
	 * @param  {number} i 		Binding index
	 * @return {kff.View} 		created view
	 */
	createBoundView: function(item, i)
	{
		var boundView, $element;

		if(!this.viewTemplate)
		{
			$element = $(this.$element[0].cloneNode(true));

			this.boundViewOptions.element = $element[0];
			this.boundViewOptions.parentView = this;
			this.boundViewOptions.viewFactory = this.viewFactory;
			this.boundViewOptions.isBoundView = true;
			this.boundViewOptions.models = { '*': item };

			if(this.itemAlias) this.boundViewOptions.models[this.itemAlias] = item;

			boundView = new this.constructor(this.boundViewOptions);

			boundView.collectionBinder = null;
			boundView.modelBindersMap = this.modelBindersMap.clone();
			if(i === undefined)
			{
				this.boundViews.push(boundView);
				i = this.boundViews.length - 1;
			}
			else
			{
				this.boundViews.splice(i, 0, boundView);
			}
			boundView.setBindingIndex(i);

			boundView.renderAll();

			this.viewTemplate = boundView.clone();
			this.$elementTemplate = $($element[0].cloneNode(true));
		}
		else
		{
			$element = $(this.$elementTemplate[0].cloneNode(true));
			boundView = this.viewTemplate.clone();
			boundView.setParentView(this.parentView);

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
			if(this.itemAlias) boundView.models[this.itemAlias] = item;

			boundView.setBindingIndex(i);
			boundView.rebindElement($element[0]);
		}

		$element[0].setAttribute(kff.DATA_RENDERED_ATTR, true);

		boundView.modelBindersMap.setView(boundView);

		return boundView;
	},

	refreshAll: function()
	{
		if(typeof this.refresh === 'function') this.refresh();
		this.rebindModels();
		if(this.collectionBinder)
		{
			this.collectionBinder.collection = this.getModel(this.collectionBinder.collectionPathArray);
			this.refreshBoundViews();
			for(var i = 0, l = this.boundViews.length; i < l; i++) this.boundViews[i].refreshAll();
		}
		else
		{
			this.refreshOwnBinders();
			kff.BindingView._super.refreshAll.call(this);
		}
	},

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

	/**
	 * Refreshes binders
	 *
	 * @private
	 */
	refreshBinders: function(force)
	{
		if(this.collectionBinder)
		{
			this.refreshBoundViews();
			for(var i = 0, l = this.boundViews.length; i < l; i++) this.boundViews[i].refreshBinders(force);
		}
		else
		{
			this.refreshOwnBinders(force);
			kff.BindingView._super.refreshBinders.call(this, force);
		}
	},

	refreshIndexedBinders: function()
	{
		if(this.collectionBinder)
		{
			for(var i = 0, l = this.boundViews.length; i < l; i++) this.boundViews[i].refreshIndexedBinders();
		}
		else
		{
			this.modelBindersMap.refreshIndexedBinders();
			kff.BindingView._super.refreshIndexedBinders.call(this);
		}
	},

	renderSubviews: function()
	{
		if(!this.collectionBinder) kff.BindingView._super.renderSubviews.call(this);
	},

	runSubviews: function()
	{
		if(this.collectionBinder)
		{
			this.renderBoundViews();
		}
		else kff.BindingView._super.runSubviews.call(this);
	},

	/**
	 * Destroys the subviews. It will be called automatically. Should not be called directly.
	 */
	destroySubviews: function()
	{
		if(this.collectionBinder)
		{
			this.destroyBoundViews();
		}
		else kff.BindingView._super.destroySubviews.call(this);
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

	clone: function()
	{
		var clonedView = kff.View.prototype.clone.call(this);

		if(this.collectionBinder)
		{
			clonedView.collectionBinder =
			{
				collection: null,
				collectionPathArray: this.collectionBinder.collectionPathArray,
				nobind: this.collectionBinder.nobind
			};
		}

		if(this.modelBindersMap)
		{
			clonedView.modelBindersMap = this.modelBindersMap.clone();
			clonedView.modelBindersMap.setView(clonedView);
			clonedView.boundViews = [];
		}
		clonedView.itemAlias = this.itemAlias;

		return clonedView;
	},

	rebindElement: function(element)
	{
		kff.BindingView._super.rebindElement.call(this, element);

		if(this.modelBindersMap !== null)
		{
			this.modelBindersMap.setView(this);
		}

		if(this.collectionBinder)
		{
			this.collectionBinder.collection = this.getModel(this.collectionBinder.collectionPathArray);
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
		this.model = options.model;
		this.setter = options.setter;
		this.getter = options.getter;
		this.currentValue = null;
		this.bindingIndex = null;
		this.dynamicBindings = null;
		this.value = null;
		this.modelPathWatcher = null;
	},

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
				if(this.$element && this.options.events !== null) this.delegateEvents(this.options.events);
			}
		}
		if(this.options.fill && this.model instanceof kff.Model) this.fill();
	},

	destroy: function()
	{
		if(this.model instanceof kff.Model) this.unbindModel();
		if(this.options.watchModelPath) this.unbindModelPathWatcher();
		if(this.$element && this.options.events !== null) this.undelegateEvents(this.options.events);
		this.currentValue = null;
		this.value = null;
	},

	delegateEvents: kff.View.prototype.delegateEvents,

	undelegateEvents: kff.View.prototype.undelegateEvents,

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

			if(force || !this.compareValues(modelValue, this.currentValue))
			{
				this.value = this.format(modelValue);
				this.currentValue = modelValue;
				this.refresh();
			}
		}
	},

	compareValues: function(value1, value2)
	{
		return value1 === value2;
	},

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

	getFormattedValue: function()
	{
		return this.value;
	},

	updateModel: function(value)
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
		else this.model.set(this.options.attr, this.currentValue);
	},

	refresh: function(value){},

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

	getBindingIndex: function(modelName)
	{
		modelName = modelName || this.options.modelName;
		return this.view.getBindingIndex(modelName);
	},

	clone: function()
	{
		return new this.constructor(this.options);
	},

	fill: function(){},

	bindModel: function()
	{
		if(this.model instanceof kff.Model) this.model.on('change' + (this.options.attr === null ? '' : ':' + this.options.attr), this.f('modelChange'));
	},

	unbindModel: function()
	{
		if(this.model instanceof kff.Model) this.model.off('change' + (this.options.attr === null ? '' : ':' + this.options.attr), this.f('modelChange'));
	},

	bindModelPathWatcher: function()
	{
		this.modelPathWatcher.on('change' + (this.options.attr === null ? '' : ':' + this.options.attr), this.f('modelChange'));
	},

	unbindModelPathWatcher: function()
	{
		this.modelPathWatcher.off('change' + (this.options.attr === null ? '' : ':' + this.options.attr), this.f('modelChange'));
	},

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

	isIndexed: function()
	{
		return this.options.indexed;
	},

	createFilterTriggerEvent: function(originalTriggerEvent, eventFilter)
	{
		return function(event)
		{
			return eventFilter.fn.apply(this, [originalTriggerEvent, event].concat(eventFilter.args));
		}
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
		this.userValue = this.options.params[0] || null;
		if(this.options.eventFilters && this.options.eventFilters[0])
		{
			this.triggerEvent = this.createFilterTriggerEvent(this.triggerEvent, this.options.eventFilters[0]);
		}
		kff.EventBinder._super.init.call(this);
	},

	triggerEvent: function(event)
	{
		event.preventDefault();
		this.updateModel(this.userValue);
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
		this.updateModel(this.$element[0].checked);
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


kff.ClassBinder = kff.createClass(
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
		this.equalsTo = this.options.params[1] || true;
		this.operator = this.options.params[2] || null;
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
		if(this.equalsTo)
		{
			var parsedValue = this.parse(this.equalsTo);
			var value = this.value;
			if(parsedValue == null) parsedValue = null;
			if(value == null) value = null;
			if(this.operator === 'ne') return value !== parsedValue;
			else return value === parsedValue;
		}
		else return this.value;
	}
});

if(typeof document === 'object' && document !== null)
{
	if(!('classList' in document.documentElement))
	{
		kff.ClassBinder.prototype.refresh = function(value)
		{
			if(this.className)
			{
				this.$element[this.matchValue() ? 'addClass' : 'removeClass'](this.className);
			}
		};
	}
}

kff.BindingView.registerBinder('class', kff.ClassBinder);


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
		this.updateModel(document.activeElement === this.$element[0]);
	},

	refresh: function()
	{
		if(this.value)
		{
			if(document.activeElement !== this.$element[0]) this.$element[0].focus();
		}
		else
		{
			if(document.activeElement === this.$element[0]) this.$element[0].blur();
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
			this.updateModel(this.$element[0].value);
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
		var eventNames = options.eventNames.length > 0 ? options.eventNames.join(' ') : 'keydown drop change';
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
			this.updateModel(this.getValue());
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


kff.InsertBinder = kff.createClass(
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
		this.equalsTo = this.options.params[0] || true;
		this.operator = this.options.params[1] || null;
		this.forceRerender = this.options.params[2] === 'force';

		this.isInserted = true;

		if(this.forceRerender)
		{
			this.isRun = false;
			this.isRendered = true;
			var noop = function(){};

			this.renderSubviews = this.view.renderSubviews;
			this.runSubviews = this.view.runSubviews;
			this.destroySubviews = this.view.destroySubviews;

			this.view.renderSubviews = noop;
			this.view.runSubviews = noop;
			this.view.destroySubviews = noop;
		}

		kff.InsertBinder._super.init.call(this);
	},

	refresh: function()
	{
		var parentNode;
		if(!this.anchor) this.anchor = document.createTextNode('');
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
		if(this.equalsTo)
		{
			if(this.operator === 'ne')	return this.value !== this.parse(this.equalsTo);
			else return this.value === this.parse(this.equalsTo);
		}
		else return this.value;
	}
});

kff.BindingView.registerBinder('insert', kff.InsertBinder);


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
				stateHandler: '@kff.HashStateHandler'
			}],
			shared: true
		}
	}
},
/** @lends kff.FrontController.prototype */
{
	/**
		@constructs
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
		this.stateHandler = options.stateHandler || null;
	},

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

	createViewFromState: function(state)
	{
		if(this.router && this.state)
		{
			var path = state.path;
			var result;

			if(path === '') path = '#';

			result = this.router.match(path);
			if(result)
			{
				state.params = result.params;
				return result.target;
			}
		}
		return this.defaultView;
	},

	getLastView: function()
	{
		if(this.viewsQueue.length > 0) return this.viewsQueue[this.viewsQueue.length - 1];
		else return null;
	},

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
	},

	startInit: function()
	{
		var i, l, view,
			precedingViewNames = this.getPrecedingViews(this.newViewName),
			from = 0;

		for(i = 0, l = precedingViewNames.length; i < l; i++)
		{
			if(i >= this.viewsQueue.length)
			{
				view = this.viewFactory.createView(precedingViewNames[i]);
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
	}
});


kff.App = kff.createClass(
/** @lends kff.App.prototype */
{
	/**
	 * Convenient class for basic application structure. Contains service
	 * container with preddefined services:
	 *
	 * - viewFactory
	 * - frontController
	 * - pageView
	 *
	 * @constructs
	 */
	constructor: function(options)
	{
		var models, helpers;
		this.options = options = options || {};
		models = options.models || {};
		helpers = options.helpers || {};

		// Dependency injection container configuration:
		var config = {
			parameters: {},
			services: {
				'kff.PageView': {
					args: [{
						models: models,
						helpers: helpers
					}]
				}
			}
		};

		this.serviceContainer = new kff.ServiceContainer(config);
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
		var frontController = this.serviceContainer.getService('kff.FrontController');
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
