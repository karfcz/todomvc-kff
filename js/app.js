'todomvc' in window || (window.todomvc = {});

(function( window ) {
	'use strict';

	// Note that inserting todoApp and appModel objects to the window namespace
	// is only for benchmarking purpose...

	kff.define('actionSet', function()
	{
		return function(event)
		{
			if(event.keyPath instanceof Array && event.model && typeof event.model === 'object')
			{
				var propertyName = event.keyPath[0];
				var pathArray = event.keyPath.slice(1);
				var model = event.model;
				// console.log('event set', model, propertyName, pathArray, event.value)
				model[propertyName] = kfn.imset(pathArray, event.value, model[propertyName]);
				return {
					action: 'refresh',
					model: model
				};
			}
		};

	});
	// kff.actionSet = function(event)
	// {
	// 	if(event.keyPath instanceof Array && event.model && typeof event.model === 'object')
	// 	{
	// 		var propertyName = event.keyPath[0];
	// 		var pathArray = event.keyPath.slice(1);
	// 		var model = event.model;
	// 		// console.log('event set', model, propertyName, pathArray, event.value)
	// 		model[propertyName] = kfn.imset(pathArray, event.value, model[propertyName]);
	// 		return {
	// 			action: 'refresh',
	// 			model: model
	// 		};
	// 	}
	// };

	kff.actionRemove = function(event)
	{
		if(event.keyPath instanceof Array && event.model && typeof event.model === 'object')
		{
			// console.log('event remove', event)
			var propertyName = event.keyPath[0];
			var pathArray = event.keyPath.slice(1);
			var model = event.model;
			model[propertyName] = kfn.imremove(pathArray, model[propertyName]);
			return {
				action: 'refresh',
				model: model
			};
		}
	};

	window.todoApp = new kff.App({
		router: {
			routes: {
				'#/:filterBy?': 'kff.PageView'
			},
		},
		models: {
			app: '@todomvc.app'
		},
		helpers: todomvc.helpers,
		dispatcher: {
			actions: {
				set: '@actionSet',
				setAndUpdate: compose(todomvc.actionUpdate, kff.actionSet),
				remove: kff.actionRemove,
				removeAndUpdate: compose(todomvc.actionUpdate, kff.actionRemove),
				newItem: todomvc.actionNewItem,
				update: todomvc.actionUpdate,
				checkAll: todomvc.actionCheckAll,
				clearCompleted: todomvc.actionClearCompleted,
				save: todomvc.actionSave,
				load: todomvc.actionLoad,
				removeIfEmpty: todomvc.actionRemoveIfEmpty,
				route: '@todomvc.actionRoute'
			}
		}
	});

	window.appModel = todomvc.app;
	window.todoApp.init();

})( window );
