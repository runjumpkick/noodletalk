var express = require('express');
var messages = require('../routes/message');
var messageMaker = require('../lib/message-maker');
var app = express.createServer();
var io = require('socket.io').listen(app);
var content = require('../lib/web-remix');
var noodle = require('../package');
var recentMessages = {};
var channel = 'noodletalk';
var redis = require("redis");
var client = redis.createClient();
var noodleRedis = require('../lib/noodle-redis');
var nconf = require('nconf');

nconf.argv().env().file({ file: './test.json' });

client.select(app.set('redisnoodle'), function(errDb, res) {
  console.log('TEST database connection status: ', res);
});

describe('message', function() {
  after(function() {
    client.flushdb();
    console.log('cleared test database');
  });
  describe('.getMessage', function() {
    describe('has a request body', function() {
      describe('has a nickname change', function() {

        it('sets the session nickname', function(done) {
          var newNick = 'nick';
          var req = {
            body: { 
              message: '/nick ' + newNick
            },
            params: {
              channel: 'noodletalk'
            },
            session: {
              nickname: { 'noodletalk': 'oldnick' },
              email: 'test@test.org',
              emailHash: '12345'
            }
          };
          messageMaker.getMessage(client, channel, req, io, 'nick', function(err, message) {
            message.message.should.equal('<em>oldnick has changed to nick</em>');
            req.session.nickname[channel].should.equal(newNick);
            done();
          });
        });

        it('updates the userList', function(done) {
          var newNick = 'nick123';
          var req = {
            body: { 
              message: '/nick ' + newNick
            },
            params: {
              channel: 'noodletalk'
            },
            session: {
              nickname: { 'noodletalk': 'oldnick' },
              email: 'test@test.org',
              emailHash: '12345'
            }
          };

          messageMaker.getMessage(client, channel, req, io, 'nick', function(err, message) {
            message.message.should.equal('<em>oldnick has changed to nick123</em>');

            noodleRedis.getUserlist(client, channel, function(errUser, users) {
              client.sismember('channelUserSet:' + channel, newNick, function(errMem, r) {
                var u = false;
                r.should.equal(1);
                for (var i=0; i < users.length; i++) {
                  if (users[i].nickname === newNick) {
                    u = true;
                  }
                }
                u.should.equal(true);
                done();
              });
            });
          });
        });
      });
      
      describe('has no nickname change', function() {
        it('should not change the nickname', function(done) {
          var req = { 
            body: { 
              message: '/nick'
            },
            params: {
              channel: 'noodletalk'
            },
            session: {
              nickname: { 'noodletalk': 'test' },
              email: 'test@test.org',
              emailHash: '12345'
            }
          };

          noodleRedis.setRecentMessage(client, req, io, function(err, message) {
            message.message.should.equal('');
            req.session.nickname[channel].should.equal('test');
            done();
          });
        });
      });

      describe('has no request session nickname', function() {
        it('sets the nickname to i_love_ie6xxxxxxx', function(done) {
          var req = { 
            body: { 
              message: 'test'
            },
            params: {
              channel: 'noodletalk'
            },
            session: {
              nickname: { 'noodletalk': '' },
              email: 'test@test.org',
              emailHash: '12345'
            }
          };

          messageMaker.getMessage(client, channel, req, io, 'joined', function(err, message) {
            req.session.nickname[channel].should.match(/i_love_ie6.+/);
            done();
          });
        });
      });

      describe('has a /me', function() {
        it('sets the status of the user', function(done) {
          var req = { 
            body: { 
              message: '/me is testing'
            },
            params: {
              channel: 'noodletalk'
            },
            session: {
              nickname: { 'noodletalk': 'test' },
              email: 'test@test.org',
              emailHash: '12345'
            }
          };

          messageMaker.getMessage(client, channel, req, io, 'activity', function(err, message) {
            if (message) {
              message.message.should.equal('<em>test is testing</em>');
            } else {
              console.error('Message is undefined');
            }
            done();
          });
        });
      });

      describe('has a /join', function() {
        it('sets the join message for the user', function(done) {
          var req = { 
            body: { 
              message: ''
            },
            params: {
              channel: 'noodletalk'
            },
            session: {
              nickname: { 'noodletalk': '' },
              email: 'test@test.org',
              emailHash: '12345'
            }
          };

          messageMaker.getMessage(client, channel, req, io, 'joined', function(err, message) {
            if (message) {
              message.message.should.match(/^[<em>Now introducing,]\w+[<\/em>]/);
            } else {
              console.error('Message is undefined');
            }
            done();
          });
        });
      });

      describe('has a channel list', function() {
        it('adds a new channel to the channel list', function(done) {
          var req = { 
            body: { 
              message: 'test'
            },
            params: {
              channel: 'noodletalk'
            },
            session: {
              nickname: { 'noodletalk': '' },
              email: 'test@test.org',
              emailHash: '12345'
            }
          };

          noodleRedis.setRecentMessage(client, req, io, function(err, message) {
            noodleRedis.getChannelList(client, io, function(err, channels) {
              channels[0].name.should.equal('noodletalk');
            });
            done();
          });
        });
      });

      describe('has no change', function() {
        it('ensures no message is broadcasted on a single command', function(done) {
          var req = { 
            body: { 
              message: '/blah'
            },
            params: {
              channel: 'noodletalk'
            },
            session: {
              nickname: { 'noodletalk': 'test' },
              email: 'test@test.org',
              emailHash: '12345'
            }
          };

          messageMaker.getMessage(client, channel, req, io, 'dummy', function(err, message) {
            message.message.should.equal('');
            done();
          });
        });

        it('ensures no message is broadcasted on a command with trailing text', function(done) {
          var req = { 
            body: { 
              message: '/blah test'
            },
            params: {
              channel: 'noodletalk'
            },
            session: {
              nickname: { 'noodletalk': 'test' },
              email: 'test@test.org',
              emailHash: '12345'
            }
          };

          messageMaker.getMessage(client, channel, req, io, 'dummy', function(err, message) {
            message.message.should.equal('');
            done();
          });
        });
      });
    });
  });
});
