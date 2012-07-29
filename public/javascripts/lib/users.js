'use strict';

define(['jquery', 'messages'],
  function($, messages) {

  var userList = [];
  var myUserList = [];
  var userCount = 0;
  var noodlers = $('#noodlers');
  var messageForm = $('#message');

  // Autocomplete support
  var TabComplete = function(myUserList) {
    var listIndex = 0;
    var input = messageForm.find('form > input')[0];
    var userListIndex = -1;
    var currentCompare;

    var findNext = function() {
      for (var i = 0; i < myUserList.length; i ++) {
        if (myUserList[i].toLowerCase().indexOf(currentCompare.toLowerCase()) > -1) {
          userListIndex = i;
          input.value = myUserList[i].toLowerCase() + ': ';
          break;
        }
      }
    };

    this.reset = function() {
      userListIndex = 0;
      currentCompare = undefined;
    };

    // if a user hasn't logged in, the input doesn't exist, so we need to check for it.
    if (input) {
      input.addEventListener('keydown', function(e) {
        if (e.keyCode === 9 && !(e.ctrlKey || e.altKey)) {
          e.preventDefault();

          if (userListIndex === -1) {
            currentCompare = input.value.toLowerCase();
          }

          var oldIndex = userListIndex;
          findNext();
          if (userListIndex === oldIndex) {
            userListIndex = -1;
            findNext();
          }
        } else {
          userListIndex = -1;
        }
      });
    }
  };

  var updateUserList = function() {
    noodlers.html('');

    for (var i = 0; i < userList.length; i ++) {
      var noodleItem = $('<li><img src="' + userList[i].avatar + '?size=45">' + userList[i].nickname + '</li>');
      noodlers.append(noodleItem);
    }

    if (userList.length < userCount) {
      noodlers.append('<li><img src="/images/anon.png"> <span>' +
        (userCount - userList.length) + ' Anonymous</span></li>');
    }
  };

  var keepListSane = function() {
    updateUserList();
    new TabComplete(myUserList);
  };

  var self = {
    setUserCount: function(data) {
      userCount = data;
      keepListSane();
    },

    setUserList: function(data) {
      userList = data.user_list || data;

      myUserList = [];

      for (var i = 0; i < userList.length; i ++) {
        myUserList.push(userList[i].nickname.toLowerCase());
      }

      keepListSane();
    }
  };

  return self;
});
