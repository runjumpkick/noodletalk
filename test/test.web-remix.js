var webRemix = require('../lib/web-remix');
var nock = require('nock');

describe('web-remix', function() {
  describe('.generate',  function() {

    it('returns embed code for a youtu.be short url', function(done) {
      webRemix.generate('http://youtu.be/5cazkHAHiPU', function(err, subject) {
        subject.should.equal(' <iframe width="500" height="281" src="//www.youtube.com/embed/5cazkHAHiPU?wmode=transparent" ' +
        'frameborder="0" allowfullscreen></iframe><a href="//www.youtube.com/watch?v=5cazkHAHiPU" ' +
        'class="media-link" target="_blank">http://www.youtube.com/watch?v=5cazkHAHiPU</a>');
        done();
      });
    });

    it('returns embed code for a youtube normal url', function(done) {
      webRemix.generate('http://www.youtube.com/watch?v=5cazkHAHiPU', function(err, subject) {
        subject.should.equal(' <iframe width="500" height="281" src="//www.youtube.com/embed/5cazkHAHiPU?wmode=transparent" ' +
          'frameborder="0" allowfullscreen></iframe><a href="//www.youtube.com/watch?v=5cazkHAHiPU" ' +
          'class="media-link" target="_blank">http://www.youtube.com/watch?v=5cazkHAHiPU</a>');
        done();
      });
    });

    it('returns embed code for a vimeo video url', function(done) {
      webRemix.generate('http://vimeo.com/37872583', function(err, subject) {
        subject.should.equal(' <iframe src="//player.vimeo.com/video/37872583" width="500" height="281" ' +
          'frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>' +
          '<a href="http://vimeo.com/37872583" class="media-link" target="_blank">http://vimeo.com/37872583</a>');
        done();
      });
    });

    it('returns embed code for a mixcloud audio url', function(done) {
      webRemix.generate('http://www.mixcloud.com/LuckyMe/25-jamie-vexd-sunday-walkman-mix/', function(err, subject) {
        subject.should.equal(' <object width="440" height="251"><param name="movie" value="http://www.mixcloud.' +
          'com/media/swf/player/mixcloudLoader.swf?feed=http%3A//www.mixcloud.com/LuckyMe/25-jamie-vexd-sunday-' +
          'walkman-mix/&embed_type=widget_standard"></param><param name="allowFullScreen" value="false"></param>' +
          '<param name="wmode" value="opaque"></param><param name="allowscriptaccess" value="always"></param>' +
          '<embed src="//www.mixcloud.com/media/swf/player/mixcloudLoader.swf?feed=http%3A//www.mixcloud.com' +
          '/LuckyMe/25-jamie-vexd-sunday-walkman-mix/&embed_type=widget_standard" type="application/x-shockwave-' +
          'flash" wmode="opaque" allowscriptaccess="always" allowfullscreen="true" width="440" height="251"></embed>' +
          '</object><div style="clear:both; height:3px;"><div style="clear:both; height:3px;"></div></div><a href="' +
          'http%3A//www.mixcloud.com/LuckyMe/25-jamie-vexd-sunday-walkman-mix/" class="media-link" target="_blank">' +
          'http%3A//www.mixcloud.com/LuckyMe/25-jamie-vexd-sunday-walkman-mix/</a>');
        done();
      });
    });

    it('returns oembed code for a soundcloud url', function(done) {
      var scope = nock('soundcloud.com').get('/oembed?format=json&url=http//soundcloud.com/track').reply(200,
          { html: '<iframe src="//w.soundcloud.com/player/?url=http%3A' +
          '%2F%2Fapi.soundcloud.com%2Fplaylists%2F723408&amp;show_artwork=true" frameborder="no" height="450" ' +
          'scrolling="no" width="100%"></iframe><a class="media-link" target="_blank"' +
          'href="http://soundcloud.com/skeptical/sets/tracks-576/">http://soundcloud.com/skeptical/sets' +
          '/tracks-576/</a>' });
      webRemix.generate('http://soundcloud.com/skeptical/sets/tracks-576/', function(err, subject) {
        subject.should.equal(' <iframe width="100%" height="450" scrolling="no" frameborder="no" ' +
          'src="//w.soundcloud.com/player/?url=http%3A%2F%2Fapi.soundcloud.com%2Fplaylists%2F723408&show_artwork=true">' +
          '</iframe><a href="http://soundcloud.com/skeptical/sets/tracks-576/" class="media-link" target="_blank">' +
          'http://soundcloud.com/skeptical/sets/tracks-576/</a>');
        done();
      });
    });

    it('returns oembed code for a twitter status url', function(done) {
      var scope = nock('api.twitter.com').get('/1/statuses/oembed.json?url=https://twitter.com/CBCElectronic/status/240125822537707520&maxwidth=440&lang=en').reply(200,
        {type: "rich",
          url: "https:\/\/twitter.com\/CBCElectronic\/status\/240125822537707520",
          provider_name: "Twitter",
          height: null,
          html: "\u003Cblockquote class=\"twitter-tweet\"\u003E\u003Cp\u003EThis interview with Brian Eno may have taken place over 30 years ago, but it's a great read.\u003Ca href=\"http:\/\/t.co\/gvqnW0sl\" title=\"http:\/\/ow.ly\/dghnU\"\u003Eow.ly\/dghnU\u003C\/a\u003E\u003C\/p\u003E&mdash; CBCElectronic (@CBCElectronic) \u003Ca href=\"https:\/\/twitter.com\/CBCElectronic\/status\/240125822537707520\" data-datetime=\"2012-08-27T16:37:12+00:00\"\u003EAugust 27, 2012\u003C\/a\u003E\u003C\/blockquote\u003E\n\u003Cscript src=\"\/\/platform.twitter.com\/widgets.js\" charset=\"utf-8\"\u003E\u003C\/script\u003E",
          provider_url: "http:\/\/twitter.com",
          author_name: "CBCElectronic",
          author_url: "https:\/\/twitter.com\/CBCElectronic",
          cache_age: "31536000000",
          version: "1.0",
          width: 440});
      webRemix.generate('https://twitter.com/CBCElectronic/status/240125822537707520', function(err, subject) {
        subject.should.equal(' <blockquote class="twitter-tweet tw-align-center" width="440"><p>This interview with Brian Eno may have taken place over 30 years ago, but it\'s a great read.<a href="http://t.co/gvqnW0sl" title="http://ow.ly/dghnU">ow.ly/dghnU</a></p>&mdash; CBCElectronic (@CBCElectronic) <a href="https://twitter.com/CBCElectronic/status/240125822537707520" data-datetime="2012-08-27T16:37:12+00:00">August 27, 2012</a></blockquote>\n' +
        '<script src="//platform.twitter.com/widgets.js" charset="utf-8"></script>');
        done();
      });
    });

    it('returns embed code for a rd.io short url', function(done) {
      webRemix.generate('http://rd.io/i/QVME9DdeW1GL', function(err, subject) {
        subject.should.equal(' <iframe class="rdio" width="450" height="80" ' +
          'src="//rd.io/i/QVME9DdeW1GL" ' +
          'frameborder="0"></iframe><a href="http://rd.io/x/QVME9DdeW1GL" ' +
          'class="media-link" target="_blank">http://rd.io/x/QVME9DdeW1GL</a>');
        done();
      });
    });

    it('returns embed code for a rdio normal url', function(done) {
      webRemix.generate('http://rdio.com/x/QVME9DdeW1GL', function(err, subject) {
        subject.should.equal(' <iframe class="rdio" width="450" height="80" ' +
          'src="//rd.io/i/QVME9DdeW1GL" ' +
          'frameborder="0"></iframe><a href="http://rd.io/x/QVME9DdeW1GL" ' +
          'class="media-link" target="_blank">http://rd.io/x/QVME9DdeW1GL</a>');
        done();
      });
    });

    it('returns image code for an img url', function() {
      webRemix.generate('http://3.bp.blogspot.com/_K_1LxF4TvhU/S7UUE6PYKiI/AAAAAAAADto/XfpdX2CIxqY/' +
        's400/Riley+the+smiling+dog.jpg', function(err, subject) {
        subject.should.equal(' <img src="http://3.bp.blogspot.com/_K_1LxF4TvhU/S7UUE6PYKiI/AAAAAAAADto/XfpdX2CIxqY/' +
          's400/Riley+the+smiling+dog.jpg"><a href="http://3.bp.blogspot.com/_K_1LxF4TvhU/S7UUE6PYKiI/AAAAAAAADto/Xf' +
          'pdX2CIxqY/s400/Riley+the+smiling+dog.jpg" class="media-link" target="_blank">' +
          'http://3.bp.blogspot.com/_K_1LxF4TvhU/S7UUE6PYKiI/AAAAAAAADto/XfpdX2CIxqY/s400/Riley+the+smiling+dog.jpg</a>');
      });
    });

    it('returns a link for an https url', function(done) {
      webRemix.generate('https://example.com', function(err, subject) {
        subject.should.equal(' <a href="https://example.com" target="_blank">https://example.com</a>');
        done();
      });
    });

    it('returns a link for an http url', function(done) {
      webRemix.generate('http://example.com', function(err, subject) {
        subject.should.equal(' <a href="http://example.com" target="_blank">http://example.com</a>');
        done();
      });
    });

    it('returns a heart image for an emotiHeart', function(done) {
      var heart = '&lt;3';
      webRemix.generate(heart, function(err, subject) {
        subject.should.equal(' <img src="/images/heart.png" class="emoti">');
        done();
      });
    });

    it('returns video for a video link', function(done) {
      var video = 'http://blah.com/video.ogv';
      webRemix.generate(video, function(err, subject) {
        subject.should.equal(' <video controls="controls" preload="none" autobuffer><source src="' + video +
          '" type="video/ogg; codecs="vp8, vorbis" /></video><a href="' + video + '" target="_blank">' + video + '</a>');
        done();
      });
    });

    it('returns audio for an audio link', function(done) {
      var audio = 'http://blah.com/audio.ogg';
      webRemix.generate(audio, function(err, subject) {
        subject.should.equal(' <audio controls="controls" preload="none" autobuffer><source src="' + audio +
          '" type="audio/ogg" /></audio><a href="' + audio + '" target="_blank">' + audio + '</a>');
        done();
      });
    });

    it('returns a channel link', function(done) {
      var channel = 'join this #channel';
      webRemix.generate(channel, function(err, subject) {
        subject.should.equal(' join this <a href="/about/channel" target="_blank">#channel</a>');
        done();
      });
    });

    it('returns the plain text for anything else', function(done) {
      webRemix.generate('foo', function(err, subject) {
        subject.should.equal(' foo');
        done();
      });
    });

  });

  describe('.getNickName',function() {
    describe('have /nick', function() {
      describe('/nick paramater is not null', function() {
        describe('the parameter is not empty after striping spaces', function() {

          it('returns the nickname', function(done) {
            var subject = webRemix.getNickName('/nick wangernum');
            subject.should.equal('wangernum');
            done();
          });

          it('truncates nicks at unknown characters', function(done) {
            var subject = webRemix.getNickName('/nick f&f');
            subject.should.equal('f');
            done();
          });

        });

        it('returns an empty string the parameter is empty after stripping spaces', function(done) {
          var subject = webRemix.getNickName('/nick          ');
          subject.length.should.equal(0);
          done();
        });
      });

      it('returns an empty string when /nick parameter is null', function(done) {
        var subject = webRemix.getNickName('/nick');
        subject.length.should.equal(0);
        done();
      });
    });

    it('returns an empty string have no /nick', function(done) {
      var subject = webRemix.getNickName('testtest');
      subject.length.should.equal(0);
      done();
    });
  });

});
