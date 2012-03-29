// Generate Vimeo iframe
exports.process = function(media, remix, url, options) {
  var serviceVimeo = /vimeo/i;

  if (!remix.isMatched && media.match(serviceVimeo)) {
    var vimeoId = url[url.length - 1];
    remix.isMatched = true;

    remix.result = '<iframe src="//player.vimeo.com/video/' + vimeoId + '" ' +
     'width="' + options.width + '" height="' + options.height + '" frameborder="0" ' +
     'webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>';
  }
  return remix;
};
