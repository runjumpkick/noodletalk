const EPIC_SUFFIXES = ["", "the Great", "the Silent", "the Wicked", "the Disturbed",
                      "the Outcast", "the Heroine", "Esquire"];
const REGAL_PREFIXES = ["", "Sir", "Count", "Duchess", "Baron", "Commodore", "Peon"];
var auth = require('../lib/authenticate');
var content = require('../lib/web-remix');
var gravatar = require('gravatar');
var noodleRedis = require('../lib/noodle-redis');

/* Message processing
 * Requires: a db client connection, channel, web request, socket io, message action type
 * Returns: a message hash
 */
exports.getMessage = function(client, channel, req, io, actionType, callback) {
  var messageContent = req.body.message || '';
  var datetime = new Date();
  var isAction = false;
  var self = this;

  // Check to see if a nickname is empty
  this.nicknameIsEmpty = function(oldNickname) {
    if (oldNickname) {
      var oldNickname = oldNickname.replace(/\s/, '');
    } else {
      var oldNickname = auth.generateRandomNick();
    }
    req.session.nickname[channel] = auth.generateRandomNick();
    return oldNickname;
  };

  this.generateMessage = function(message) {
    message = {
      nickname: req.session.nickname[channel],
      message: message,
      channel: channel,
      gravatar: gravatar.url(req.session.email, {}, true),
      font: req.session.userFont,
      hours: datetime.getHours(),
      mins: datetime.getMinutes(),
      secs: datetime.getSeconds(),
      raw_time: datetime.getTime(),
      server_timezone: datetime.getTimezoneOffset() / 60,
      created: new Date().getTime(),
      is_action: isAction,
      action_type: actionType
    };
    return message;
  };

  this.generateWelcomeMessage = function() {
    return '<em>Now introducing, ' + 
            REGAL_PREFIXES[Math.round(Math.random() * (REGAL_PREFIXES.length - 1))] + 
            ' ' + req.session.nickname[channel] + 
            ' ' + EPIC_SUFFIXES[Math.round(Math.random() * (EPIC_SUFFIXES.length - 1))] + '</em>';
  };

  content.generate(messageContent.substring(0, 399), function(errCnt, message) {
    try {
      var newNickname = content.getNickName(req.body.message);

      var oldNickname = self.nicknameIsEmpty(req.session.nickname[channel]);

      if (newNickname) {
        var nickname = newNickname;
      } else {
        var nickname = oldNickname;
      }

      req.session.nickname[channel] = nickname;
      
      auth.getUserHash(req, nickname, channel, function(errHash, userHash) {
        noodleRedis.setChannelUser(client, channel, userHash, oldNickname, newNickname, function(err, usernameUsed) {
          try {
            // if this is a /nick change, check to see if we can set it
            if (actionType === "nick") {
              if (!usernameUsed) {
                message = '<em>' + oldNickname + ' has changed to ' + newNickname + '</em>';
                req.session.nickname[channel] = newNickname;
                req.session.updated = new Date();

                noodleRedis.getUserlist(client, channel, function(err, userList) {
                  io.sockets.in(channel).emit('userlist', userList);
                  io.sockets.in(channel).emit('userHash', userHash);
                });

              } else {
                message = '';
              } 
              isAction = true;

            // if this is a /me prepend with the nick
            } else if (actionType === "activity") {
              var meMatch = /^(\s\/me\s?)/i;
              message = '<em>' + req.session.nickname[channel] + ' ' + message.replace(meMatch, '') + '</em>';
              isAction = true;

            // user joining new channel
            } else if (actionType === "joined") {
              message = self.generateWelcomeMessage();
              isAction = true;
            
            // clear invalid commands
            } else if (actionType === "dummy") {
              message = '';
            }
          } catch(err) {
            return callback(err);
          }

          message = self.generateMessage(message);
          return callback(null, message);
        });
      });
    } catch(errCnt) {
      return callback(errCnt);
    }
  });
};
