var assert = require('should');
var auth = require('../lib/authenticate');
var nock = require('nock');
var should = require('should');
var nconf = require('nconf');

nconf.argv().env().file({ file: 'test/local-test.json' });

var authUrl = nconf.get('domain');
var siteUrl = nconf.get('domain') + ':' + nconf.get('port');
var qs = { assertion: '1a2b3c', audience: siteUrl };

describe('login', function() {
  describe('POST /verify', function() {
    it('logs the user in when they have valid credentials', function(done) {
      var scope = nock(authUrl).post('/verify', qs).reply(200, { status: 'okay', email: 'bela@test.org' });

      var params = {
        body: { bid_assertion: qs.assertion }
      };

      auth.verify(params, nconf, function(error, email) {
        should.not.exist(error);
        done();
      });
    });

    it('does not log the user in if they have bad credentials', function(done) {
      var scope = nock(authUrl).post('', qs).reply(500, { status: 'invalid' });

      var params = {
        body: { }
      };

      auth.verify(params, nconf, function(error, email) {
        should.exist(error);
        done();
      });
    });
  });
});
