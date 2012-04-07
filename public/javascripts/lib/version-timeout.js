var localVersion = undefined;
var hushLock = 0;

var hush = function(content, contentID, timeToFadeIn, timeToAppear) {
  if (!hushLock) {
    hushLock = 1;
    
    // Disable messaging.
    $('input[name=message]').attr('disabled','disabled');
    
    // Disable scrolling.
    disableScroll();
    
    setTimeout(function() {
      setTimeout(function()
      {
        var newElement = jQuery(content);
        newElement.attr('id', contentID);
        newElement.attr('class', 'hush');
        $('body').append(newElement);
        $('#'+contentID).animate({
          'width': 440,'height': 338, 'margin-left': -220, 'margin-top': -184 },
          timeToAppear,
          function() {}
        );
      },timeToAppear);
      $('#hush').fadeIn();
    },timeToFadeIn);
  }
}

var unHush = function(contentID, timeToFadeOut, timeToDisappear) {
  setTimeout(function() {
    setTimeout(function() {
      $('#hush').fadeOut();
      hushLock = 0;
    },timeToFadeOut);
    $('#'+contentID).animate({
      'width': 0,'height': 0, 
      'margin-left': 0, 'margin-top': 0 },
      timeToDisappear,
      function() {}
    );
  },timeToDisappear);
}

// Version checking: if we have a mismatch of our local version and the server version force a refresh.
var checkVersion = function() {
  $.get('/version', function(data) {
    if (localVersion === undefined) {
      localVersion = data.version;
    
    } else if (localVersion !== data.version) {
      hush('<img onclick="window.location.reload()" src="/images/please_refresh.gif" />', 'refresh', 500, 1000);
    }
  });
};
