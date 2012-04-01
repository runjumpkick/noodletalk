module.exports = function(noodle, app, userList) {
  var auth = require('../lib/authenticate');

  app.get("/", function (req, res) {
    res.redirect('/about/noodletalk');
  });

  app.get("/about/:channel/:thread?", function(req, res) {
    var channel = req.params.channel;
    var baseChannel = channel;
    var thread = req.params.thread;
    var unslugThread = null;
    if (thread) {
      channel += '/' + thread;
      unslugThread = thread.replace(/\-/g, ' ');
    }
    if (!userList[channel]) {
      userList[channel] = [];
    }
    var nickname = null;
    if (req.session.email) {
      if (!req.session.nickname) {
        req.session.nickname = new Object();
      }
      if (!req.session.nickname[channel]) {
        if (thread) {
          req.session.nickname[channel] = req.session.nickname[baseChannel];
        } else {
          req.session.nickname[channel] = auth.generateRandomNick(userList[channel]);
        }
      }
      var nickname = req.session.nickname[channel];
    }
    res.render('index', { title: 'Noodle Talk', channel: channel, baseChannel: baseChannel, thread: unslugThread, nickname: nickname });
  });
};
