// Generate Youtube iframe
exports.process = function(media, remix, url, options) {
  var serviceYoutube = /(youtube)|(youtu\.be)/i;

  if (!remix.isMatched && media.match(serviceYoutube)) {
    var youtubeId = "";
    remix.isMatched = true;

    if (media.indexOf('youtu.be') > -1) {
      youtubeId = url[url.length - 1];
    } else {
      youtubeId = url[url.length - 1].split('v=')[1].split('&')[0];
    }

    remix.result = '<iframe width="' + options.width + '" height="' + options.height + '" ' +
     'src="//www.youtube.com/embed/' + youtubeId + '" frameborder="0" ' +
     'allowfullscreen></iframe>';
  }
  return remix;
};
