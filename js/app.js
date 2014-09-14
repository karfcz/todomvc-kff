'todomvc' in window || (window.todomvc = {});

(function( window ) {
	'use strict';

	// Note that inserting todoApp and appModel objects to the window namespace
	// is only for benchmarking purpose...

	window.todoApp = new kff.App({
		services: {
			'items': {
				construct: 'kff.Collection',
				args: [{
					itemFactory: '@@todomvc.Item',
					serializeAttrs: ['completed', 'title']
				}]
			}
		},
		router: {
			routes: {
				'#/:filterBy?': 'todomvc.MainView'
			},
			params: '@todomvc.State'
		},
		defaultView: 'todomvc.MainView'
	});

	window.appModel = window.todoApp.getServiceContainer().getService('todomvc.App');
	window.todoApp.init();

})( window );
