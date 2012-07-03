$(function() {
  var socket = io.connect(location.protocol + '//' + location.hostname +
               (location.port ? ':' + location.port : ''));
  var currentChannel = $('body').data('channel');
  var myEmailHash = $('body').data('email-hash');
  var initiatingChats = [];
  var messagesUnread = 0;
  var userList = [];
  var channelList = [];
  var myUserList = [];
  var userCount = 0;
  var logLimit = 80;
  var myPost = false;
  var mediaIframeMatcher = /<iframe\s.+><\/iframe>/i;
  var mediaObjectMatcher = /<object\s.+><\/object>/i;
  var mediaVideoMatcher = /<video\s.+>.+<\/video>/i;
  var mediaAudioMatcher = /<audio\s.+>.+<\/audio>/i;
  var mediaImageMatcher = /\.((jpg)|(jpeg)|(png)|(gif))<\/a>/i;
  var isSubmitting = false;

  var clearUnreadMessages = function() {
    document.title = '#' + currentChannel;
    messagesUnread = 0;
  };

  var updateMedia = function(data) {
    var mediaColumn = $('#media ol');
    var message = $.trim(data.message);
 
    // Update the media
    if(mediaIframeMatcher.exec(message) !== null ||
      mediaObjectMatcher.exec(message) !== null ||
      mediaVideoMatcher.exec(message) !== null ||
      mediaAudioMatcher.exec(message) !== null ||
      (mediaImageMatcher.exec(message) !== null &&
      message.indexOf('class="emoti"') === -1)) {
      var mediaItem = $('<li class="font' + data.font + '" data-created="' +
        data.created +'"></li>');

      if (mediaColumn.find('li[data-created="' + data.created + '"').length === 0) {
        mediaColumn.prepend(mediaItem.html(message + '<a href="#" class="delete">x</a>'));
        if (mediaColumn.find('li').length > 7) {
          mediaColumn.find('li:last-child').remove();
        }
      }
    }
  };

  var updateMessage = function(data, highlight) {
    // Update the message
    var message = $.trim(data.message);
    var msg = '';

    if (data.is_client_only) {
      highlight = 'nick-highlight';
    }

    if (message.length > 0 && $('ol li[data-created="' + data.created + '"]').length === 0) {
      if (data.is_client_only) {
        msg = $('<li class="client ' + data.font + ' ' + highlight + '" data-created="' +
                    data.created + '"><p></p></li>');
        msg.find('p').html(message);
      } else if (data.is_action) {
        msg = $('<li class="action font' + data.font + '" data-created="' + data.created +
                '"><p></p></li>');
        msg.find('p').html(message);

        // if this is a nick change, set the nick in the dom for the user
        if (data.action_type === 'nick' && myPost) {
          var oldNick = $('body').data('nick');
          $('body').data('nick', data.nickname.replace(/\s/, ''));

          // The user list clears out every hour so let's remove the user's old name from the list
          // if they succesfully updated
          myUserList = userList;
        }

      } else {
        var nickReference = data.message.split(': ')[0];

        if (nickReference) {
          nickReference = nickReference.replace(/\s/, '');
          // Allow highlighting of a message even if it is to yourself
          if (nickReference === $('body').data('nick')) {
            highlight = 'nick-highlight';
          }
        }

        msg = $('<li class="font' + data.font + ' ' + highlight +
          '" data-created="' + data.created +
          '"><img><span class="nick">' + data.nickname + '</span><time>' +
          getMessageDateTimeString(data) + '</time><p></p></li>');
        msg.find('img').attr('src', data.gravatar);
        msg.find('p').html(message);
      }

      // Apply log limiter
      $('body ol li:nth-child(n+' + logLimit +')').remove();

      // Add new message
      $('body #messages ol').prepend(msg);

      // Add media if relevant
      updateMedia(data);
    }

    if (myPost) {
      clearUnreadMessages();
    } else {
      messagesUnread += 1;
      document.title = '(' + messagesUnread + ') #' + $('body').data('channel');
    }
    myPost = false;
    checkVersion();
  };

  // if the user just landed on this page, get the recent messages
  $.get('/about/' + $('body').data('channel') + '/recent', function(data) {
    var messages = data.messages;
    for (var i=0; i < messages.generic.length; i++) {
      updateMessage(messages.generic[i]);
    }

    $('#whoami h3.avatar').text($('body').data('avatar'));
    $('#whoami h3.nickname').text($('body').data('nick'));

    // Update the user list
    userList = data.user_list;

    // Keep list sane, compile tab completion, etc.
    keepListSane();
  });

  $('#login').click(function() {
    navigator.id.getVerifiedEmail(function(assertion) {
      if (assertion) {
        var loginForm = $('#login-form');

        loginForm.find('input:first').val(assertion);
        $.post('/about/' + $('body').data('channel') + '/login',
          loginForm.serialize(), function (data) {
          document.location.href = '/about/' + data.channel;
        });
      }
    });
    return false;
  });

  $(window, 'input').focus(function() {
    clearUnreadMessages();
  });

  $('#message form').submit(function(ev) {
    ev.preventDefault();
    var self = $(this);

    checkCommands(self);

    if(!commandIsMatched && !isSubmitting) {
      // this is a submission
      isSubmitting = true;
      myPost = true;
      hideAllCommands();

      $.ajax({
        type: 'POST',
        url: self.attr('action'),
        data: self.serialize(),
        success: function(data) {
          $('form input').val('');
          clearUnreadMessages();
          isSubmitting = false;
        },
        dataType: 'json'
      });
    }
    commandIsMatched = false;
  });

  $('ol').on('click', 'li a.delete', function(ev) {
    ev.preventDefault();
    $(this).closest('li').remove();
  });

  socket.on('connect', function () {
    socket.on('userlist', function (data) {
      userList = data;
      myUserList = [];
      for (var i=0; i < userList.length; i++) {
        myUserList.push(userList[i].nickname.toLowerCase());
      }
      keepListSane();
    });

    socket.on('usercount', function (data) {
      userCount = data;
      keepListSane();
    });

    socket.on('message', function (data) {
      updateMessage(data);
    });

    socket.on('channels', function(data) {
      channelList = data;
      updateChannelList(data);
    });

    socket.on('private', function (data) {
      if (data) {
        var chatNum = initiatingChats.indexOf(data);
        if (chatNum > -1) {
          initiatingChats.splice(chatNum, 1);
        } else {
          var privateParts = data.split('-');
          if (myEmailHash === privateParts[1] || myEmailHash === privateParts[2]) {
            var hostNick = 'Someone';
            var hostHash = privateParts[1];

            if (privateParts[1] === myEmailHash) {
              hostHash = privateParts[2];
            }

            for (var i = 0; i < userList.length; i ++) {
              if (hostHash === userList[i].emailHash) {
                hostNick = userList[i].nickname;
              }
            }

            // is_client_only messages are ephemeral UI-generated notifications
            // which don't come directly from the server but are in response to
            // something client-side.
            var message = {
              created: new Date().getTime(),
              font: 'font2',
              message: hostNick + ' has sent a new private message to you! ' +
                '<a href="/about/' + data + '" target="_' + data +
                '">Click here to participate.</a>',
              is_client_only: true
            };
            updateMessage(message);
          }
        }
      }
    });

    socket.emit('join channel', currentChannel);
  });

  var updateUserList = function() {
    var noodlers = $('#noodlers');
    noodlers.html('');
    for (var i=0; i < userList.length; i ++) {
      var noodleItem = $('<li><img src=""> <a href="#" title=""></a></li>');
      noodleItem.find('img').attr('src', userList[i].avatar + "?size=24");
      noodleItem.find('a').text(userList[i].nickname);
      if (myEmailHash !== userList[i].emailHash) {
        var hashes = [myEmailHash, userList[i].emailHash].sort().join('-');
        noodleItem.find('a')
          .addClass('other')
          .attr('href', '/about/private-' + hashes)
          .attr('target', '_' + hashes)
          .attr('title', userList[i].nickname)
          .click(function (e) {
            initiatePrivateChat($(this));
          });
      } else {
        noodleItem.find('a')
          .click(function (e) {
            e.preventDefault();
            return false;
          })
          .attr('title', 'This is you');
      }
      noodlers.append(noodleItem);
    }
    if (userList.length < userCount) {
      noodlers.append('<li><img src="/images/anon.png"> <span>' +
        (userCount - userList.length) + ' Anonymous</span></li>');
    }
  };

  var updateChannelList = function() {
    var channels = $('#channels');
    channels.html('');
    for (var i=0; i < channelList.length; i++) {
      var channelItem = $('<li><a href="" target="_blank" title=""></a></li>');
      channelItem.find('a').attr('href', '/about/' + channelList[i].name).text(channelList[i].name +
        ' (' + parseInt(channelList[i].userCount, 10) + ')');
      channelItem.find('a').attr('title', channelList[i].name);
      channels.append(channelItem);
    }
  };

  var keepListSane = function() {
    updateUserList();
    new TabComplete(myUserList);
  };

  // close info lists
  $('.info-block a.close').click(function() {
    $(this).parent().fadeOut();
  });

  $('form input').click(function() {
    $('.info-block').fadeOut();
  });

  // autofill the message with a help command
  $('#help li').click(function() {
    $('form input').val($(this).data('action')).focus();
    hideAllCommands();
  });

  // Clicking another user in the user list initiates a private chat.
  var initiatePrivateChat = function (l) {
    var chatHash = $(l).attr('href').replace('/about/', '');
    socket.emit('private', {
      channel: currentChannel,
      privateChannel: chatHash
    });
    initiatingChats.push(chatHash);
    return true;
  };
});
