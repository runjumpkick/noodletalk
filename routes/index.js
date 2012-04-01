module.exports = function(noodle, app) {
  app.get("/", function(req, res) {
    res.render('index', { title: 'Noodle Talk' });
  });

  app.get("/font", function(req, res) {
    req.session.userFont = Math.floor(Math.random() * 9);
    res.json({
      'font': req.session.userFont
    });
  });
};
