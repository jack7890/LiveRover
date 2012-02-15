$(function() {
  var lr = lr || {},
      // Google Maps center of NYC.  Going to filter this out.
      badLoc = {
        lat: 40.7144,
        lon: -74.006
      }; 

  _.templateSettings = {
    interpolate : /\{\{(.+?)\}\}/g
  };
  

  lr.Event = Backbone.Model.extend({});

  lr.Events = Backbone.Collection.extend({
    model: lr.Event,
    initialize: function(models, options) {
      this.date = options.date;
      this.latlon = options.latlon;
    },
    url: function() {
      return '/events' + '?date=' + this.date.toString('yyyy-MM-dd') + '&lat=' + this.latlon.lat + '&lon=' + this.latlon.lon;
    },
    parse: function(resp) {
      // Temporarily removing venues "located" at the center of NYC, since those are bogus
      return _.reject(resp.events, function(ev) { 
        return ( ev.venue.location.lat == badLoc.lat && ev.venue.location.lon == badLoc.lon) 
      });
    }
  });

  lr.MapView = Backbone.View.extend({
    el: $('#wrapper'),
    initialize: function() {
      this.date = this.options.date;
      this.latlon = this.options.latlon;
      _.bindAll(this, "render", "addAllEvents", "addOneEvent", "showNextDay", "collectData", "handleMapDrag");
      this.collectData();
    },
    mapDiplayed: false,
    events: {
      "click #next": "showNextDay",
      "click #prev.active": "showPrevDay"      
    },
    collectData: function() {
      var that = this;
      if (this.collection) {
        _.each(this.collection.models, function(mod) {
          mod.clear();
        });
      }  
      this.collection = new lr.Events([], { 
        date : this.date, 
        latlon: this.latlon
      });
      this.collection.fetch({
        success:  function(resp) {
          that.render();
          that.addAllEvents();
        }
      });      
    },
    showNextDay: function() {
      this.date = this.date.add(1).days();
      this.setArrowClass();
      this.collectData();
    },
    showPrevDay: function() {
      this.date = this.date.add(-1).days();
      this.collectData();
      this.setArrowClass();
    },    
    setArrowClass: function() {
      if(this.date.equals(Date.today())) {
        $('#prev').removeClass('active').addClass('disabled');      
      } else {
        $('#prev').removeClass('disabled').addClass('active');
      }  
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
    handleMapDrag: function() {
      var center = this.map.getCenter();
      this.latlon = { lat: center.Qa, lon: center.Ra };
      this.collectData();
    }, 
    renderMap: function() {
      this.mapOptions = {
        center: new google.maps.LatLng(40.726966, -73.99),
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };
      this.map = new google.maps.Map($('#map')[0], this.mapOptions);
      google.maps.event.addListener(this.map, 'dragend', this.handleMapDrag);
      this.mapDisplayed = true;      
    },    
    render: function() {
      if(!(this.mapDisplayed)) this.renderMap();
      $('#date-value').html(this.date.toString("dddd, MMMM d"));
      $('#date').fadeIn('fast');
    } 
  });
  
  
  lr.EventView = Backbone.View.extend({
    initialize: function() {
      var that = this;
      _.bindAll(this, "render", "bindInfoWindow","infoWindowContent", "deleteMarker");
      this.model.bind('change', function() {
        that.deleteMarker();
      });
      this.latLon = new google.maps.LatLng(this.model.attributes.venue.location.lat,this.model.attributes.venue.location.lon);
      this.marker = new google.maps.Marker({
         position:  this.latLon,
         map:       this.options.parentView.map,
         title:     this.model.attributes.short_title
      });
      this.bindInfoWindow();
    },
    deleteMarker: function() {
      this.marker.setMap(null);
    },
    infoWindowContent: function() {
      var that = this, 
          content = _.template($('#info-window').html(),{
            title:      that.model.attributes.short_title,
            link:       that.model.attributes.url,
            venue:      that.model.attributes.venue.name,
            time:       Date.parse(that.model.attributes.datetime_local).toString("ddd, MMM d @ h:mmtt")
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

  lr.ev = new lr.MapView({
    date: Date.parse('today'),    
    latlon: { lat: 40.727, lon: -73.99 }
  });
});

