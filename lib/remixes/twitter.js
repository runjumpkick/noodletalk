'use strict';

// Render Twitter message using oEmbed
// https://dev.twitter.com/docs/embedded-tweets
// To render a Tweet using oEmbed, the embedding site must:
// 1. Obtain an URL to or ID number of the Tweet it wants to render.
// 2. Make a request to the GET statuses/oembed endpoint, passing the Tweet URL or ID as a query parameter.
// 3. Render the html property of the response, as well as a <script> element pointing to //platform.twitter.com/widgets.js, if needed.
var SERVICE_TWITTER = /twitter\.com\/\w+\/status\/(\d+)/i;
var request = require('request');

exports.process = function(media, remix, url, options, callback) {
  if (!remix.isMatched && media.match(SERVICE_TWITTER)) {
    var tweetId = media.match(SERVICE_TWITTER)[1];
    request.get('https://api.twitter.com/1/statuses/oembed.json' + '?url=' + escape(media) + "&maxwidth=" + options.maxwidth + "&omit_script=" + options.omit_script + "&lang=" + options.lang + "&align=center", function(error, resp, body) {
      if (error) {
        return media;
      }

      try {
        remix.isMatched = true;
        var tweet = JSON.parse(body);
        remix.result = tweet.html;
        return callback(null, remix);
      } catch (error) {
        return callback(null, remix);
      }
    });
  } else {
    return callback(null, remix);
  }
};
