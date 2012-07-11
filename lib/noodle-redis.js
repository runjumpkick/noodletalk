'use strict';

// Redis helper commands
var MEDIA_IFRAME_MATCHER = /<iframe\s.+><\/iframe>/i;
var MEDIA_OBJECT_MATCHER = /<object\s.+><\/object>/i;
var MEDIA_VIDEO_MATCHER = /<video\s.+>.+<\/video>/i;
var MEDIA_AUDIO_MATCHER = /<audio\s.+>.+<\/audio>/i;
var MEDIA_IMAGE_MATCHER = /(\.jpg)|(\.jpeg)|(\.png)|(\.gif)/i;
var PRIVATE_MESSAGE_MATCH = /private-message/i;
var PROFILE_MESSAGE_MATCH = /profile-/i;
var ME_MATCH = /^(\/me\s)/i;
var SLASH_MATCHER = /^(\/)\w?/i;
var RECENT_MESSAGE_LIMIT = 39; // limit recent messages to 40, starting at 0
var RECENT_MEDIA_LIMIT = 9; // limit recent media to 10, starting at 0
var RECENT_USER_LIMIT = 39; // limit recent users to 40, starting at 0
var content = require('../lib/web-remix');
var messageMaker = require('../lib/message-maker');
var scaffold = require('../lib/scaffold');
var auth = require('../lib/authenticate');

/* Get the user list
 * Requires: the db client connection, a channel
 * Returns: a list of active user hashes
 */
exports.getUserlist = function(client, channel, callback) {
  scaffold.getDataByKeys(client, 'channelUser', channel, function(err, userList) {
    if (err) {
      return callback(err);
    }

    return callback(null, userList);
  });
};

// Set a channel
exports.setChannel = function(client, channel) {
  var channelName = escape(channel).toLowerCase();

  // Don't set the channel if it is for a user's profile
  if (!channelName.match(/^profile/)) {
    client.set('channels:' + channelName, channel);
    client.expire('channels:' + channelName, 60 * 60); // 1 hour
  }
};

/* Create a new message
 * Requires: a db client connection, the web request and socket io
 * Returns: the message hash
 */
exports.setRecentMessage = function(client, req, io, callback) {
  var channel = escape(req.params.channel);

  var getMessageType = function(req) {
    var messageContent = req.body.message || '';

    if (req.body) {
      var nick = content.getNickName(messageContent);
      if (nick.length > 0) {
        return 'nick';

      } else if (messageContent.match(ME_MATCH)) {
        return 'activity';

      } else if (messageContent.match(SLASH_MATCHER)) {
        return 'dummy';
      }
    }
    return '';
  };

  messageMaker.getMessage(client, channel, req, io, getMessageType(req), function(err, message) {
    console.log(auth.setEmailHash(req.session.email), channel.split('-'))
    if (err || (channel.match(PROFILE_MESSAGE_MATCH) &&
      auth.setEmailHash(req.session.email) !== channel.split('-')[1])) {
      return callback(err);
    }

    try {
      var jsonMessage = JSON.stringify(message);
      // Add generic message item
      client.lpush('channelMessages:' + channel, jsonMessage);
      client.ltrim('channelMessages:' + channel, 0, RECENT_MESSAGE_LIMIT);

      // Add if this is a media item
      if (MEDIA_IFRAME_MATCHER.exec(message.message) !== null ||
          MEDIA_OBJECT_MATCHER.exec(message.message) !== null ||
          MEDIA_VIDEO_MATCHER.exec(message.message) !== null ||
          MEDIA_AUDIO_MATCHER.exec(message.message) !== null ||
          (MEDIA_IMAGE_MATCHER.exec(message.message) !== null &&
          message.message.indexOf('class="emoti"') === -1)) {
        client.lpush('channelMedia:' + channel, jsonMessage);
        client.ltrim('channelMedia:' + channel, 0, RECENT_MEDIA_LIMIT);
      }

      return callback(null, message);
    } catch (msgErr) {
      return callback(msgErr);
    }
  });
};

/* Get the last recent messages
 * Requires: a db client connection and a channel
 * Returns: the message list if successful, error otherwise
 */
exports.getRecentMessages = function(client, channel, callback) {
  scaffold.getDataByList(client, 'channelMessages', channel, RECENT_MESSAGE_LIMIT, function(err, messageList) {
    if (err) {
      return callback(err);
    }

    return callback(null, messageList);
  });
};

/* Get the last recent notifications
 * Requires: a db client connection and a web request
 * Returns: the notification list if successful, error otherwise
 */
exports.getRecentNotifications = function(client, req, callback) {
  scaffold.getDataByList(client, 'notifications', req.session.email, RECENT_MESSAGE_LIMIT, function(err, messageList) {
    if (err) {
      return callback(err);
    }

    return callback(null, messageList);
  });
};

// Get the last recent media items
exports.getRecentMedia = function(client, channel, callback) {
  scaffold.getDataByList(client, 'channelMedia', channel, RECENT_MEDIA_LIMIT, function(err, messageList) {
    if (err) {
      return callback(err);
    }

    return callback(null, messageList);
  });
};

/* Set the new nick for the channel user or reference the old nick
 * Every message post is passed through this function.
 * Requires: a db client connection, channel, user hash, the user's old nickname (if available),
 * the user's new nickname (if available).
 * Returns: a boolean of whether an existing username was found.
 *
 * There are two types of keys:
 * 1. channelUserSet is for fast referencing a nickname in a channel, e.g. ['jane', 'bob']
 * 2. channelUsers is for userHash details and are referenced as individual keys
 * When a user changes their nick successfully, we update both accordingly.
 */
exports.setChannelUser = function(client, channel, userHash, oldNickname, newNickname, callback) {
  if (newNickname.length < 1) {
    newNickname = oldNickname;
  }
  oldNickname = oldNickname.toLowerCase();
  newNickname = newNickname.toLowerCase();

  client.sismember('channelUserSet:' +  channel, newNickname, function(err, usernameFound) {
    if (err) {
      return callback(err);
    }

    try {
      var isFound = true;

      if (!usernameFound) {
        client.srem('channelUserSet:' +  channel, oldNickname);
        client.sadd('channelUserSet:' +  channel, newNickname);
        isFound = false;
      }

      exports.setChannel(client, channel);
      client.set('channelUser:' + channel + ':' + userHash.emailHash, JSON.stringify(userHash));

      /* We want to expire the user from the channel list every so often so that dead keys aren't hanging around.
       * If they send a new message, we will attempt to reinsert if their keys don't exist
       * One note about the userHash.emailHash: if a user signs in on multiple browsers with the same email address
       * on the same channel, their account will never have all three users active - only 1 will be and the
       * remaining ones will be set to anonymous.
       */
      client.expire('channelUserSet:' +  channel, 60 * 60); // 1 hour
      client.expire('channelUser:' + channel + ':' + userHash.emailHash, 60 * 60); // 1 hour

      return callback(null, isFound);
    } catch (userErr) {
      return callback(userErr);
    }
  });
};
