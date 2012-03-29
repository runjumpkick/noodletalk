// Generate image link
exports.process = function(media, remix) {
  var serviceImage = /(jpg)|(jpeg)|(png)|(gif)$/i;

  if (!remix.isMatched && media.match(serviceImage)) {
    remix.isMatched = true;

    remix.result = '<img src="' + media + '">';
  }
  return remix;
};
