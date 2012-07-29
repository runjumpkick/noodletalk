'use strict';

var auth = require('../lib/authenticate');
var content = require('../lib/web-remix');
var messageMaker = require('../lib/message-maker');
var noodleRedis = require('../lib/noodle-redis');

module.exports = function(client, nconf, app, io, isLoggedIn) {
  // Get recent messages
  app.get('/about/:channel/recent', function(req, res) {
    var channel = escape(req.params.channel);
    noodleRedis.getRecentMessages(client, channel, function(err, messages) {
      if (err) {
        res.json({ 'status': 500, 'error': userErr });

      } else {
        var channelMessages = {};

        channelMessages.generic = messages || {};
        channelMessages.media = {};

        io.sockets.in(channel).emit('userlist', []);

        res.json({
          'messages': channelMessages,
          'connected_clients': io.sockets.clients(channel).length,
          'user_list': []
        });
      }
    });
  });

  // Add new message
  app.post('/about/:channel/message', isLoggedIn, function(req, res) {
    noodleRedis.setRecentMessage(client, req, io, function(err, message) {
      if (err) {
        res.json({ 'status': 500, 'error': err });

      } else {
        var channel = escape(req.params.channel);

        noodleRedis.getUserlist(client, channel, function(userErr, userList) {
          try {
            io.sockets.in(channel).emit('userlist', userList);
            io.sockets.in(channel).emit('message', message);
            io.sockets.in(channel).emit('usercount', io.sockets.clients(channel).length);
            res.json(message);
          } catch(userErr) {
            res.json({ 'status': 500, 'error': userErr });
          }
        });
      }
    });
  });
};
