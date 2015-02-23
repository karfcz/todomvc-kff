'todomvc' in window || (window.todomvc = {});

(function( window ) {
	'use strict';

	// Note that inserting todoApp and appModel objects to the window namespace
	// is only for benchmarking purpose...

	window.todoApp = new kff.App({
		router: {
			routes: {
				'#/:filterBy?': 'kff.PageView'
			}
		},
		models: {
			app: new kff.Cursor(todomvc.app),
			items: new kff.Cursor(todomvc.app, ['items']),
			filterItem: filterItem
		},
		helpers: todomvc.helpers,
		dispatcher: {
			actions: {
				set: actionSet,
				setAndUpdate: kff.compose(todomvc.actionUpdate, actionSet),
				remove: actionRemove,
				removeAndUpdate: kff.compose(todomvc.actionUpdate, actionRemove),
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
	window.todoApp.getServiceContainer().getService('kff.FrontController').dispatcher.trigger({ name: 'load' });

})( window );
