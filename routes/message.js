module.exports = function(app, io, userList, recentMessages) {
  var message = {};
  var gravatar = require('gravatar');
  var content = require('../lib/web-remix');

  var getMessage = function(req) {
    if(req.body) {
      var datetime = new Date();
      var oldNickname = req.session.nickname;
      var nickname = content.getNickName(req.body.message);
      var message = content.generate(req.body.message);
      var isAction = false;
      var actionType = '';

      if(nickname.length > 0) {
        /* Right now multiple people can have the same username, so if we remove,
         * then we risk removing their nick?
        */ 
        if(oldNickname !== 'Anonymous') {
          userList.splice(userList.indexOf(oldNickname), 1);
        }
        if(userList.indexOf(nickname) === -1) {
          userList.push(nickname.toLowerCase());
        }
        io.sockets.emit('userlist', userList);
        req.session.nickname = nickname;
        message = '<em>' + oldNickname + ' has changed to ' + nickname + '</em>';
        isAction = true;
        actionType = 'nick';
      }

      if(!req.session.nickname) {
        req.session.nickname = 'Anonymous';
      } 

      // if this is a /me prepend with the nick
      var meMatch = /^(\s\/me\s)/i;

      if(message.match(meMatch)) {
        message = '<em>' + req.session.nickname + ' ' + message.replace(meMatch, '') + '</em>';
        isAction = true;
        actionType = 'activity';
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
        created: new Date().getTime(),
        connected_clients: io.sockets.clients().length,
        is_action: isAction,
        action_type: actionType
      };

      return message;
    }
  };

  // Get recent messages
  app.get("/recent", function(req, res) {
    res.json(recentMessages);
  });

  // Add new message
  app.post("/message", function(req, res) {
    var message = getMessage(req);

    recentMessages.push(message);
    if(recentMessages.length > 20) {
      recentMessages.shift();
    }

    io.sockets.emit('message', message);
    res.json(message);
  });
};
