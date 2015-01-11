'todomvc' in window || (window.todomvc = {});

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
			if(v != null)
			{
				v = v.toString();
				if(v in plurals[term]) term = plurals[term][v];

			}
		}
		return term;
	},

	enterKeyFilter: todomvc.enterKeyEventFilter,

	blurOrEnter: function(fn, event) {
		if(event.type === 'blur' || event.keyCode === 13) fn.call(this, event);
	},

	enterKey: function(fn, event) {
		if(event.keyCode === 13) fn.call(this, event);
	}

};