module.exports = function(noodle, app, io, userList, recentMessages) {
  var message = {};
  var auth = require('../lib/authenticate');
  var gravatar = require('gravatar');
  var content = require('../lib/web-remix');
  var messageMaker = require('../lib/message-maker');

  // Get recent messages
  app.get("/recent", function(req, res) {
    var topic = req.param('topic', 'default');
    var topicMessages = {};
    topicMessages.generic = recentMessages.generic.filter(function (m) { return (m.topic == topic); });
    topicMessages.media = recentMessages.media.filter(function (m) { return (m.topic == topic); });
    if (!userList[topic]) {
      userList[topic] = [];
    }
    res.json({
      'messages': topicMessages,
      'connected_clients': io.sockets.clients().length,
      'user_list': userList[topic],
    });
  });

  // Add new message
  app.post("/message", function(req, res) {
    var message = messageMaker.getMessage(noodle, req, io, userList[req.session.topic]);
    var mediaIframeMatcher = /<iframe\s.+><\/iframe>/i;
    var mediaVideoMatcher = /<video\s.+>.+<\/video>/i;
    var mediaAudioMatcher = /<audio\s.+>.+<\/audio>/i;

    var topic = req.param('topic', 'default');
    var topicMessages = {};
    topicMessages.generic = recentMessages.generic.filter(function (m) { return (m.topic == topic); });
    topicMessages.media = recentMessages.media.filter(function (m) { return (m.topic == topic); });

    topicMessages.generic.push(message);
    if(topicMessages.generic.length > 20) {
      topicMessages.generic.shift();
    }
    // Add if this is a media item
    if(mediaIframeMatcher.exec(message.message) !== null ||
      mediaVideoMatcher.exec(message.message) !== null ||
      mediaAudioMatcher.exec(message.message) !== null) {
      topicMessages.media.push(message);
    }
    if(topicMessages.media.length > 3) {
      topicMessages.media.shift();
    }

    io.sockets.emit('message', message);
    io.sockets.emit('usercount', io.sockets.clients().length);
    res.json(message);
  });
};
