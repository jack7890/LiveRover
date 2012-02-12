var lr = lr || {};

lr.Event = Backbone.Model.extend({});

lr.Events = Backbone.Collection.extend({
  model: lr.Event,
  url: '/events',
  parse: function(resp) {
    return resp.events;
  }
});

lr.EventView = Backbone.View.extend({
  tagName: 'div',
  className: 'event-dot',
  initialize: function() {
    _.bindAll(this, "render");
    this.collection = new lr.Events();
    this.collection.fetch({
      success:  function(resp) {
        console.log(resp.toJSON());  
      }
    });    
    this.render();
  },
  render: function() {
  } 
});

lr.ev = new lr.EventView();