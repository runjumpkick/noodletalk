var content = require('../lib/web-remix');
var gravatar = require('gravatar');
var regalPrefixes = ["", "Sir", "Count", "Duchess", "Baron", "Commodore", "Peon"];
var epicSuffixes = ["", "the Great", "the Silent", "the Wicked", "the Disturbed", "the Outcast", "the Heroine", "Esquire"];

var getMessageType = exports.getMessageType = function(req){
  var meMatch = /^(\/me\s)/i;
  var messageContent = req.body.message || "";
  if(req.body){
    var nick = content.getNickName(messageContent);
    if(nick.length > 0){
      return "nick";
    }
    else if(messageContent.match(meMatch)){
      return "activity";
    }
  }
  return "";
}

// Message processing
exports.getMessage = function(noodle, topic, req, io, userList, messageType) {
  messageType = messageType || getMessageType(req);

  var gravatar = require('gravatar');
  var auth = require('../lib/authenticate');

  if (!userList) {
    userList = new Object();
  }
  if (!userList[topic]) {
    userList[topic] = [];
  }
  if (!req.session.nickname) {
    req.session.nickname = new Object();
  }
  if (!req.session.nickname[topic]) {
    req.session.nickname[topic] = auth.generateRandomNick(userList);
  }

  this.shiftUserList = function() {
    userList[topic].unshift(req.session.nickname[topic]);
    if (userList[topic].length > io.sockets.clients().length) {
      userList[topic] = userList[topic].splice(io.sockets.clients().length, userList[topic].length - io.sockets.clients().length);
    }
    io.sockets.emit('userlist', userList[topic]);
  }

  this.generateNickMessage = function() {
    var nickname = content.getNickName(messageContent);
    var nickInArray = userList[topic].indexOf(nickname);

    // If the new nick change is the same as the old nick or attempting
    // to match an existing nick ignore and return the old one
    if (nickname.toLowerCase() === oldNickname || nickInArray > -1) {
      message = '';
      return oldNickname;
    } else {
      var idx = userList[topic].indexOf(oldNickname);
      userList[topic].splice(idx, 1);
      req.session.nickname[topic] = nickname;
      req.session.updated = new Date();
      message = '<em>' + oldNickname + ' has changed to ' + nickname + '</em>';
      userList[topic].unshift(nickname);
    }

    io.sockets.emit('userlist', userList[topic]);
    isAction = true;
  };

  if(req.body) {
    var messageContent = req.body.message || "";
    var datetime = new Date();
    var oldNickname = req.session.nickname[topic].toLowerCase();
    var message = content.generate(messageContent.substring(0, 399));
    var isAction = false;

    if(messageType === "nick") {
      this.generateNickMessage();
    }
    
    // Sort this nickname to the front of the list, make sure the list is not longer than connected clients.
    var idx = userList[topic].indexOf(req.session.nickname[topic]);
    if (idx > 0) {
      userList[topic].splice(idx, 1);
    }
    this.shiftUserList();

    // if this is a /me prepend with the nick
    if (messageType === "activity") {
      var meMatch = /^(\s\/me\s?)/i;
      message = '<em>' + req.session.nickname[topic] + ' ' + message.replace(meMatch, '') + '</em>';
      isAction = true;

    } else if(messageType === "joined") {
      message = '<em>Now introducing, ' + 
                regalPrefixes[Math.round(Math.random() * (regalPrefixes.length - 1))] + 
                ' ' + req.session.nickname[topic] + 
                ' ' + epicSuffixes[Math.round(Math.random() * (epicSuffixes.length - 1))];
      isAction = true;
    }

    message = {
      nickname: req.session.nickname[topic],
      message: message,
      topic: topic,
      gravatar: gravatar.url(req.session.email, {}, true),
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

    return message;
  }
};
