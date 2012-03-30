module.exports = function(noodle, app, io, userList, recentMessages) {
  var message = {};
  var auth = require('../lib/authenticate');
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
    var topic = req.param('topic', 'default');
    var message = messageMaker.getMessage(noodle, req, io, userList[topic]);
    var mediaIframeMatcher = /<iframe\s.+><\/iframe>/i;
    var mediaVideoMatcher = /<video\s.+>.+<\/video>/i;
    var mediaAudioMatcher = /<audio\s.+>.+<\/audio>/i;
    
    recentMessages.generic.push(message);
    
    var totalTopics = {};
    recentMessages.generic.forEach(function (m, i, a) {
        totalTopics[m.topic] = 1;
    });
    
    if (recentMessages.generic.length > Object.keys(totalTopics).length * 20) {
      for (var i = recentMessages.generic.length - 1; i >= 0; i--) {
        if (recentMessages.generic[i].topic == topic) {
          recentMessages.generic.splice(i, 1);
        }
      }
    }
    // Add if this is a media item
    if(mediaIframeMatcher.exec(message.message) !== null ||
      mediaVideoMatcher.exec(message.message) !== null ||
      mediaAudioMatcher.exec(message.message) !== null) {
      recentMessages.media.push(messages);
    }
    
    if (recentMessages.media.length > Object.keys(totalTopics).length * 3) {
      for (var i = recentMessages.media.length - 1; i >= 0; i--) {
        if (recentMessages.media[i].topic == topic) {
          recentMessages.media.splice(i, 1);
        }
      }
    }
    
    io.sockets.emit('message', message);
    io.sockets.emit('usercount', io.sockets.clients().length);
    res.json(message);
  });
};
