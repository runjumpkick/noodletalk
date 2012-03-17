$(function() {
  var socket = io.connect('http://localhost'),
      messagesUnread = 0,
      currentNickname = 'Anonymous',
      userList = ['Anonymous'],
      tabComplete = new TabComplete(userList),
      logLimit = 80;
      myPost = false;

  var updateMessage = function(data) {
    // Update the message
    var message = $.trim(data.message);

    if(currentNickname !== data.nickname){
      currentNickname = data.nickname;
    }

    if(message.length > 0) {
      if(data.is_action) {
        var msg = $('<li class="action font' + data.font + '" data-created="' + data.created +
                    '"><p></p><a href="#" class="delete">delete</a></li>');
        msg.find('p').html(message);

        // if this is a nick change, set the nick in the dom for the user
        if(data.action_type === 'nick' && myPost) {
          $('body').data('nick', data.nickname.replace(/\s/, ''));
          myPost = false;
        }

      } else {
        var highlight = '';
        var nickReference = data.message.split(': ')[0];

        if(nickReference) {
          nickReference = nickReference.replace(/\s/, '');
          if(nickReference === $('body').data('nick') && !myPost){
            highlight = 'nick-highlight';
          }
        }

        var msg = $('<li class="font' + data.font + ' ' + highlight +
                    '" data-created="' + data.created +
                    '"><img><span class="nick">' + data.nickname + '</span><time>' +
                    getMessageDateTimeString(data) + '</time><p></p>' +
                    '<a href="#" class="delete">delete</a></li>');
        msg.find('img').attr('src', data.gravatar);
        msg.find('p').html(message);
        myPost = false;
      }

      // Apply log limiter
      $('body ol li:nth-child(n+' + logLimit +')').remove();

      // Add new message
      $('body ol').prepend(msg);
    }

    // Update the user count
    $('#info .connected span').text(parseInt(data.connected_clients, 10));
    new TabComplete(userList);

    messagesUnread += 1;
    document.title = 'Noodle Talk (' + messagesUnread + ')';
  };

  $('#login').click(function() {
    navigator.id.getVerifiedEmail(function(assertion) {
      if(assertion) {
        var loginForm = $('#login-form');

        loginForm.find('input').val(assertion);
        $.post('/login', loginForm.serialize(), function(data) {
          document.location.href = '/';
        });
      }
    });
  });

  $('form input').focus(function() {
    document.title = 'Noodle Talk';
    messagesUnread = 0;
  });

  $('#help').click(function() {
    $(this).fadeOut();
  });

  $('form').submit(function(ev) {
    ev.preventDefault();
    var self = $(this);

    var helpMatcher = /^(\/help)/i;
    var clearMatcher = /^(\/clear)/i;

    // if this is a help trigger, open up the help window
    if(self.find('input').val().match(helpMatcher)) {
      $('#help').fadeIn();
      self.find('input').val('');
    // if this is a clear trigger, clear all messages
    } else if(self.find('input').val().match(clearMatcher)) {
      $('ol li').remove();
      self.find('input').val('');

    // this is a submission
    } else {
      myPost = true;
      $.ajax({
        type: 'POST',
        url: self.attr('action'),
        data: self.serialize(),
        success: function(data) {
          $('form input').val('');
          document.title = 'Noodle Talk';
          messagesUnread = 0;
        },
        dataType: 'json'
      });
    }
  });

  $('ol').on('click', 'li a.delete', function(ev) {
    ev.preventDefault();
    $(this).closest('li').remove();
  });

  socket.on('connect', function () {
    socket.on('userlist', function (data) {
      userList = data;
    });
    socket.on('message', function (data) {
      updateMessage(data);
    });
  });

});
