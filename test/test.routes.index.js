var express = require('express');
var assert = require('should');
var sinon = require('sinon');
var session = require('client-sessions');
var app = express.createServer();
var io = require('socket.io').listen(app);
var noodle = require('../package');
var redis = require("redis");
var client = redis.createClient();
var configurations = module.exports;
var settings = require('../settings')(app, configurations, express);
var noodleRedis = require('../lib/noodle-redis');
var http = require('http');
var nock = require('nock');
var addr = null;
var nconf = require('nconf');
var auth = require('../lib/authenticate');

nconf.argv().env().file({ file: 'test/local-test.json' });

require('../routes')(client, noodle, nconf, app, io);

client.select(app.set('redisnoodle'), function(errDb, res) {
  if (errDb) {
    console.log('TEST database connection failed.');
  }
});

describe('index', function() {
  before(function(done) {
    app.listen().on('listening', function () {
      addr = app.address();
      done();
    });
  });
  after(function() {
    client.flushdb();
    app.close();
  });
  describe('request for default route', function() {
    it('should redirect to /about/noodletalk', function(done) {
      http.get({ host: addr.address, port: addr.port, path: '/' }, function (res) {
        res.headers['location'].should.match(/\/about\/noodletalk$/);
        done();
      });
    });
  });

  describe('request for /about/noodletalk', function() {
    it('should render the index view with title #noodletalk', function(done) {
      http.get({ host: addr.address, port: addr.port, path: '/about/noodletalk' }, function (res) {
        res.statusCode.should.equal(200);
        var data = '';
        res.on('data', function (chunk) {
          data += chunk;
        });
        res.on('end', function () {
          data.should.match(/<title>#noodletalk<\/title>/);
          done();
        });
      });
    });
  });

  describe('request for /font', function() {
    it('should return the new font JSON', function(done) {
      http.get({ host: addr.address, port: addr.port, path: '/font' }, function (res) {
        var data = '';
        res.on('data', function (chunk) {
          data += chunk;
        });
        res.on('end', function () {
          data.should.match(/\{"font":[0-9]+\}/);
          done();
        });
      });
    });
  });
});
