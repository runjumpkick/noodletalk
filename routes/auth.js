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
        req.session.nickname = new Object({ topic: auth.generateRandomNick(userList[topic]) });;
        io.sockets.emit('userlist', userList[topic]);
        var message = messageMaker.getMessage(noodle, topic, req, io, userList, "joined");
        io.sockets.emit('message', message);
      }
      res.redirect('/?topic=' + escape(topic));
    });
  });

  // Logout
  app.get("/logout", function(req, res) {
    var topic = req.param('topic', 'default');
    // Housekeeping:
    var idx = userList[topic] ? userList[topic].indexOf(req.session.nickname[topic]) : -1;
    if (idx > -1) {
      userList[topic].splice(idx, 1);
      io.sockets.emit('userlist', userList[topic]);
    }
    
    // Adios:
    req.session.email = null;
    req.session.userFont = null;
    req.session.nickname = null;
    res.redirect('/?topic=' + escape(topic));
  });
};
