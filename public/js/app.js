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
  

  lr.Event = Backbone.Model.extend({ });

  lr.Events = Backbone.Collection.extend({
    model: lr.Event,
    initialize: function(models, options) {
      this.date     = options.date;
      this.latlon   = options.latlon;
      this.radius   = options.radius;
      this.requests = [];
    },
    url: function() {
      return '/events' + '?date=' + this.date.toString('yyyy-MM-dd') + '&lat=' + this.latlon.lat + '&lon=' + this.latlon.lon + '&radius=' + this.radius;
    },
    parse: function(resp) {
      // Temporarily removing venues "located" at the center of NYC, since those are bogus
      return _.reject(resp.events, function(ev) { 
        return ( ev.venue.location.lat == badLoc.lat && ev.venue.location.lon == badLoc.lon) 
      });
    },
    add: function(models, options) { // Custom add method so that it doesn't try to add duplicate models to collection
      var newModels = [];
      _.each(models, function(model) {
        if (_.isUndefined(this.get(model.id))) {
          newModels.push(model);    
        }
      }, this);
      return Backbone.Collection.prototype.add.call(this, newModels, options);
    }    
  });

  lr.MapView = Backbone.View.extend({
    el: $('#wrapper'),
    initialize: function() {
      var that = this;
      this.date   = this.collection.date;
      this.latlon = this.collection.latlon;
      this.zoom   = this.options.zoom;
      _.bindAll(this, "render", "addAllEvents", "addOneEvent", "changeDay", "handleMapChange", "renderDateLabel");
      this.collection.bind("add", function(model) {
        that.addOneEvent(model);
      });
      this.render();
    },
    events: {
      "click #next":        "showNextDay",
      "click #prev.active": "showPrevDay",
      "click #date-value":  "captureDate",
      "blur  #date-input":  "blurDate",              
    },
    captureDate: function() {
      console.log('called');
      var that = this;
      $('#date-value').hide();
      $('#date-input').val('').show().focus();
    },
    blurDate: function() {
      var newDate = Date.parse($('#date-input').val());
      if(newDate && newDate != this.date) {
        this.date = newDate;
        this.changeDay();
        this.renderDateLabel();
      } else {
        this.renderDateLabel();          
      }      
    },
    changeDay: function(diff) {
      var that = this;
      // Abort any AJAX requests for prev days that haven't responded yet
      _.each(this.collection.requests, function(r) {
        r.abort();
      });
      if(diff) this.date = this.date.add(diff).days();
      this.setArrowClass();
      this.collection.date = this.date;
            
      // The following three lines shouldn't be necessary.  Should just be able to
      // bind a 'remove' event to the lr.EventView model and remove the markers with
      // that. But this isn't working.  Need to figure out why.
      _.each(this.collection.models, function(mod) {
        mod.clear();
      });
      
      this.renderDateLabel();
      this.collection.requests.push(
        this.collection.fetch({
          success: function() {
            lr.primaryView.addAllEvents();
            that.collection.requests = []
          }
        })
      );
    },
    renderDateLabel: function() {
      $('#date-input').hide();
      $('#date-value').show().html(this.date.toString("dddd, MMMM d"));
      $('#date').fadeIn('fast');      
    },
    showNextDay: function() {
      this.changeDay(1);
    },    
    showPrevDay: function() {
      this.changeDay(-1);
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
    getRadius: function() {
      var sw = this.map.getBounds().getSouthWest();
      var center = this.map.getCenter();
      return google.maps.geometry.spherical.computeDistanceBetween(sw, center, 3963.19); // Third param forces response units to be in miles
    },
    handleMapChange: function() {
      var that = this;
      var center = this.map.getCenter();
      this.radius = this.getRadius();
      this.latlon = { lat: center.Qa, lon: center.Ra };
      this.collection.latlon = this.latlon;
      this.collection.radius = this.radius;
      this.collection.requests.push(
        this.collection.fetch({
          add: true
        })    
      );
    }, 
    render: function() {
      this.mapOptions = {
        center: new google.maps.LatLng(this.latlon.lat, this.latlon.lon),
        zoom: this.zoom,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };
      this.map = new google.maps.Map($('#map')[0], this.mapOptions);
      this.renderDateLabel();
      google.maps.event.addListener(this.map, 'bounds_changed', this.handleMapChange);
    }    
  });
  
  lr.EventView = Backbone.View.extend({
    initialize: function() {
      _.bindAll(this, "render", "bindInfoWindow","infoWindowContent", "deleteMarker");
      this.model.bind('change', this.deleteMarker);
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

  lr.myEvents = new lr.Events([], {
    date: Date.parse('today'),    
    latlon: { lat: 40.727, lon: -73.99 },
    radius: 4
  });

  lr.primaryView = new lr.MapView({
    collection: lr.myEvents,
    zoom: 14
  });
  
  lr.myEvents.requests.push(
    lr.myEvents.fetch({
      success: function() {
        lr.primaryView.addAllEvents();
      }
    })
  );
});