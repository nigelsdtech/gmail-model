"use strict"

var google       = require('googleapis');
var doGoogleAuth = require('do-google-auth');

var method = GmailModel.prototype;

var name
  , userId
  , gmail
  , googleAuth
  , log
  , log4js;




function GmailModel(params) {

  this.name      = params.name
  this.userId    = params.userId

  googleAuth = new doGoogleAuth(
    params.googleScopes,
    params.tokenFile,
    params.tokenDir, 
    params.clientSecretFile
  ); 

  this.googleAuth = params.googleAuth;

  this.gmail = google.gmail('v1');


  this.log4js = params.log4js
  this.log = this.log4js.getLogger('Mailbox-' + this.name);
  this.log.setLevel(params.logLevel);
}


/**
 * Lists the labels in the user's account.
 * 
 */
method.listLabels = function ()  {

  var self = this;

  self.log.info('Listing labels')

  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  googleAuth.authorize( function (auth) {

    self.log.info('Authorized')
    self.gmail.users.labels.list({
      auth: auth,
      userId: self.userId,
    }, function(err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        return;
      }
      var labels = response.labels;
      if (labels.length == 0) {
        console.log('No labels found.');
      } else {
        console.log('Labels:');
        for (var i = 0; i < labels.length; i++) {
          var label = labels[i];
          console.log('- %s (%s)', label.name, label.id);
        }
      }
    })
  })
}




// export the class
module.exports = GmailModel;
