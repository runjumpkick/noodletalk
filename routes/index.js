module.exports = function(app) {
  app.get("/", function(req, res) {
    res.render('index', { title: 'Noodle Talk' });
  });

  app.get("/c/:channel", function(req, res) {
    var channel = req.params.channel

    channel = channel.toLowerCase().replace(/[^\w]/g, '_');

    if(channel.length > 0) {
      res.render('channel', { title: 'Noodle Talk: ' + channel,
                              channel: channel });
    } else {
      res.redirect('/');
    }
  });
};
