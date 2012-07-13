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

  app.get('/notifications', function(req, res) {
    var channel = 'notifications-' + req.session.emailHash;
    
    auth.getUserHash(req, req.session.email, 'notifications', true, function(err, userHash) {
      res.render('notifications', {
        title: 'Noodle Talk Notifications',
        channel: channel,
        nickname: userHash.nickname,
        avatar: userHash.avatar
      });
    });
  });

  // Get the recent notifications
  app.get('/notifications/recent', isLoggedIn, function(req, res) {
    var channel = 'notifications-' + req.session.emailHash;

    noodleRedis.getRecentNotifications(client, req, function(err, messages) {
      if (err) {
        res.send(403);
      }

      var channelMessages = {};

      channelMessages.generic = messages || {};
      channelMessages.media = {};
      
      res.json({
        'messages': channelMessages,
        'connected_clients': io.sockets.clients(channel).length,
        'user_list': []
      });
    });
  });

  // Get the private RSS feed
  app.get('/notifications/rss/:rsskey', function(req, res) {
    var rssKey = escape(req.params.rsskey);

    noodleRedis.getRecentNotifications(client, req, function(err, messages) {
      if (err) {
        res.send(403);
      }

      var feed = new RSS({
        title: 'Noodletalk Notifications',
        description: 'Private message notifications',
        feed_url: 'https://noodletalk.org/notifications/' + rssKey + '/rss.xml',
        site_url: 'https://noodletalk.org',
        image_url: 'https://noodletalk.org/logo.png',
        author: 'Edna Piranha'
      });

      messages.forEach(function(message, counter) {
        feed.item({
          title:  'New message from ' + message.avatar,
          description: message.message.slice(0, 100),
          url: 'https://noodletalk.org/notifications',
          date: message.created
        });
      });

      res.header('Content-Type', 'text/rss');

      res.xml(feed.xml());
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
