$(function() {
  $('#map').width($(window).width());
  $('#map').height($(window).height());

  var myOptions = {
    center: new google.maps.LatLng(40.726966, -73.99),
    zoom: 14,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  var map = new google.maps.Map(document.getElementById("map"), myOptions);

});