/*
 * Copyright (c) 2013 The Native Client Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

'use strict';

lib.rtdep('lib.f',
          'hterm');

// CSP means that we can't kick off the initialization from the html file,
// so we do it like this instead.
window.onload = function() {
  lib.init(function() {
    Bash.init();
  });
};

/**
 * The Bash-powered terminal command.
 *
 * This class defines a command that can be run in an hterm.Terminal instance.
 *
 * @param {Object} argv The argument object passed in from the Terminal.
 */
function Bash(argv) {
  this.argv_ = argv;
  this.io = null;
};

var embed;

/**
 * Prefix for text from the pipe mount.
 *
 * @private
 */
Bash.prefix_ = 'bash:';

/**
 * Static initialier called from bash.html.
 *
 * This constructs a new Terminal instance and instructs it to run the Bash
 * command.
 */
Bash.init = function() {
  var profileName = lib.f.parseQuery(document.location.search)['profile'];
  var terminal = new hterm.Terminal(profileName);
  terminal.decorate(document.querySelector('#terminal'));

  // Useful for console debugging.
  window.term_ = terminal;

  // We don't properly support the hterm bell sound, so we need to disable it.
  terminal.prefs_.definePreference('audible-bell-sound', '');

  terminal.setAutoCarriageReturn(true);
  terminal.setCursorPosition(0, 0);
  terminal.setCursorVisible(true);
  terminal.runCommandClass(Bash, document.location.hash.substr(1));

  return true;
};

/**
 * Handle messages sent to us from NaCl.
 *
 * @private
 */
Bash.prototype.handleMessage_ = function(e) {
  if (e.data.indexOf(Bash.prefix_) != 0) return;
  var msg = e.data.substring(Bash.prefix_.length);
  term_.io.print(msg);
}

/**
 * Handle load end event from NaCl.
 */
Bash.prototype.handleLoadEnd_ = function(e) {
  if (typeof(this.lastUrl) != 'undefined')
    term_.io.print("\n");
  term_.io.print("Loaded.\n");
}

/**
 * Handle load progress event from NaCl.
 */
Bash.prototype.handleProgress_ = function(e) {
  var url = e.url.substring(e.url.lastIndexOf('/') + 1);
  //term_.io.print("progress x" + typeof(this.lastUrl) + "x\n");
  if (this.lastUrl != url) {
    if (url != '') {
      if (this.lastUrl)
        term_.io.print("\n");
      term_.io.print("Loading " + url + " .");
    }
  } else {
    term_.io.print(".");
  }
  if (url)
  this.lastUrl = url;
}

/**
 * Handle crash event from NaCl.
 */
Bash.prototype.handleCrash_ = function(e) {
 if (embed.exitStatus == -1) {
   term_.io.print("Program crashed (exit status -1)\n")
 } else {
   term_.io.print("Program exited (status=" + embed.exitStatus + ")\n");
 }
}

function got(str) {
  embed.postMessage(Bash.prefix_ + str);
}

/*
 * This is invoked by the terminal as a result of terminal.runCommandClass().
 */
Bash.prototype.run = function() {
  this.io = this.argv_.io.push();

  embed = document.createElement('object');
  embed.width = 0;
  embed.height = 0;
  embed.addEventListener('message', this.handleMessage_.bind(this));
  embed.addEventListener('progress', this.handleProgress_.bind(this));
  embed.addEventListener('loadend', this.handleLoadEnd_.bind(this));
  embed.addEventListener('crash', this.handleCrash_.bind(this));
  embed.data = 'bash.nmf';
  embed.type = 'application/x-nacl';

  var param_tty = document.createElement('param');
  param_tty.name = 'ps_tty_prefix';
  param_tty.value = Bash.prefix_;
  embed.appendChild(param_tty);

  var param_stdin = document.createElement('param');
  param_stdin.name = 'ps_stdin';
  param_stdin.value = '/dev/tty';
  embed.appendChild(param_stdin);

  var param_stdout = document.createElement('param');
  param_stdout.name = 'ps_stdout';
  param_stdout.value = '/dev/tty';
  embed.appendChild(param_stdout);

  var param_stderr = document.createElement('param');
  param_stderr.name = 'ps_stderr';
  param_stderr.value = '/dev/tty';
  embed.appendChild(param_stderr);

  var param_verbosity = document.createElement('param');
  param_verbosity.name = 'ps_verbosity';
  param_verbosity.value = '2';
  embed.appendChild(param_verbosity);

  document.body.appendChild(embed);

  this.io.onVTKeystroke = got;
};
