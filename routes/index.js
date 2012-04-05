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
      client.sadd('channels', channel);
    }

    if (req.session.email) {
      if (!req.session.nickname[channel]) {
        req.session.nickname[channel] = auth.generateRandomNick();
      }
      nickname = req.session.nickname[channel];
    }
    
    noodleRedis.getUserlist(client, channel, function(err, userList) {
      io.sockets.in(channel).emit('userlist', userList);
    });
    
    res.render('index', { title: 'Noodle Talk', channel: channel, nickname: nickname });
  });

  app.get("/font", function(req, res) {
    req.session.userFont = Math.floor(Math.random() * 9);
    io.sockets.broadcast('font', userFont);
    res.json({
      'font': req.session.userFont
    });
  });
};
