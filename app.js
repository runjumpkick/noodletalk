"use strict";
var noodle = require('./package');
var express = require('express');
var configurations = module.exports;
var app = express.createServer();
var settings = require('./settings')(app, configurations, express);
var redis = require("redis");
var client = redis.createClient();

client.select(settings.app.set('redisnoodle'), function(errDb, res) {
  console.log('PROD/DEV database connection status: ', res);
});

var io = require('socket.io').listen(app);

io.configure(function () { 
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10);
});

io.sockets.on('connection', function (socket) {
  socket.on('join channel', function (channel) {
    socket.join(channel);
  });
});

// routes
require("./routes")(client, noodle, app, io);
require("./routes/message")(client, settings, noodle, app, io);
require("./routes/auth")(client, settings, noodle, app, io);

app.listen(settings.options.port);
