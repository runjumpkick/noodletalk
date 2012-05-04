// Autocomplete support
var TabComplete = function(myUserList) {
  var listIndex = 0;
  var input = $('#message > form > input')[ 0 ];
  var userListIndex = -1;
  var currentCompare;

  function findNext() {
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
