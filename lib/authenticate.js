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
        email = jsonResp.email;
      } else {
        return callback(err);
      }
    } catch (error) {
      return callback(error);
    }

    return callback(null, email);
  });
};

// Return a hash of the public user metadata
exports.getUserHash = function(req, nickname, channel, isOwner, callback) {
  var emailHash;
  
  if (isOwner) {
    emailHash = crypto.createHash('md5').update(req.session.email).digest("hex");
  } else {
    emailHash = req.params.email;

    // An explicit email was set, so change to the md5 hash
    if (emailHash.indexOf('@') > -1) {
      emailHash = crypto.createHash('md5').update(emailHash).digest("hex");
      nickname = emailHash;
      channel = 'profile-' + emailHash;
    }
  }

  var user = {
    emailHash: emailHash,
    avatar: GRAVATAR_URL + emailHash,
    nickname: nickname
  };

  return callback(null, user);
};

// generate a new nickname for a new channel user
exports.generateRandomNick = function() {
  return 'i_love_ie6_v' + (new Date().getTime()) + Math.floor(Math.random() * 100);
};
