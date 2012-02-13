$(function() {
  var lr = lr || {};

  _.templateSettings = {
    interpolate : /\{\{(.+?)\}\}/g
  };

  lr.Event = Backbone.Model.extend({});

  lr.Events = Backbone.Collection.extend({
    model: lr.Event,
    url: '/events',
    parse: function(resp) {
      return resp.events;
    }
  });

  lr.MapView = Backbone.View.extend({
    el: $('#map'),
    initialize: function() {
      var that = this;
      _.bindAll(this, "render", "addAllEvents", "addOneEvent");
      this.collection = new lr.Events();
      this.collection.fetch({
        success:  function(resp) {
          that.render();
          that.addAllEvents();
        }
      });   
    },
    
    addAllEvents: function() {
      this.collection.each(this.addOneEvent);
    },
    
    addOneEvent: function(e) {
      var ev = new lr.EventView({ 
        model:  e,
        parentView: this
      });
    },
    
    render: function() {
      this.mapOptions = {
        center: new google.maps.LatLng(40.726966, -73.99),
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };
      this.map = new google.maps.Map($('#map')[0], this.mapOptions);
    } 
  });
  
  lr.EventView = Backbone.View.extend({
    initialize: function() {
      _.bindAll(this, "render", "bindInfoWindow","bindInfoWindow");
      this.latLon = new google.maps.LatLng(this.model.attributes.venue.location.lat,this.model.attributes.venue.location.lon);
      this.marker = new google.maps.Marker({
         position:  this.latLon,
         map:       this.options.parentView.map,
         title:     this.model.attributes.short_title
      });
      this.bindInfoWindow();
    },
    
    infoWindowContent: function() {
      var that = this, 
          content = _.template($('#info-window').html(),{
            title:      that.model.attributes.short_title,
            venue:      that.model.attributes.venue.name,
          });
      return content;
    },      
    
    bindInfoWindow: function() {
      var that = this,
          infowindow = new google.maps.InfoWindow({
            content: this.infoWindowContent()
          });
      google.maps.event.addListener(this.marker, 'click', function() {
        infowindow.open(that.options.parentView.map,that.marker);
      });
    }
  });

  lr.ev = new lr.MapView();
});