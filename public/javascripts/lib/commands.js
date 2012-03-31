// All functionality that doesn't require backend requests but triggers an action
var commandIsMatched = false;
var helpMatcher = /^(\/help)/i;
var clearMatcher = /^(\/clear)/i;
var usersMatcher = /^(\/users)/i;
var logoutMatcher = /^(\/logout)/i;

var commandMatched = function(matcher) {
  if ($('form input[name="message"]').val().match(matcher)) {
    return true;
  }
  return false;
}

var checkCommands = function(form) {
  // if this is a help trigger, open up the help window
  if (commandMatched(helpMatcher)) {
    $('#help').fadeIn();
    commandIsMatched = true;

  // if this is a clear trigger, clear all messages
  } else if (commandMatched(clearMatcher)) {
    $('ol li').remove();
    commandIsMatched = true;

  // if this is a users trigger, display the user list
  } else if (commandMatched(usersMatcher)) {
    $('#userList').fadeIn();
    commandIsMatched = true;
  
  // if this is a logout trigger, log the user out
  } else if(commandMatched(logoutMatcher)) {
    commandIsMatched = true;
    document.location.href = '/logout';
  }

  if (commandIsMatched) {
    form.find('input').val('');
  }
};

var hideAllCommands = function() {
  $('#help').fadeOut();
  $('#userList').fadeOut();
}
