'todomvc' in window || (window.todomvc = {});


todomvc.app = {
	filterBy: null,
	items: [
		{
			title: 'První TODO',
			completed: false,
			editing: false
		},
		{
			title: 'Druhé TODO',
			completed: true,
			editing: false
		}
	],
	completed: null,
	active: null,
	newItemTitle: null,
	filter: function(item)
	{
		var f = todomvc.app.filterBy;
		if(f === 'completed') return item.completed === true;
		else if(f === 'active') return item.completed !== true;
		return true;
	}
};

todomvc.actionNewItem = function(event, dispatcher)
{
	if(event.keyPath instanceof Array && event.model && typeof event.model === 'object')
	{
		var propertyName = event.keyPath[0];
		var pathArray = event.keyPath.slice(1);
		var model = event.model;

		model.items = kfn.imset([], function(items){

			items.push({
				title: event.value,
				completed: false,
				editing: false
			});
			return items;

		}, model.items);
		dispatcher.trigger('update', model);
	}
};

todomvc.actionUpdate = function(app, dispatcher)
{
	app = todomvc.app;
	app.completed = app.items.filter(function(item){ return item.completed }).length;
	app.active = app.items.length - app.completed;
	dispatcher.trigger('refresh');
};

todomvc.actionRemoveIfEmpty = function(event, dispatcher)
{
		console.log('set val', event.value)
	if(event.value == '')
	{
		dispatcher.trigger('remove', {
			model: event.model,
			keyPath: event.keyPath.slice(0, -1),
			value: event.value
		});
	}
	else
	{
		dispatcher.trigger('set', {
			model: event.model,
			keyPath: event.keyPath,
			value: event.value
		});
	}
};

todomvc.actionCheckAll = function(event, dispatcher)
{
	todomvc.app.items = todomvc.app.items.map(function(item){
		if(item.completed !== event.value)
		{
			item = kfn.imclone(item);
			item.completed = event.value;
		}
		return item;
	});
	dispatcher.trigger('update');
};

todomvc.actionClearCompleted = function(event, dispatcher)
{
	todomvc.app.items = todomvc.app.items.filter(function(item){
		return !item.completed;
	});
	dispatcher.trigger('update');
};

todomvc.actionRoute = function(event, dispatcher)
{
	todomvc.app.filterBy = event.state.params.filterBy;
	dispatcher.trigger('update');
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
	dispatcher.trigger('update');
};


