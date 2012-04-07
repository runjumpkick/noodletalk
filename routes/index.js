module.exports = function(client, noodle, app, io) {
  var auth = require('../lib/authenticate');
  var noodleRedis = require('../lib/noodle-redis');

  app.get("/", function (req, res) {
    res.redirect('/about/noodletalk');
  });
  
  app.get("/about/:channel?", function(req, res) {
    // Always push noodletalk in as a default channel if it doesn't
    // already exist.
    client.sadd('channels', 'noodletalk');

    var channel = escape(req.params.channel);
    var nickname = '';

    if (!channel) {
      res.redirect('/about/noodletalk');
    } else {
      noodleRedis.setChannel(client, channel);
    }

    if (req.session.email) {
      if (!req.session.nickname[channel]) {
        req.session.nickname[channel] = auth.generateRandomNick();
      }
      nickname = req.session.nickname[channel];
    }
    
    noodleRedis.getUserlist(client, channel, function(err, userList) {
      noodleRedis.getChannellist(client, function(err, channels) {
        io.sockets.in(channel).emit('userlist', userList);
        io.sockets.emit('channels', channels);
      });
    });

    res.render('index', { title: 'Noodle Talk', channel: channel, nickname: nickname });
  });

  // Change the random font
  app.get("/font", function(req, res) {
    req.session.userFont = Math.floor(Math.random() * 9);
    io.sockets.broadcast('font', userFont);
    res.json({
      'font': req.session.userFont
    });
  });

  // Request the current version number
  app.get("/version", function(req, res) {
    res.json({
      'version': noodle.version
    });
  });
};
