'todomvc' in window || (window.todomvc = {});

todomvc.keyEventFilter = function(key)
{
	return function(fn, e) {
		var fn2 = function(event) {
			if(event.keyCode === key) fn.call(this, event);
		};
		if(arguments.length === 2) return fn2.call(this, e);
		else return fn2;
	}
};

todomvc.enterKeyEventFilter = todomvc.keyEventFilter(13);

todomvc.plurals = {
	items: {
		'1': 'item'
	}
};

todomvc.helpers = {
	trim: function(v) {
		return v.replace(/^\s+|\s+$/g, '');
	},

	pluralize: function(v, term) {
		var plurals = todomvc.plurals;
		if(term in plurals)
		{
			v = v.toString();
			if(v in plurals[term]) term = plurals[term][v];
		}
		return term;
	},

	enterKeyFilter: todomvc.enterKeyEventFilter
};

todomvc.MainView = kff.createClass({
	extend: kff.PageView,
	args: [{
		models: {
			app: '@todomvc.App'
		},
		helpers: todomvc.helpers,
		itemFactory: '@@todomvc.Item'
	}]
},
/** @lends todomvc.MainView.prototype */
{
	/**
	 * Main page view class
	 * @param  {Object} options Options for the view
	 */
	constructor: function(options) {
		options.modelEvents = [
			['app.state', 'change:filterBy', 'refreshBinders'],
			['newTodo', 'change:title', 'newTodoChange']
		];
		kff.PageView.call(this, options);
		this.itemFactory = options.itemFactory;
		this.models.newTodo = new kff.Model({
			title: ''
		});
		this.models.app.load();
	},

	newTodoChange: function(event)
	{
		if(event.changed.title == '') return;

		var item = this.itemFactory();
		item.title(event.changed.title);

		this.models.app.items().append(item);
		this.models.app.save();

		this.models.newTodo.set('title', '');
	}
});

todomvc.EditInputView = kff.createClass({
	extend: kff.BindingView
},
{
	/**
	 * Event handler for keyup event in edit inputs (delegated to the view element)
	 * @param  {DOMEvent} event A keyup event
	 */
	keyUpEdit: todomvc.enterKeyEventFilter(function(event){
		event.currentTarget.blur();
		this.refreshBinders(true);
	}),

	blur: function(event){
		this.refreshBinders(true);
	}
});