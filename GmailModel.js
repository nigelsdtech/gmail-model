/**
 * Copyright (c) 2016,
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

"use strict"

var google       = require('googleapis'),
    doGoogleAuth = require('do-google-auth'),
    emailjs      = require('emailjs'),
    batch        = require('batchflow')

var method = GmailModel.prototype;

var name
   ,userId
   ,gmail
   ,googleAuth
   ,log
   ,log4js
   ,appSpecificPassword
   ,user
   ,sendServer;



/**
 * Gmail Model
 *
 * @classdesc Interface with Gmail REST API that takes care of authorization.
 * @namespace gmailModel
 * @version  v1
 * @variation v1
 * @this GmailModel
 * @param {object=} options Options for Gmail
 * @param {string} appSpecificPassword - allows you to send emails
 * @param {string} clientSecretFile -
 * @param {string} emailsFrom - 'From' address on emails
 * @param {string} googleScopes -
 * @param {string} name - Name of this mailbox
 * @param {string} tokenDir -
 * @param {string} tokenFile - 
 * @param {string} user - Gmail username (for sending emails)
 * @param {string} userId - Gmail userId (defaults to 'me')
 */

function GmailModel(params) {

  this.name       = params.name
  this.userId     = (params.userId === undefined)? 'me' : params.userId;

  // Needed when sending emails
  this.appSpecificPassword  = params.appSpecificPassword || null
  this.emailsFrom           = params.emailsFrom || null;
  this.user                 = params.user || null


  this.googleAuth = new doGoogleAuth(
    params.googleScopes,
    params.tokenFile,
    params.tokenDir,
    params.clientSecretFile
  );

  this.gmail = google.gmail('v1');


  if (params.log4js) {

    this.log4js = params.log4js
    this.log = this.log4js.getLogger('Mailbox-' + this.name);
    this.log.setLevel(params.logLevel);

  } else {

    var logStub = function (msg) {/*console.log(msg)*/}

    this.log = {
      dev: logStub,
      debug: logStub,
      error: logStub,
      info: logStub,
      trace: logStub
    }
  }

}

/**
 * gmailModel.createLabel
 *
 * @desc Gets the specified attachment.
 *
 * @alias gmailModel.createLabel
 * @memberOf! gmailModel(v1)
 *
 * @param  {object} params - Parameters for request
 * @param  {string} params.labelName - The name of the label to create
 * @param  {callback} callback - The callback that handles the response.
 */
method.createLabel = function (params,callback) {

  var self = this;

  self.log.info('Creating label: ' + params.labelName)

  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  this.googleAuth.authorize(function (err, auth) {

    if (err) { callback(err); return null}

    self.gmail.users.labels.create({
      auth: auth,
      userId: self.userId,
      resource: {
        name: params.labelName
      }
    }, function(err, response) {

      if (err) { callback(err); return null}

      self.log.trace('Returned response:')
      self.log.trace(response)

      self.log.info('Label created: %s', params.labelName)
      callback(null,response.id)
    });
  });
}


/**
 * gmailModel.deleteLabel
 *
 * @desc Gets the specified attachment.
 *
 * @alias gmailModel.deleteLabel
 * @memberOf! gmailModel(v1)
 *
 * @param  {object} params - Parameters for request
 * @param  {string} params.labelId - The id of the label to delete
 * @param  {callback} callback - The callback that handles the response.
 */
method.deleteLabel = function (params,callback) {

  var self = this;

  self.log.info('Deleting label: ' + params.labelId)

  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  this.googleAuth.authorize(function (err, auth) {

    if (err) { callback(err); return null}

    self.gmail.users.labels.delete({
      auth: auth,
      userId: self.userId,
      id: params.labelId
    }, function(err, response) {

      if (err) { callback(err); return null}
      self.log.info('Deleted label: %s', params.labelId)
      callback(null)
    });
  });
}


