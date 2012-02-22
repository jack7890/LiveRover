$(function() {
  var lr = lr || {};      

  _.templateSettings = {
    interpolate : /\{\{(.+?)\}\}/g,
    evaluate : /~(.+?)~/g
  };
  
  lr.Settings = {
    numBuckets: 6,
    markers: [
      { size: { width: 23, height: 29 } },
      { size: { width: 24, height: 31 } },          
      { size: { width: 25, height: 33 } },
      { size: { width: 27, height: 35 } },
      { size: { width: 28, height: 37 } },
      { size: { width: 32, height: 42 } }
    ],
    badLoc: {  // Google Maps center of NYC.  Going to filter this out.
      lat: 40.7144,
      lon: -74.006
    }
  }

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
        return (ev.venue.location.lat == lr.Settings.badLoc.lat && ev.venue.location.lon == lr.Settings.badLoc.lon) 
      });
    },
    // Custom add method so that it doesn't try to add duplicate models to collection
    add: function(models, options) { 
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
    el: $('.wrapper'),
    initialize: function() {
      var that = this;
      this.date   = this.collection.date;
      this.latlon = this.collection.latlon;
      this.zoom   = this.options.zoom;
      this.collection.bind("add", function(model) {
        that.addOneEvent(model);
      });
      this.render();
    },
    events: {
      "click .next":        "showNextDay",
      "click .prev.active": "showPrevDay",
      "click .date-value":  "captureDate",
      "blur  .date-input":  "blurDate",              
    },
    captureDate: function() {
      this.$('.date-value').hide();
      this.$('.date-input').val('').show().focus();
    },
    blurDate: function() {
      var newDate = Date.parse(this.$('.date-input').val());
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
            
      _.each(this.collection.models, function(mod) {
        mod.clear();
      });
      
      this.startLoadingImage();
      this.renderDateLabel();
      this.collection.requests.push(
        this.collection.fetch({
          success: function() {
            that.addAllEvents();
            that.collection.requests = [];
            that.toggleLoadingImage();
          }
        })
      );
    },
    renderDateLabel: function() {
      this.$('.date-input').hide();
      this.$('.date-value').show().html(this.date.toString("dddd, MMMM d"));
      this.$('.date').fadeIn('fast');      
    },
    showNextDay: function() {
      this.changeDay(1);
    },    
    showPrevDay: function() {
      this.changeDay(-1);
    },    
    setArrowClass: function() {
      if(this.date.equals(Date.today())) {
        this.$('.prev').removeClass('active').addClass('disabled');      
      } else {
        this.$('.prev').removeClass('disabled').addClass('active');
      }  
    },    
    addAllEvents: function() {
      var that = this;
      this.collection.each(function(mod) {
        that.addOneEvent(mod);
      });
    },
    addOneEvent: function(e) {
      var ev = new lr.EventView({ 
        model:  e,
        parentView: this
      });
    },
    toggleLoadingImage: function() {
      var ongoing = false;
      ongoing = _.any(this.collection.requests, function(r) {
        return typeof r.status === "undefined";
      });
      if(!ongoing) this.$('.loader').fadeOut('fast');
    },
    startLoadingImage: function() {
      this.$('.loader').fadeIn('fast');
    },
    getRadius: function() {
      var sw = this.map.getBounds().getSouthWest();
      var center = this.map.getCenter();
      return google.maps.geometry.spherical.computeDistanceBetween(sw, center, 3963.19); // Third param forces response units to be in miles
    },
    handleMapChange: function() {
      var that = this,
          center = this.map.getCenter();
      this.startLoadingImage();
      this.radius = this.getRadius();
      this.latlon = { lat: center.lat(), lon: center.lng() };
      this.collection.latlon = this.latlon;
      this.collection.radius = this.radius;
      this.collection.requests.push(
        this.collection.fetch({
          add: true,
          success: function() {
            that.toggleLoadingImage();
          }
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
      google.maps.event.addListener(this.map, 'bounds_changed', _.bind(this.handleMapChange, this));
    }    
  });
  
  lr.EventView = Backbone.View.extend({
    initialize: function() {
      this.bucket = this.bucket();
      this.markerScale = this.scaleShadow();
      this.model.bind('change', _.bind(this.deleteMarker, this));
      this.latLon = new google.maps.LatLng(this.model.attributes.venue.location.lat,this.model.attributes.venue.location.lon);
      this.pinImage = new google.maps.MarkerImage("/img/markers/marker_" + this.bucket + ".png",
          new google.maps.Size(lr.Settings.markers[this.bucket].size.width, lr.Settings.markers[this.bucket].size.height),
          new google.maps.Point(0, 0),
          null)
      this.pinShadow = new google.maps.MarkerImage("img/markers/shadow.png",
          new google.maps.Size(56, 47),
          new google.maps.Point(0, 0),
          new google.maps.Point(16 * this.markerScale, 44 * this.markerScale),
          new google.maps.Size(56 * this.markerScale, 47 * this.markerScale));      
      this.marker = new google.maps.Marker({
         position:  this.latLon,
         map:       this.options.parentView.map,
         icon:      this.pinImage,
         shadow:    this.pinShadow,
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
            low:        that.model.attributes.stats.lowest_price,
            count:      that.model.attributes.stats.listing_count,            
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
    },
    bucket: function() {
      var numListings = this.model.attributes.stats.listing_count;
      if (numListings === 0) return 0;
      var logListings = Math.log(numListings),
          i = 0;
      while(i < (lr.Settings.numBuckets - 1)) {
        if(logListings < (i + 1)) return i
        i++;
      }    
      return (lr.Settings.numBuckets -1);
    },
    scaleShadow: function() {
      return (lr.Settings.markers[this.bucket].size.height / lr.Settings.markers[lr.Settings.numBuckets - 1].size.height);
    }
  });

  lr.myEvents = new lr.Events([], {
    date: Date.parse('today'),    
    latlon: { lat: 40.727, lon: -73.99 },
    radius: 8
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