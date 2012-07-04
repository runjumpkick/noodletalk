// Redis helper commands
const MEDIA_IFRAME_MATCHER = /<iframe\s.+><\/iframe>/i;
const MEDIA_OBJECT_MATCHER = /<object\s.+><\/object>/i;
const MEDIA_VIDEO_MATCHER = /<video\s.+>.+<\/video>/i;
const MEDIA_AUDIO_MATCHER = /<audio\s.+>.+<\/audio>/i;
const MEDIA_IMAGE_MATCHER = /(\.jpg)|(\.jpeg)|(\.png)|(\.gif)/i;
const ME_MATCH = /^(\/me\s)/i;
const SLASH_MATCHER = /^(\/)\w?/i;
const RECENT_MESSAGE_LIMIT = 39; // limit recent messages to 40, starting at 0
const RECENT_MEDIA_LIMIT = 11; // limit recent media to 7, starting at 0
var content = require('../lib/web-remix');
var messageMaker = require('../lib/message-maker');

/* Get the user list
 * Requires: the db client connection, a channel
 * Returns: a list of active user hashes
 */
exports.getUserlist = function(client, channel, callback) {
  client.keys('channelUser:' + channel + ':*', function(err, users) {
    if (err) {
      return callback(err);
    }

    var userList = [];

    if (users.length > 0) {
      users.forEach(function(userItem, counter) {
        client.get(userItem, function(errUser, userHash) {
          if (errUser) {
            return callback(errUser);
          }

          userList.unshift(JSON.parse(userHash));

          if (counter === users.length - 1) {
            return callback(null, userList);
          }
        });
      });
    } else {
      return callback(null, userList);
    }
  });
};

/* Get a list of all the active non-private channels
 * Requires: the db client connection, socket io
 * Returns: a list of active channel hashes
 */
exports.getChannelList = function(client, io, callback) {

  client.keys('channels:*', function(err, channels) {
    if (err) {
      return callback(err);
    }

    var channelList = [];

    if (channels.length > 0) {
      channels.forEach(function(channelItem, counter) {
        if (!channelItem.match(/^channels:private-[a-f0-9]{32}-[a-f0-9]{32}$/)) {
          client.get(channelItem, function(errChannel, channel) {
            if (errChannel) {
              return callback(errChannel);
            }

            var channelHash = {
              name: channel,
              userCount: io.sockets.clients(channel).length
            };

            channelList.unshift(channelHash);
            if (counter === channels.length - 1) {
              return callback(null, channelList);
            }
          });
        } else {
          return callback(null, channelList);
        }
      });
    } else {
      return callback(null, channelList);
    }
  });
};

// Set a channel
exports.setChannel = function(client, channel) {
  var channelName = escape(channel).toLowerCase();
  client.set('channels:' + channelName, channel);
  client.expire('channels:' + channelName, 60 * 60); // 1 hour
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
    if (err) {
      return callback(err);
    }

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
  });
};

// Get the last recent 20 messages
exports.getRecentMessages = function(client, channel, callback) {
  client.lrange('channelMessages:' + channel, 0, RECENT_MESSAGE_LIMIT + 1, function(err, messages) {
    if (err) {
      return callback(err);
    }

    var messageList = [];

    if (messages.length > 0) {
      messages.forEach(function(message, counter) {
        messageList.unshift(JSON.parse(message));

        if (counter === messages.length - 1) {
          return callback(null, messageList);
        }
      });
    } else {
      return callback(null, messageList);
    }
  });
};

// Get the last recent 3 media items
exports.getRecentMedia = function(client, channel, callback) {
  client.lrange('channelMedia:' + channel, 0, RECENT_MEDIA_LIMIT + 1, function(err, messages) {
    if (err) {
      return callback(err);
    }

    var messageList = [];

    if (messages.length > 0) {
      messages.forEach(function(message, counter) {
        messageList.unshift(JSON.parse(message));

        if (counter === messages.length - 1) {
          return callback(null, messageList);
        }
      });
    } else {
      return callback(null, messageList);
    }
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
  });
};