/**
 * gmailModel.getAttachment
 *
 * @desc Gets the specified attachment.
 *
 * @alias gmailModel.getAttachment
 * @memberOf! gmailModel(v1)
 *
 * @param  {object} params - Parameters for request
 * @param  {string} params.attachmentId - The ID of the attachment being retrieved.
 * @param  {string} params.messageId - The message the attachment belongs to being retrieved.
 * @param  {callback} callback - The callback that handles the response.
 */
method.getAttachment = function (params,callback) {

  var self = this;

  self.log.debug('Getting attachment')

  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  this.googleAuth.authorize(function (err, auth) {

    if (err) { callback(err); return null}

    self.gmail.users.messages.attachments.get(
      {
        auth: auth,
        userId: self.userId,
        id: params.attachmentId,
        messageId: params.messageId
      },
      function(err, response) {
        if (err) {
          console.log('gmailModel.getAttachment: The API returned an error: ' + err);
        } else {
          self.log.trace('Returned response:')
          self.log.trace(response)
          callback(null,response)
        }
      }
    )
  })
}


/**
 * gmailModel.getLabelId
 *
 * @desc Gets the ID of the specified label.
 *
 * @alias gmailModel.getLabelId
 * @memberOf! gmailModel(v1)
 *
 * @param  {object} params - Parameters for request
 * @param  {string} params.labelName - The name of the label for which an ID is being retrieved.
 * @param  {string} params.createIfNotExists - Create the label if it doesn't exist
 * @param  {callback} callback - The callback that handles the response.
 */
method.getLabelId = function (params,callback) {

  var self = this;

  self.log.debug('Getting ID for label')

  self.listLabels ( function (err, labels) {

    if (err) { callback(err); return null }

    var retErr, labelId;

    if (labels.length != 0) {

      self.log.debug('gmail.getLabelId: Found %s labels', labels.length)

      for (var i = 0; i < labels.length; i++) { 
        var label = labels[i];
        if ( label.name == params.labelName ) {
          self.log.debug('Label matches - %s (%s)', label.name, label.id);
          callback(null,label.id)
          return null
        }
      };
    }

    // Getting this far means the label doesn't exist
    self.log.info('No labels found.');

    if (params.createIfNotExists) {

      self.createLabel({
        labelName: params.labelName
      }, function (err, labelId) {
        if (err) {
          self.log.error('gmailModel.getLabelId error: ' + err);
          callback(err)
        } else {
          callback(null,labelId)
        }
      });
    }
  });
}

/**
 * gmailModel.getMessage
 *
 * @desc Get a message from the specified message ID.
 *
 * @alias gmailModel.getMessage
 * @memberOf! gmailModel(v1)
 *
 * @param  {object}   params - Parameters for request
 * @param  {string}   params.messageId - The message ID.
 * @param  {string=}  params.format - 'full', 'metadata', 'minimal', 'raw'.
 * @param  {string[]} params.metadataHeaders - specifc headers to be returned.
 * @param  {string[]} params.retFields - Optional. The specific resource fields to return in the response.
 * @param  {callback} callback - The callback that handles the response.
 */
method.getMessage = function (params,callback)  {

  var self = this;

  self.log.debug('gmailModel.getMessage: Getting message')

  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  this.googleAuth.authorize(function (err, auth) {

    if (err) { callback(err); return null}

    var gParams = {
      auth: auth,
      userId: self.userId,
      id: params.messageId,
      prettyPrint: false
    }

    if (params.hasOwnProperty('format'))          gParams.format          = params.format;
    if (params.hasOwnProperty('metadataHeaders')) gParams.metadataHeaders = params.metadataHeaders;
    if (params.hasOwnProperty('retFields'))       gParams.fields          = params.retFields.join(",");

    self.gmail.users.messages.get(gParams, function(err, response) {

        if (err) {
          console.log('The API returned an error: ' + err);
	  callback(err)
        } else {
          self.log.trace('Returned response:')
          self.log.trace(response)
          callback(null, response)
        }
      }
    )
  })

}


