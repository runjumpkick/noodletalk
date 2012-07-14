'use strict';

var auth = require('../lib/authenticate');
var content = require('../lib/web-remix');
var messageMaker = require('../lib/message-maker');
var noodleRedis = require('../lib/noodle-redis');
var RSS = require('rss');

module.exports = function(client, nconf, app, io, isLoggedIn) {
  // Get recent messages
  app.get('/about/:channel/recent', function(req, res) {
    var channel = escape(req.params.channel);
    noodleRedis.getRecentMessages(client, channel, function(err, messages) {
      if (err) {
        res.send(403);
      }

      var channelMessages = {};

      channelMessages.generic = messages || {};
      channelMessages.media = {};

      io.sockets.in(channel).emit('userlist', []);

      res.json({
        'messages': channelMessages,
        'connected_clients': io.sockets.clients(channel).length,
        'user_list': []
      });
    });
  });

  // Get the private RSS feed
  app.get('/notifications/:email/:rsskey.:format', function(req, res) {
    var rssKey = escape(req.params.rsskey);

    noodleRedis.getRecentNotifications(client, req, function(err, messages) {
      if (err) {
        res.send(403);
      }

      try {
        var feed = new RSS({
          title: 'Noodletalk Notifications',
          description: 'Private message notifications',
          feed_url: 'https://noodletalk.org/notifications/' + rssKey + '.xml',
          site_url: 'https://noodletalk.org',
          image_url: 'https://noodletalk.org/logo.png',
          author: 'Edna Piranha'
        });

        messages.forEach(function(message) {
          var messageSummary = '<img src="' + message.gravatar + '"><p>' +
            message.message.slice(0, 100) + ' ...</p>';

          feed.item({
            title:  'New message from ' + message.nickname,
            description: messageSummary,
            url: 'https://noodletalk.org/about/' + message.channel,
            date: message.created
          });
        });

        res.header('Content-Type', 'text/xml');

        res.send(feed.xml());
      } catch(errXml) {
        res.send(403);
      }
    });
  });

  // Add new message
  app.post('/about/:channel/message', isLoggedIn, function(req, res) {
    noodleRedis.setRecentMessage(client, req, io, function(err, message) {
      try {
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

      } catch(err) {
        res.json({ 'status': 500, 'error': err });
      }
    });
  });
};
