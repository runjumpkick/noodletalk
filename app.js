"use strict";
var noodle = require('./package');
var express = require('express');
var configurations = module.exports;
var app = express.createServer();
var redis = require('redis');
var client = redis.createClient();
var nconf = require('nconf');
var settings = require('./settings')(app, configurations, express);

nconf.argv().env().file({ file: 'local.json' });

client.select(app.set('redisnoodle'), function(errDb, res) {
  console.log(process.env.NODE_ENV || 'dev' + ' database connection status: ', res);
});

// Always set noodletalk as an available channel and never expire it
client.set('channels:noodletalk', 'noodletalk');

var io = require('socket.io').listen(app);

io.configure(function() { 
  io.set('transports', ['xhr-polling']); 
  io.set('polling duration', 10);
});

io.sockets.on('connection', function(socket) {
  socket.on('join channel', function(channel) {
    socket.join(channel);
  });

  socket.on('private', function(data) {
    io.sockets.in(data.channel).emit('private', data.privateChannel);
  });
});

// routes
require('./routes')(client, noodle, nconf, app, io);
require('./routes/message')(client, nconf, app, io);
require('./routes/auth')(client, nconf, app, io);

app.get('/404', function(req, res, next){
  next();
});

app.get('/403', function(req, res, next){
  err.status = 403;
  next(new Error('not allowed!'));
});

app.get('/500', function(req, res, next){
  next(new Error('something went wrong!'));
});

app.listen(process.env.PORT || nconf.get('port'));
