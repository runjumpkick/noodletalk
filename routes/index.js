var gravatar = require('gravatar');

var auth = require('../lib/authenticate');
var content = require('../lib/web-remix');

var settings = require('../settings');
var io = require('socket.io').listen(settings.app);
var message = {};


var getMessage = function(req) {
  if(req.body) {
    var datetime = new Date();
    var nickname = content.getNickName(req.body.message);

    if(nickname.length > 0) {
      req.session.nickname = nickname;
    }

    message = {
      nickname: req.session.nickname,
      message: content.generate(req.body.message),
      gravatar: gravatar.url(req.session.email) + '?&d=identicon',
      font: req.session.userFont,
      hours: datetime.getHours(),
      mins: datetime.getMinutes(),
      secs: datetime.getSeconds(),
      raw_time: datetime.getTime(),
      server_timezone: datetime.getTimezoneOffset() / 60,
      created: Math.round(new Date().getTime() / 1000),
      connected_clients: io.sockets.clients().length
    };

    return message;
  }
};


// Home/main
exports.index = function(req, res) {
  res.render('index', { title: 'Noodle Talk' });
};


// Login
exports.login = function(req, res) {
  auth.verify(req, function(error, email) {
    if(email) {
      res.cookie('rememberme', 'yes', {
        secure: settings.options.secureCookie,
        httpOnly: true
      });
      req.session.email = email;
      req.session.userFont = Math.floor(Math.random() * 5);
      req.session.nickname = 'Anonymous';
    }
    res.redirect('back');
  });
};


// Add new message
exports.message = function(req, res) {
  var message = getMessage(req);
  
  io.sockets.emit('message', message);
  res.json(message);
}


// Logout
exports.logout = function(req, res) {
  req.session.email = null;
  req.session.userFont = null;
  req.session.nickname = null;
  res.redirect('/');
};
