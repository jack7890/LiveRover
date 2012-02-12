var lr = lr || {};

lr.Event = Backbone.Model.extend({});

lr.Events = Backbone.Collection.extend({
  model: lr.Event,
  url: '/json/dummy.json'
  //url: 'http://api.seatgeek.com/2/events?lat=40.727&lon=-73.99&range=20mi&datetime_local=2012-02-11&callback=event_data',
  /* parse: function(resp) {
    return resp.events;
  } */
});

lr.EventView = Backbone.View.extend({
  tagName: 'div',
  className: 'event-dot',
  initialize: function() {
    _.bindAll(this, "render");
    this.collection = new lr.Events();
    this.collection.fetch({
      success: function(resp) {
        console.log(resp.toJSON());  
      }
    });    
    this.render();
  },
  render: function() {
  } 
});

lr.ev = new lr.EventView();