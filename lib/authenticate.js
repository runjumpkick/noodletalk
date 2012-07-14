'use strict';

var GRAVATAR_URL = 'https://secure.gravatar.com/avatar/';
var crypto = require('crypto');
var request = require('request');

/* Browser ID authentication
 * Requires: web request, settings configuration
 * Returns: a user's browser id email if they logged in successfully.
 */
exports.verify = function(req, nconf, callback) {
  var authUrl = nconf.get('authUrl') + '/verify';
  var siteUrl = nconf.get('domain') + ':' + nconf.get('authPort');

  if (!req.body.bid_assertion) {
    return callback(new Error('Invalid assertion'));
  }

  var qs = {
    assertion: req.body.bid_assertion,
    audience: siteUrl
  };

  var params = {
    url: authUrl,
    form: qs
  };

  request.post(params, function(err, resp, body) {
    if (err) {
      return callback(error);
    }

    try {
      var jsonResp = JSON.parse(body);

      if (jsonResp.status === 'okay') {
        var email = jsonResp.email;

        callback(null, email);
      } else {
        callback(jsonResp);
      }
    } catch (error) {
      callback(error);
    }
  });
};

// set email hash
exports.setEmailHash = function(email) {
  return crypto.createHash('md5').update(email).digest('hex');
};

// Return a hash of the public user metadata
exports.getUserHash = function(req, nickname, channel, isOwner, callback) {
  var emailHash;

  if (isOwner) {
    emailHash = this.setEmailHash(req.session.email);
  } else {
    emailHash = req.params.email;

    // An explicit email was set, so change to the md5 hash
    if (emailHash.indexOf('@') > -1) {
      emailHash = this.setEmailHash(emailHash);
      nickname = emailHash;
      channel = 'profile-' + emailHash;
    }
  }

  var user = {
    emailHash: emailHash,
    avatar: GRAVATAR_URL + emailHash,
    nickname: nickname
  };

  callback(null, user);
};

// generate a new nickname for a new channel user
exports.generateRandomNick = function() {
  return 'i_love_ie6_v' + (new Date().getTime()) + Math.floor(Math.random() * 100);
};

// generates a secret key for rss feed access
exports.generateRSSKey = function(client, emailHash, callback) {
  var rssKey = crypto.createHash('sha1').update(emailHash +
    (new Date().getTime()) + Math.floor(Math.random() * 100) +
    Math.floor(Math.random() * 100)).digest('hex');

  client.set('privateFeedKey:' + emailHash, rssKey, function(err, resp) {
    if (err) {
      return callback(err);
    }

    callback(null, rssKey);
  });
};

// finds whether the secret key matches a given email hash
exports.isValidRSSKey = function(client, emailHash, rssKey, callback) {
  client.get('privateFeedKey:' + emailHash, function(err, validRssKey) {
    if (err) {
      return callback(err);
    }

    if (validRssKey === rssKey) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  });
};
