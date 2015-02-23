'todomvc' in window || (window.todomvc = {});

todomvc.app = {
	filterBy: null,
	items: [],
	completed: null,
	active: null,
	newItemTitle: null,
};

function filterItem(item)
{
	var f = todomvc.app.filterBy;
	if(f === 'completed') return item.completed === true;
	else if(f === 'active') return item.completed !== true;
	return true;
}

function actionSet(event)
{
	event.cursor.set(event.value);
	return {
		name: 'refresh',
	};
}

function actionRemove(event)
{
	event.cursor.remove();
	return {
		name: 'refresh'
	};
}

todomvc.actionNewItem = function(event)
{
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

	return {
		name: 'update'
	};
};

todomvc.actionUpdate = function(event)
{
	var app = todomvc.app;
	var cursor = new kff.Cursor(app);

	cursor.refine(['completed']).set(app.items.filter(function(item){ return item.completed }).length);
	cursor.refine(['active']).set(app.items.length - app.completed);

	var es = new kff.EventStream();

	kff.setZeroTimeout(function(){
		es.trigger({ name: 'refresh' }).trigger({ name: 'save' }).end();
	});

	return es;
};

todomvc.actionRemoveIfEmpty = function(event)
{
	if(event.value == '')
	{
		return {
			name: 'removeAndUpdate',
			cursor: event.params[0],
			value: event.value
		};
	}
	else
	{
		return {
			name: 'setAndUpdate',
			cursor: event.cursor,
			value: event.value
		};
	}
};

todomvc.actionCheckAll = function(event)
{
	var itemsCursor = event.params[0];

	function mapItem(item){
		return item.completed === event.value ? item : kff.imset(['completed'], event.value, item);
	}

	itemsCursor.update(kff.map(mapItem));

	return {
		name: 'update'
	};
};

todomvc.actionClearCompleted = function(event)
{
	var filter = kff.curry(function(fn, obj)
	{
		return obj.filter(fn);
	});

	function filterUncompletedItem(item){
		return !item.completed;
	}

	event.cursor.update(filter(filterUncompletedItem));

	return {
		name: 'update'
	};
};

todomvc.actionRoute = function(app)
{
	var cursor = new kff.Cursor(app, ['filterBy']);
	return function(event)
	{
		cursor.set(event.state.params.filterBy);
		return {
			name: 'update'
		};
	}
};

todomvc.actionRoute.service = {
	type: 'factory',
	args: ['@todomvc.app']
};

todomvc.actionSave = function()
{
	window.localStorage.setItem('todos-kff-im', window.JSON.stringify(todomvc.app.items));
};

todomvc.actionLoad = function()
{
	var data = window.localStorage.getItem('todos-kff-im');
	if(data)
	{
		todomvc.app.items = window.JSON.parse(data);
	}
	return {
		name: 'update'
	};
};
