'todomvc' in window || (window.todomvc = {});

var compose = function () {
  var fns = arguments;

  return function (result) {
    for (var i = fns.length - 1; i > -1; i--) {
      result = fns[i].call(this, result);
    }

    return result;
  };
};



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
	},
	filterItems: function(items, filterBy)
	{
		console.log(arguments);
		return items.filter(todomvc.app.filter);
	}
};

todomvc.actionNewItem = function(event)
{
	if(event.value && event.keyPath instanceof Array && typeof event.model === 'object')
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

		return {
			action: 'update'
		};
	}
};

todomvc.actionUpdate = function(event)
{
	app = event.model || todomvc.app;
	app.completed = app.items.filter(function(item){ return item.completed }).length;
	app.active = app.items.length - app.completed;
	return {
		action: 'refresh'
	};
};

todomvc.actionRemoveIfEmpty = function(event)
{
		console.log('set val', event)
	if(event.value == '')
	{
		return {
			action: 'remove',
			model: event.model,
			keyPath: event.keyPath.slice(0, -1),
			value: event.value
		};
	}
	else
	{
		return {
			action: 'set',
			model: event.model,
			keyPath: event.keyPath,
			value: event.value
		};
	}
};

todomvc.actionCheckAll = function(event)
{
	todomvc.app.items = todomvc.app.items.map(function(item){
		if(item.completed !== event.value)
		{
			item = kfn.imclone(item);
			item.completed = event.value;
		}
		return item;
	});
	return {
		action: 'update'
	};
};

todomvc.actionClearCompleted = function(event)
{
	todomvc.app.items = todomvc.app.items.filter(function(item){
		return !item.completed;
	});
	return {
		action: 'update'
	};
};

todomvc.actionRoute = function(app)
{
	return function(event)
	{
		console.log('route', event)
		app.filterBy = event.state.params.filterBy;
		return {
			action: 'update'
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
		action: 'update'
	};
};



