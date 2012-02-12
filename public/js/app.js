var lr = lr || {};

lr.Event = Backbone.Model.extend({});

lr.Events = Backbone.Collection.extend({
  model: lr.Event,
  url: '/events',
  parse: function(resp) {
    return resp.events;
  }
});

lr.EventListView = Backbone.View.extend({
  tagName: 'div',
  className: 'list',
  eventTemplate: _.template("<div class='event'>Title: <%= title %></event>"),
  initialize: function() {
    var that = this;
    _.bindAll(this, "render");
    this.collection = new lr.Events();
    this.collection.fetch({
      success:  function(resp) {
        that.render();
      }
    });    
  },
  render: function() {
    var that = this;
    _.each(this.collection.toJSON(), function(item) {
      $('#event-container').append(that.eventTemplate({
        title:    item.short_title
      }));
    });
  } 
});

lr.ev = new lr.EventListView();
