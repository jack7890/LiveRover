$(function() {
  $('.date-value').popover({
    placement:  'bottom',
    title:      'Have a certain date in mind?',
    content:    'Click above to enter a custom date.  For example "next saturday" or "aug 14".' 
  });
  $('.date-input').bind('keyup', function(e) {
    if(e.keyCode === 10 || e.keyCode === 13) $('.date-input').blur();
  });
  
});

// Preload marker images
preload([
  'img/markers/marker_0.png',
  'img/markers/marker_1.png',
  'img/markers/marker_2.png',
  'img/markers/marker_3.png',
  'img/markers/marker_4.png',
  'img/markers/marker_5.png',
  'img/markers/shadow.png'
]);

function preload(arrayOfImages) {
    $(arrayOfImages).each(function(){
        $('<img/>')[0].src = this;
        // Alternatively you could use:
        // (new Image()).src = this;
    });
}