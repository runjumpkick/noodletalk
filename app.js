"use strict";
var noodle = require('./package');
var express = require('express');
var configurations = module.exports;
var app = express.createServer();
var redis = require("redis");
var client = redis.createClient();
var nconf = require('nconf');
var settings = require('./settings')(app, configurations, express);

nconf.argv().env().file({ file: 'local.json' });

client.select(app.set('redisnoodle'), function(errDb, res) {
  console.log('PROD/DEV database connection status: ', res);
});

// Always set noodletalk as an available channel and never expire it
client.set('channels:noodletalk', 'noodletalk');

var io = require('socket.io').listen(app);

io.configure(function () { 
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10);
});

io.sockets.on('connection', function (socket) {
  socket.on('join channel', function (channel) {
    socket.join(channel);
  });

  socket.on('private', function (data) {
    io.sockets.in(data.channel).emit('private', data.privateChannel);
  });
});

// routes
require("./routes")(client, noodle, nconf, app, io);
require("./routes/message")(client, nconf, app, io);
require("./routes/auth")(client, nconf, app, io);

app.listen(process.env.PORT || nconf.get('port'));
