// Generate audio tag
exports.process = function(media, remix) {
  var serviceAudio = /(mp3)|(ogg)$/i;

  if (!remix.isMatched && media.match(serviceAudio)) {
    var audioType = media.split('.');
    remix.isMatched = true;

    audioType = audioType[audioType.length - 1];
    remix.result = '<audio controls="controls" preload="none" autobuffer>' +
      '<source src="' + media + '" type="audio/' + audioType + '" /></audio>' +
      '<a href="' + media + '" target="_blank">' + media + '</a>';
  }
  return remix;
};
