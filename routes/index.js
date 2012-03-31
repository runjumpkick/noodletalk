module.exports = function(noodle, app, userList) {
  var auth = require('../lib/authenticate');
  
  app.get("/", function(req, res) {
    var topic = req.param('topic', 'default');
    if (!userList[topic]) {
      userList[topic] = [];
    }
    var nickname = null;
    if (req.session.email) {
      if (!req.session.nickname) {
        req.session.nickname = new Object();
      }
      if (!req.session.nickname[topic]) {
        req.session.nickname[topic] = auth.generateRandomNick(userList[topic]);
      }
      var nickname = req.session.nickname[topic];
    }
    if (topic && topic != req.query.topic) {
        delete req.session.topic;
        res.redirect('/?topic=' + escape(topic));
    } else {
        res.render('index', { status: 200, title: 'Noodle Talk', topic: topic, nickname: nickname });
    }
  });
};