/**
 * gmailModel.getMessages
 *
 * @desc Get multiple messages from the specified message IDs.
 *
 * @alias gmailModel.getMessages
 * @memberOf! gmailModel(v1)
 *
 * @param  {object}   params - Parameters for request
 * @param  {string[]} params.messageIds - The message Ids.
 * @param  {string=}  params.format - 'full', 'metadata', 'minimal', 'raw'.
 * @param  {string[]} params.metadataHeaders - specifc headers to be returned.
 * @param  {string[]} params.retFields - Optional. The specific resource fields to return in the response.
 * @param  {callback} callback - The callback that handles the response.
 */
method.getMessages = function (params,callback)  {

    var self = this;

    var bf = batch(params.messageIds);

    bf.parallel(10)

    var errFound = false

    bf.each( function(idx,id,done) {

      var moddedParams = {
        messageId: id
      }

      if (params.hasOwnProperty('format'))          moddedParams.format          = params.format;
      if (params.hasOwnProperty('metadataHeaders')) moddedParams.metadataHeaders = params.metadataHeaders;
      if (params.hasOwnProperty('retFields'))       moddedParams.retFields       = params.retFields;

      self.getMessage(moddedParams, function (err, message) {
        if (err) { throw new Error(err) }
        if (!errFound) done(message); else done()
      })

    }).error (function (err) {
      if (!errFound) callback(err)
      errFound = true;
    }).end (function (messages) {
      if (!errFound) callback(null,messages)
    })
}

/**
 * gmailModel.listLabels
 *
 * @desc Lists the labels in the user's account.
 *
 * @alias gmailModel.listLabels
 * @memberOf! gmailModel(v1)
 *
 * @param  {callback} callback - The callback that handles the response.
 */
method.listLabels = function (callback)  {

  var self = this;

  self.log.debug('Listing labels')

  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  this.googleAuth.authorize( function (err, auth) {

    if (err) { callback(err); return null}

    self.gmail.users.labels.list({
      auth: auth,
      userId: self.userId,
    }, function(err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        callback(err)
        return;
      }
      var labels = response.labels;
      callback(null,labels)

    })
  })
}


/**
 * gmailModel.listMessages
 *
 * @desc Lists the messages in the user's account matching the specified search criteria.
 *
 * @alias gmailModel.listMessages
 * @memberOf! gmailModel(v1)
 *
 * @param  {object}   params - Parameters for request
 * @param  {string}   params.freetextSearch - Gmail search parameters
 * @param  {string}   params.labelIds - The ID of the labels on which to filter the search.
 * @param  {string}   params.maxResults - Max results to return from the search
 * @param  {string[]} params.retFields - Optional. The specific resource fields to return in the response.
 * @param  {callback} callback - The callback that handles the response.
 */
method.listMessages = function (params,callback)  {

  var self = this;

  self.log.debug('Listing messages')
  self.log.trace('With search criteria: ' + params.freetextSearch)
  self.log.trace('And callback: ' + callback)

  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  this.googleAuth.authorize( function (err, auth) {

    if (err) { callback(err); return null }

    var gParams = {
      auth: auth,
      userId: self.userId,
      prettyPrint: false
    }

    if (params.hasOwnProperty('freetextSearch')) gParams.q          = params.freetextSearch;
    if (params.hasOwnProperty('labelIds'))       gParams.labelIds   = params.labelIds;
    if (params.hasOwnProperty('maxResults'))     gParams.maxResults = params.maxResults;
    if (params.hasOwnProperty('retFields'))      gParams.fields     = params.retFields.join(',');

    self.gmail.users.messages.list( gParams, function(err, response) {
        if (err) {
          console.log('The API returned an error: ' + err);
          return;
        }

        var messages = []
        if (response.messages) {
          messages = response.messages;
        }

        callback(null,messages)

    });
  });

}

