'use strict';

var MATCH_NICK = /^(\/nick\s?$)/i;
var MATCH_ME = /^(\/me\s?$)/i;
var EMOTI_HEART = '&lt;3';
var MATCH_CHANNEL = /^#\w+/i;
var VIDEO_HEIGHT = 281;
var VIDEO_WIDTH = 500;

/* Embed media if it matches any of the following:
 * 1. Is a Youtube link
 * 2. Is a Vimeo link
 * 3. Is a Twitter status message link
 * 4. Is a general link
 * 5. Is a file with a jpg|jpeg|png|gif extension
 * 6. Is an video or audio extension matching mp3|ogg|webm|ogv|mp4
*/
exports.generate = function(content, callback) {
  var result = '';
  var matchYoutube = require('./remixes/youtube');
  var matchVimeo = require('./remixes/vimeo');
  var matchSoundCloud = require('./remixes/soundcloud');
  var matchMixCloud = require('./remixes/mixcloud');
  var matchRdio = require('./remixes/rdio');
  var matchTwitter = require('./remixes/twitter');
  var matchImages = require('./remixes/images');
  var matchAudio = require('./remixes/audio');
  var matchVideo = require('./remixes/video');
  var matchLinks = require('./remixes/links');

  // set null anything that is supposed to be a command but is followed by nothing
  this.removeDummies = function(result) {
    if (result.match(MATCH_NICK) || result.match(MATCH_ME)) {
      return '';
    }

    return result;
  };

  // parse the current url to determine where to process it.
  var parseWords = function(media, callback) {
    var url = media.split('/');
    var protocol = url[0].toLowerCase();
    var remix = { result: '', isMatched: false };

    // get rid of any html
    media = media.replace(/</gm, '&lt;');
    media = media.replace(/>/gm, '&gt;');
    media = media.replace(/\"/gm, '&quot;');
    media = media.replace(/;base64/gm, '');

    if (protocol === 'http:' || protocol === 'https:') {
      // this is a link, so let's do some more analysis
      matchSoundCloud.process(media, remix, url, function(errSndCld, remix) {
        if (errSndCld) {
          callback(errSndCld);

        } else {
          if (!remix.isMatched) {
            matchTwitter.process(media, remix, url, { maxwidth: VIDEO_WIDTH - 15, omit_script: 'false', lang: 'en' }, function (errTwitter, remix) {
              if (errTwitter) {
                callback(errTwitter);
              } else {
                if (!remix.isMatched) {
                  remix = matchMixCloud.process(media, remix, { width: VIDEO_WIDTH - 60, height: VIDEO_HEIGHT - 30 });
                  remix = matchYoutube.process(media, remix, url, { width: VIDEO_WIDTH, height: VIDEO_HEIGHT });
                  remix = matchRdio.process(media, remix, url);
                  remix = matchVimeo.process(media, remix, url, { width: VIDEO_WIDTH, height: VIDEO_HEIGHT });
                  remix = matchImages.process(media, remix);
                  remix = matchAudio.process(media, remix);
                  remix = matchVideo.process(media, remix);
                  remix = matchLinks.process(media, remix);
                }

                callback(null, remix.result || '<a href="' + media + '" target="_blank">' + media + '</a>');
              }
            });
          } else {
            callback(null, remix.result || '<a href="' + media + '" target="_blank">' + media + '</a>');
          }
        }
      });
    } else if (media.match(MATCH_CHANNEL)) {
      callback(null, '<a href="/about/' + escape(media.split('#')[1]) + '" target="_blank">' + media + '</a>');

    } else if (media === EMOTI_HEART) {
      callback(null, '<img src="/images/heart.png" class="emoti">');

    } else {
      callback(null, media);
    }
  };

  // break the string up by spaces
  var newContent = '';
  content = this.removeDummies(content);
  var contentArray = content.split(/\s/);

  contentArray.forEach(function(contentArrayItem, counter) {
    parseWords(contentArrayItem, function(err, contentResp) {
      if (err) {
        callback(err);

      } else {
        newContent += ' ' + contentResp;

        if (counter === contentArray.length - 1) {
          callback(null, newContent);
        }
      }
    });
  });
};

// Set a nickname
exports.getNickName = function(content) {
  var nickMatcher = new RegExp(/^(\/nick\s)([a-zA-Z0-9_]+)/i);
  var nickname = '';
  var matches = nickMatcher.exec(content);

  if (matches){
    nickname = matches[2].replace(/\s/, '');

    if (nickname.length > 1) {
      nickname = nickname.replace(/[^\w]/g, '_');
    }
  }

  return nickname;
};
