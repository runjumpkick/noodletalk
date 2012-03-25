module.exports = function(noodle, app) {
  app.get("/", function(req, res) {
    var topic = req.param('topic', req.session.topic);
    if (topic != req.query.topic) {
        delete req.session.topic;
        res.redirect('/?topic=' + topic);
    } else {
        res.render('index', { title: 'Noodle Talk', topic: topic });
    }
  });
};
