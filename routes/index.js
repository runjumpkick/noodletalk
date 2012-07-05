var auth = require('../lib/authenticate');
var gravatar = require('gravatar');
var noodleRedis = require('../lib/noodle-redis');
var crypto = require('crypto');

module.exports = function(client, noodle, nconf, app, io) {
  app.get('/', function (req, res) {
    res.redirect('/about/noodletalk');
  });
  
  app.get('/about/:channel?', function(req, res) {
    var avatar = '';
    // Always push noodletalk in as a default channel if it doesn't
    // already exist.
    client.sadd('channels', 'noodletalk');

    if (!req.params.channel) {
      res.redirect('/about/noodletalk');
    }

    var channel = escape(req.params.channel.replace(/\s/, ''));
    var nickname = '';

    if (!channel) {
      res.redirect('/about/noodletalk');
    } else if (channel.match(/^private-[a-f0-9]{32}-[a-f0-9]{32}$/i)) {
      // If a user's session email hash does not match the one in the private conversation, the
      // user receives a forbidden response.
      var privateParts = channel.split('-');

      if (req.session.emailHash !== privateParts[1] && req.session.emailHash !== privateParts[2]) {
        res.send(403);
      }
      noodleRedis.setChannel(client, channel);
    }
    
    if (req.session.email) {
      avatar = gravatar.url(req.session.email, {}, true)
      if (!req.session.nickname[channel]) {
        req.session.nickname[channel] = auth.generateRandomNick();
      }
      nickname = req.session.nickname[channel];
    }

    noodleRedis.getUserlist(client, channel, function(err, userList) {
      // TODO: add 500 page redirect on err

      io.sockets.in(channel).emit('userlist', userList);
      res.render('index', {
        title: 'Noodle Talk',
        channel: channel,
        nickname: nickname,
        avatar: avatar
      });
    });
  });

  // Change the random font
  app.get('/font', function(req, res) {
    req.session.userFont = Math.floor(Math.random() * 9);
    io.sockets.emit('font', req.session.userFont);
    res.json({
      'font': req.session.userFont
    });
  });

  // Set options
  app.post('/options', function(req, res) {
    var userOption = req.body.userOptions;
    var userOption = 'mediaOn';

    if (userOption === 'off') {
      userOption = 'mediaOff';
    }

    req.session.userOptions = userOption;
    res.json({
      'options': req.session.userOptions
    });
  });

  // Request the current version number
  app.get('/version', function(req, res) {
    res.json({
      'version': noodle.version
    });
  });

  // Get the user profile
  app.get('/profile/:email?', function(req, res) {
    var channel = 'profile-' + req.params.email;
    var user = {};

    auth.getUserHash(req, req.params.email, channel, false, function(err, userHash) {
      var placeholder = 'Send a message to this user';

      if (req.session.email && crypto.createHash('md5').update(req.session.email).digest("hex") === userHash.nickname) {
        placeholder = 'Send a message to yourself';
      }

      res.render('profile', {
        title: 'Noodle Talk Profile',
        channel: 'profile-' + userHash.nickname,
        nickname: userHash.nickname,
        avatar: userHash.avatar,
        placeholder: placeholder
      });
    });
  });

  // Post a message to a user or yourself
  app.post('/message', function(req, res) {

  });
};
