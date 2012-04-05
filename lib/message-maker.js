var auth = require('../lib/authenticate');
var content = require('../lib/web-remix');
var gravatar = require('gravatar');
var noodleRedis = require('../lib/noodle-redis');

// Message processing
exports.getMessage = function(client, noodle, channel, req, io, messageType, callback) {
  var messageContent = req.body.message || '';
  var datetime = new Date();
  var oldNickname = req.session.nickname[channel];
  var message = content.generate(messageContent.substring(0, 399));
  var isAction = false;
  var self = this;
  var newNickname = content.getNickName(req.body.message);
  var nickname = newNickname;

  if (newNickname.length < 1) {
    nickname = oldNickname;
  }

  if (oldNickname === null || oldNickname === undefined || oldNickname.replace(/\s/, '').length < 1) { 
    oldNickname = auth.generateRandomNick();
    req.session.nickname[channel] = oldNickname;
  }

  this.generateMessage = function() {
    message = {
      nickname: req.session.nickname[channel],
      message: message,
      channel: channel,
      gravatar: gravatar.url(req.session.email, { }, true),
      font: req.session.userFont,
      hours: datetime.getHours(),
      mins: datetime.getMinutes(),
      secs: datetime.getSeconds(),
      raw_time: datetime.getTime(),
      server_timezone: datetime.getTimezoneOffset() / 60,
      created: new Date().getTime(),
      is_action: isAction,
      action_type: messageType,
      version: noodle.version
    };
  };
  
  auth.getUserHash(req, nickname, channel, function(errHash, userHash) {
    noodleRedis.setChannelUser(client, channel, userHash, oldNickname, newNickname, function(err, usernameUsed) {
      try {
        // if this is a /nick change, check to see if we can set it
        if (messageType === "nick") {
          if (!usernameUsed) {
            message = '<em>' + oldNickname + ' has changed to ' + newNickname + '</em>';
            req.session.nickname[channel] = newNickname;
            req.session.updated = new Date();

            noodleRedis.getUserlist(client, channel, function(err, userList) {
              io.sockets.in(channel).emit('userlist', userList);
            });

          } else {
            message = '';
          } 
          isAction = true;

        // if this is a /me prepend with the nick
        } else if (messageType === "activity") {
          var meMatch = /^(\s\/me\s?)/i;
          message = '<em>' + req.session.nickname[channel] + ' ' + message.replace(meMatch, '') + '</em>';
          isAction = true;

        // user joining new channel
        } else if (messageType === "joined") {
          var epicSuffixes = ["", "the Great", "the Silent", "the Wicked", "the Disturbed",
                        "the Outcast", "the Heroine", "Esquire"];
          var regalPrefixes = ["", "Sir", "Count", "Duchess", "Baron", "Commodore", "Peon"];
          
          message = '<em>Now introducing, ' + 
                    regalPrefixes[Math.round(Math.random() * (regalPrefixes.length - 1))] + 
                    ' ' + req.session.nickname[channel] + 
                    ' ' + epicSuffixes[Math.round(Math.random() * (epicSuffixes.length - 1))] + '</em>';
          isAction = true;
        
        // clear invalid commands
        } else if (messageType === "dummy") {
          message = '';
        }
      } catch(err) {
        return callback(err);
      }

      self.generateMessage();
      return callback(null, message);
    });
  });
};