/**
 * gmailModel.sendMessage
 *
 * @desc Send an email
 *
 * @alias gmailModel.sendMessages
 * @memberOf! gmailModel(v1)
 *
 * @param  {object} params - Parameters for request
 * @param  {string} params.body - Email body
 * @param  {string} params.subject - subject
 * @param  {string} params.to - The recipient
 * @param  {callback} callback - The callback that handles the response. Returns callback(err, message)
 * @returns {string} message - The callback that handles the response.
 */
method.sendMessage = function (params,callback)  {

  var self = this;

  self.log.debug('Sending message')

  if (!this.sendServer) {
    this.sendServer = emailjs.server.connect({
      user:     self.user,
      password: self.appSpecificPassword,
      host:     'smtp.gmail.com',
      ssl:      true,
      port:     465
    });
  }

  var from    = (self.emailsFrom)? self.emailsFrom : params.from,
      to      = params.to,
      subject = params.subject;

  this.sendServer.send({
    from:    from,
    to:      to,
    subject: subject,
    attachment: [{
      data: params.body,
      alternative: true
    }]
  }, function(err, message) {

    if (err) { callback(err); return null; }

    self.log.info("Email sent");
    callback(null, message);
  });

}

/**
 * gmailModel.trashMessages
 *
 * @desc Trashes messages passed in
 *
 * @alias gmailModel.trashMessages
 * @memberOf! gmailModel(v1)
 *
 * @param  {object}   params - Parameters for request
 * @param  {string[]} params.messageIds - Messages to trash
 * @param  {string[]} params.retFields - Optional. The specific resource fields to return in the response.
 * @param  {callback} callback - The callback that handles the response.
 */
method.trashMessages = function (params,callback)  {

  var self = this

  var commonParams = {
     userId: self.userId,
  }
  if (params.hasOwnProperty('retFields')) commonParams.fields = params.retFields.join(',');

  // Batch up the requests so as not to smash gmail
  var bf = batch(params.messageIds);

  bf.parallel(10)

  bf.each( function(idx,id,done) {
    // Authorize a client with the loaded credentials, then call the
    // Gdrive API.
    self.googleAuth.authorize(function (err, auth) {

      if (err) { callback(err); return null }

      var gParams  = commonParams
      gParams.auth = auth,
      gParams.id   = id

      self.gmail.users.messages.trash(gParams, function(err, response) {
        if (err) { callback(err); return null }
        done(response)
      })

    });

  }).end (function (responses) {
    callback(null,responses)
  })

}


/**
 * gmailModel.updateMessage
 *
 * @desc Updates a message
 *
 * @alias gmailModel.updateMessage
 * @memberOf! gmailModel(v1)
 *
 * @param  {object=}  params                - Parameters for request
 * @param  {string[]} params.addLabelIds    - List of label ID's to add to the message
 * @param  {string}   params.messageId      - Message to modify. Pass in an array to achieve batch modification
 * @param  {string[]} params.removeLabelIds - List of label ID's to remove from the message
 * @param  {callback} callback - The callback that handles the response.
 */
method.updateMessage = function (params,callback)  {

  var self = this

  self.log.info('Updating message %s', params.messageId)

  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  this.googleAuth.authorize(function (err, auth) {

    if (err) { callback(err); return null}

    var modFn = "modify"

    var gParams = {
      auth: auth,
      userId: self.userId,
      resource: {
        addLabelIds: params.addLabelIds,
        removeLabelIds: params.removeLabelIds
      }
    }

    // Invoke the "batchModify" API call if the messageId was an array
    if (Array.isArray(params.messageId)) {
      modFn = "batchModify"
      gParams.resource.ids = params.messageId
    } else {
      gParams.id = params.messageId
    }

    self.gmail.users.messages[modFn](gParams, function(err, response) {
      if (err) {
        var errMsg = 'gmailModel.updateMessage: The google API returned an error: ' + err;
        self.log.error(errMsg)
        callback(err)
        return null
      }

      self.log.trace('Returned response:')
      self.log.trace(response)
      callback(null, response)
    });
  });
}





// export the class
module.exports = GmailModel;
