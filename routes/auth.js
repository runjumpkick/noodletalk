module.exports = function(noodle, app, settings, io, userList) {
  var auth = require('../lib/authenticate');
  var messageMaker = require('../lib/message-maker');

  // Login
  app.post("/login", function(req, res) {
    var topic = req.param('topic', 'default');
    auth.verify(req, settings, function(error, email) {
      if(email) {
        req.session.email = email;
        req.session.userFont = Math.floor(Math.random() * 8);
        req.session.topic = topic;
        req.session.nickname = auth.generateRandomNick(userList[topic]);
        io.sockets.emit('userlist', userList[topic]);
        var message = messageMaker.getMessage(noodle, req, io, userList[topic], "joined");
        io.sockets.emit('message', message);
      }
      res.redirect('back');
    });
  });

  // Logout
  app.get("/logout", function(req, res) {
    var topic = req.param('topic', 'default');
    // Housekeeping:
    var idx = userList[topic].indexOf(req.session.nickname);
    if (idx > -1) {
      userList[topic].splice(idx, 1);
      io.sockets.emit('userlist', userList[topic]);
    }
    
    // Adios:
    req.session.email = null;
    req.session.userFont = null;
    req.session.nickname = null;
    res.redirect('/');
  });
};
