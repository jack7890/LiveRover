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