'todomvc' in window || (window.todomvc = {});

(function( window ) {
	'use strict';

	// Note that inserting todoApp and appModel objects to the window namespace
	// is only for benchmarking purpose...





	// kff.actionSet = function(event, dispatcher)
	// {
	// 	if(event.keyPath && event.keyPath instanceof Array && event.model)
	// 	{
	// 		var propertyName = event.keyPath[0];
	// 		var pathArray = event.keyPath.slice(0);
	// 		var model = event.model;
	// 		var value = function(val){ return event.value; };


	// 		model[propertyName] = kfn.imset(pathArray, event.value, model);

	// 		dispatcher.trigger('refresh');
	// 	}

	// };

	// kff.actionRemove = function(event, dispatcher)
	// {
	// 	if(event.keyPath && event.keyPath instanceof Array && event.model)
	// 	{
	// 		var propertyName = event.keyPath[0];
	// 		var pathArray = event.keyPath.slice(0);
	// 		var model = event.model;
	// 		model[propertyName] = kfn.imremove(pathArray, model[propertyName]);
	// 		dispatcher.trigger('refresh');
	// 	}
	// };

		kff.actionSet = function(event, dispatcher)
		{
			if(event.keyPath instanceof Array && event.model && typeof event.model === 'object')
			{
				var propertyName = event.keyPath[0];
				var pathArray = event.keyPath.slice(1);
				var model = event.model;
				console.log('event set', model, propertyName, pathArray, event.value)
		// console.log('dispatch!', pathArray, event.value, model)
				model[propertyName] = kfn.imset(pathArray, event.value, model[propertyName]);
				dispatcher.trigger('update', model);
			}
		};

		kff.actionRemove = function(event, dispatcher)
		{
			if(event.keyPath instanceof Array && event.model && typeof event.model === 'object')
			{
				console.log('event remove', event)
				var propertyName = event.keyPath[0];
				var pathArray = event.keyPath.slice(1);
				var model = event.model;
		// console.log('dispatch!', pathArray, model, propertyName)
				model[propertyName] = kfn.imremove(pathArray, model[propertyName]);
				dispatcher.trigger('update', model);
			}
		};

	window.todoApp = new kff.App({
		// services: {
		// 	'items': {
		// 		construct: 'kff.Collection',
		// 		args: [{
		// 			itemFactory: '@@todomvc.Item',
		// 			serializeAttrs: ['completed', 'title']
		// 		}]
		// 	}
		// },
		router: {
			routes: {
				'#/:filterBy?': 'todomvc.MainView'
			},
			// params: '@todomvc.State'
		},
		defaultView: 'todomvc.MainView',
		dispatcher: '@kff.Dispatcher',
		actions: {
			set: kff.actionSet,
			remove: kff.actionRemove,
			newItem: todomvc.actionNewItem,
			update: todomvc.actionUpdate,
			checkAll: todomvc.actionCheckAll,
			clearCompleted: todomvc.actionClearCompleted,
			save: todomvc.actionSave,
			load: todomvc.actionLoad,
			removeIfEmpty: todomvc.actionRemoveIfEmpty,
			route: todomvc.actionRoute
		}
	});

	window.appModel = todomvc.app;
	window.todoApp.init();
	console.log('disp', window.todoApp.getServiceContainer().getService('kff.FrontController'))


	// function deleteAsync(button)
	// {
	// }

	// setTimeout(function(){
	// 	var deleteButtons = document.querySelectorAll('.destroy');
 //        for (var i = 0; i < deleteButtons.length; i++)
 //        	(function(buttons, i)
 //        	{
	//         	setTimeout(function(){
	// 				buttons[i].click();
	//         	}, 0 * i);

 //        	})(deleteButtons, i);
	// }, 1000);

})( window );
