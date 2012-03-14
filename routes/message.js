module.exports = function(app) {
  var message = {};
  var gravatar = require('gravatar');
  var content = require('../lib/web-remix');
  var io = require('socket.io').listen(app);

  var getMessage = function(req) {
    if(req.body) {
      var datetime = new Date();
      var oldNickname = req.session.nickname;
      var nickname = content.getNickName(req.body.message);
      var message = content.generate(req.body.message);
      var isAction = false;

      if(nickname.length > 0) {
        req.session.nickname = nickname;
        message = '<em>' + oldNickname + ' has changed to ' + nickname + '</em>';
        isAction = true;
      }

      if(!req.session.nickname) {
        req.session.nickname = 'Anonymous';
      } 

      // if this is a /me prepend with the nick
      var meMatch = /^(\s\/me\s)/i;

      if(message.match(meMatch)) {
        message = '<em>' + req.session.nickname + ' ' + message.replace(meMatch, '') + '</em>';
        isAction = true;
      }

      message = {
        nickname: req.session.nickname,
        message: message,
        gravatar: gravatar.url(req.session.email),
        font: req.session.userFont,
        hours: datetime.getHours(),
        mins: datetime.getMinutes(),
        secs: datetime.getSeconds(),
        raw_time: datetime.getTime(),
        server_timezone: datetime.getTimezoneOffset() / 60,
        created: Math.round(new Date().getTime() / 1000),
        connected_clients: io.sockets.clients().length,
        is_action: isAction
      };

      return message;
    }
  };

  /*
   * Send a broadcast for this message to a channel if a channel is specified;
   * else send to the public channel
   */
  var sendBroadcast = function(message, channel) {
    if(channel !== undefined) {
      io.of('/' + channel).emit('message', message);
    } else {
      io.sockets.emit('message', message);
    }
  };

  // Add new message
  app.post('/message', function(req, res) {
    var message = getMessage(req);
    var channel = req.body.channel;

    sendBroadcast(message, channel);
    res.json(message);
  });
};
