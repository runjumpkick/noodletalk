// Redis helper commands
var content = require('../lib/web-remix');
var messageMaker = require('../lib/message-maker');

// Get the user list
exports.getUserlist = function(client, channel, callback) {
  client.keys('channelUser:' + channel + ':*', function(err, users) {
    try {
      var userList = new Array();
      var counter = 0;

      for (var i=0; i < users.length; i++) {
        client.get(users[i], function(errUser, userHash) {
          counter ++;
          userList.unshift(JSON.parse(userHash));

          if (counter === users.length) {
            return callback(null, userList);
          }
        });
      }
    } catch(err) {
      return callback(null, err);
    }
  });
};

// Create a new message
exports.setRecentMessage = function(client, noodle, req, io, callback) {
  var mediaIframeMatcher = /<iframe\s.+><\/iframe>/i;
  var mediaVideoMatcher = /<video\s.+>.+<\/video>/i;
  var mediaAudioMatcher = /<audio\s.+>.+<\/audio>/i;
  var channel = escape(req.params.channel);
  var meMatch = /^(\/me\s)/i;
  var slashMatcher = /^(\/)\w?/i;

  var getMessageType = function(req) {
    var messageContent = req.body.message || "";
    if (req.body) {
      var nick = content.getNickName(messageContent);
      if (nick.length > 0) {
        return "nick";

      } else if (messageContent.match(meMatch)) {
        return "activity";
      
      } else if (messageContent.match(slashMatcher)) {
        return "dummy";
      }
    }
    return "";
  }

  messageMaker.getMessage(client, noodle, channel, req, io, getMessageType(req), function(err, message) {
    try {
      var jsonMessage = JSON.stringify(message);

      // Add generic message item
      client.lpush('channelMessages:' + channel, jsonMessage);
      client.ltrim('channelMessages:' + channel, 0, 19);

      // Add if this is a media item
      if (mediaIframeMatcher.exec(message.message) !== null ||
          mediaVideoMatcher.exec(message.message) !== null ||
          mediaAudioMatcher.exec(message.message) !== null) {
        client.lpush('channelMedia:' + channel, jsonMessage);
        client.ltrim('channelMedia:' + channel, 0, 2);
      }
    } catch(err) {
      return callback(err);
    }
    return callback(null, message);
  });
};

// Get the last recent 20 messages
exports.getRecentMessages = function(client, channel, callback) {
  client.lrange('channelMessages:' + channel, 0, 20, function(err, messages) {
    var messageList = [];
    try {
      for (var i=0; i < messages.length; i++) {
        messageList.unshift(JSON.parse(messages[i]));
      }

    } catch (err) {
      return callback(err);
    }
    return callback(null, messageList);
  });
};

// Get the last recent 3 media items
exports.getRecentMedia = function(client, channel, callback) {
  client.lrange('channelMedia:' + channel, 0, 3, function(err, messages) {
    var messageList = [];
    try {
      for (var i=0; i < messages.length; i++) {
        messageList.unshift(JSON.parse(messages[i]));
      }

    } catch (err) {
      return callback(err);
    }
    return callback(null, messageList);
  });
};

/* Set the new nick for the channel user or reference the old nick
 * Every message post is passed through this function.
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
  client.sismember('channelUserSet:' +  channel, newNickname, function(err, usernameFound) {
    try {
      var isFound = true;

      if (!usernameFound) {
        client.srem('channelUserSet:' +  channel, oldNickname);
        client.sadd('channelUserSet:' +  channel, newNickname);
        isFound = false;
      }

      client.set('channelUser:' + channel + ':' + userHash.emailHash, JSON.stringify(userHash));

      /* We want to expire the user from the channel list every so often so that dead keys aren't hanging around.
       * If they send a new message, we will attempt to reinsert if their keys don't exist
       */
      client.expire('channelUserSet:' +  channel, 60*60) // 1 hour
      client.expire('channelUser:' + channel + ':' + userHash.emailHash, 60*60) // 1 hour

    } catch(err) {
      return callback(err);
    }
    return callback(null, isFound);
  });
};
