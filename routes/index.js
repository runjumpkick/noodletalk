module.exports = function(noodle, app) {
  app.get("/", function(req, res) {
    var topic = req.param('topic', 'default');
    if (topic && topic != req.query.topic) {
        delete req.session.topic;
        res.redirect('/?topic=' + escape(topic));
    } else {
        res.render('index', { status: 200, title: 'Noodle Talk', topic: topic });
    }
  });
};
