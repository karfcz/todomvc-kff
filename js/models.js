'todomvc' in window || (window.todomvc = {});

todomvc.Item = kff.createModelClass({
	/**
	 * Model of single TODO item
	 * @param  {Object} attrs Default values of attributes
	 * @param  {boolean} attrs.completed Is the item completed?
	 * @param  {string} attrs.title Title of the item
	 * @param  {boolean} attrs.editing True if the item is currently in edit mode
	 */
	args: [{
		completed: false,
		title: null,
		editing: false
	}]
},
/** @lends todomvc.Item.prototype */
{});

todomvc.State = kff.createModelClass({
	args: [{
		filterBy: null
	}],
	shared: true
}, {});

todomvc.App = kff.createModelClass({
	args: [{
		items: '@items',
		state: '@todomvc.State',
		count: 0,
		completed: 0,
		active: 0,
		filteredCount: 0
	}],
	shared: true
},
/** @lends todomvc.App.prototype */
{
	/**
	 * Application model class
	 */
	constructor: function(attrs){
		kff.Model.call(this, attrs);
		this.items().on('change', this.f('updateCounts'));
		this.items().onEach('change:completed', this.f('updateCounts'));
		this.items().onEach('change:title', this.f('save'));
	},

	/**
	 * Calculate numbers of completed and active items. Save the model
	 */
	updateCounts: function(){
		this.set(this.items().reduce(function(acc, item) {
				if(item.completed() === true) acc.completed++;
				else acc.active++;
				return acc;
			}, {
				count: this.items().count(),
				completed: 0,
				active: 0
			})
		);
		this.save();
	},

	/**
	 * Filter an item according to current list filter
	 * @param  {todomvc.Item} item Item to filter
	 * @return {boolean} True if item matches the filter, false otherwise
	 */
	filter: function(item){
		var f = this.state().filterBy();
		if(f === 'completed') return item.completed() === true;
		else if(f === 'active') return item.completed() !== true;
		return true;
	},

	/**
	 * Remove item from collection
	 * @param  {todomvc.Item} item
	 */
	removeItem: function(item)
	{
		this.items().remove(item);
	},

	/**
	 * Remove item if empty
	 */
	removeIfEmpty: function(item){
		if(item.title() == '') this.removeItem(item);
	},

	/**
	 * Remove all the completed items
	 */
	clearCompleted: function(){
		this.items().remove(function(item)
		{
			return item.completed();
		});
	},

	/**
	 * Mark/unmark all items as completed
	 * @param {boolean} If true all items will be marked as completed, if false they will be unmarked
	 */
	checkAll: function(attr, checked){
		this.items().each(function(item)
		{
			item.completed(checked);
		});
	},

	/**
	 * Save data to localStorage
	 */
	save: function(){
		window.localStorage.setItem('todos-kff', window.JSON.stringify(this.items().toJson()));
	},

	/**
	 * Load data from localStorage
	 */
	load: function(){
		var data = window.localStorage.getItem('todos-kff');
		if(data){
			this.items().fromJson(window.JSON.parse(data));
		}
	}
});