(function( window ) {
	'use strict';

	var EVENT_UPDATE = { type: 'update' };
	var EVENT_REFRESH = { type: 'refresh' };

	var todoplurals = {
		items: {
			'1': 'item'
		}
	};

	var filterItem = kff.curry(function(filterByCursor, item) {
		var f = filterByCursor.get();
		if(f === 'completed') return item.completed === true;
		else if(f === 'active') return item.completed !== true;
		return true;
	});

	var actionSet = function(event) {
		event.cursor.set(event.value);
		return EVENT_REFRESH;
	};

	var actionRemove = function(event) {
		event.cursor.remove();
		return EVENT_REFRESH;
	};

	var actionNewItem = function(event) {
		var itemsCursor = event.params[0];
		if(event.value == '') return;

		itemsCursor.update(function(items){
			items.push({
				title: event.value,
				completed: false,
				editing: false
			});
			return items;
		});

		return EVENT_UPDATE;
	};

	var getIn = kff.curry(function(prop, o)
	{
		return o[prop];
	});

	var actionUpdate = kff.curry(function(itemsCursor, completedCursor, activeCursor, event) {
		var items = itemsCursor.get();
		completedCursor.set(items.filter(getIn('completed')).length);
		activeCursor.set(items.length - completedCursor.get());

		var es = new kff.EventStream();

		kff.setImmediate(function(){
			es.trigger({ type: 'refresh' }).trigger({ type: 'save' }).end();
		});

		return es;
	});

	var actionRemoveIfEmpty = function(event) {
		if(event.value == '')
		{
			return {
				type: 'removeAndUpdate',
				cursor: event.params[0],
				value: event.value
			};
		}
		else
		{
			return {
				type: 'setAndUpdate',
				cursor: event.cursor,
				value: event.value
			};
		}
	};

	var actionCheckAll = function(event) {
		var itemsCursor = event.params[0];

		var mapItem = function(item){
			return item.completed === event.value ? item : kff.imset(['completed'], event.value, item);
		}

		itemsCursor.update(kff.map(mapItem));
		return EVENT_UPDATE;
	};

	var filter = kff.curry(function(fn, obj) {
		return obj.filter(fn);
	});

	var filterUncompletedItem = function(item){
		return !item.completed;
	}

	var actionClearCompleted = function(event) {
		event.cursor.update(filter(filterUncompletedItem));
		return EVENT_UPDATE;
	};

	var actionRoute = kff.curry(function(filterCursor, event) {
		filterCursor.set(event.state.params.filterBy);
		return EVENT_UPDATE;
	});

	var actionSave = kff.curry(function(storage, itemsCursor) {
		storage.setItem('todos-kff-im', window.JSON.stringify(itemsCursor.get()));
	}, 3);

	var actionLoad = kff.curry(function(storage, itemsCursor) {
		var data = storage.getItem('todos-kff-im');
		if(data) itemsCursor.set(window.JSON.parse(data));
		return EVENT_UPDATE;
	}, 3);

	var trimStr = function(v) {
		return v.replace(/^\s+|\s+$/g, '');
	};

	var pluralize = kff.curry(function(plurals, v, term) {
		if(term in plurals) {
			if(v != null) {
				v = v.toString();
				if(v in plurals[term]) term = plurals[term][v];
			}
		}
		return term;
	});

	var blurOrEnter = function(fn, event) {
		if(event.type === 'blur' || event.keyCode === 13) fn.call(this, event);
	};

	var enterKey = function(fn, event) {
		if(event.keyCode === 13) fn.call(this, event);
	};

	var appState = {
		filterBy: null,
		items: [],
		completed: null,
		active: null,
		newItemTitle: null,
	};

	var appCursor = new kff.Cursor(appState);
	var itemsCursor = appCursor.refine('items');
	var filterByCursor = appCursor.refine('filterBy');
	var actionUpdatePre = actionUpdate(itemsCursor, appCursor.refine('completed'), appCursor.refine('active'));

	window.todoApp = new kff.App({
		router: {
			routes: {
				'#/:filterBy?': 'kff.PageView'
			}
		},
		scope: {
			app: appCursor,
			items: itemsCursor,
			filterItem: filterItem(filterByCursor),
			trim: trimStr,
			pluralize: pluralize(todoplurals),
			blurOrEnter: blurOrEnter,
			enterKey: enterKey
		},
		dispatcher: {
			actions: {
				set: actionSet,
				setAndUpdate: kff.compose(actionUpdatePre, actionSet),
				remove: actionRemove,
				removeAndUpdate: kff.compose(actionUpdatePre, actionRemove),
				newItem: actionNewItem,
				update: actionUpdatePre(),
				checkAll: actionCheckAll,
				clearCompleted: actionClearCompleted,
				save: actionSave(window.localStorage, itemsCursor),
				load: actionLoad(window.localStorage, itemsCursor),
				removeIfEmpty: actionRemoveIfEmpty,
				route: actionRoute(filterByCursor)
			}
		}
	});

	window.todoApp.init();
	window.todoApp.getServiceContainer().getService('kff.FrontController').dispatcher.trigger({ type: 'load' });

})( window );
