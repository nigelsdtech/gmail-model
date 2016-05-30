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

const google       = require('googleapis'),
      doGoogleAuth = require('do-google-auth'),
      emailjs      = require('emailjs')

var method = GmailModel.prototype;

var name
   ,userId
   ,gmail
   ,googleAuth
   ,log
   ,log4js
   ,appSpecificPassword
   ,user;



/**
 * Gmail Model
 *
 * @classdesc Interface with Gmail REST API that takes care of authorization.
 * @namespace gmailModel
 * @version  v1
 * @variation v1
 * @this GmailModel
 * @param {object=} options Options for Gmail
 */

function GmailModel(params) {

  this.name      = params.name
  this.userId    = params.userId

  this.user      = params.user
  this.appSpecificPassword  = params.appSpecificPassword

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
  googleAuth.authorize(function (err, auth) {

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
  googleAuth.authorize(function (err, auth) {

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
  googleAuth.authorize(function (err, auth) {

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

      labels.forEach ( function (elem, idx, array) {
        if ( elem.name == params.labelName ) {
          self.log.debug('Label matches - %s (%s)', elem.name, elem.id);
          callback(null,elem.id)
          return null
        }
      });

    } else {

      self.log.info('No labels found.');

      // Getting this far means the label doesn't exist
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
 * @param  {object} params - Parameters for request
 * @param  {string} params.messageId - The message ID.
 * @param  {callback} callback - The callback that handles the response.
 */
method.getMessage = function (params,callback)  {

  var self = this;

  self.log.debug('gmailModel.getMessage: Getting message')

  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  googleAuth.authorize(function (err, auth) {

    if (err) { callback(err); return null}

    self.gmail.users.messages.get(
      {
        auth: auth,
        userId: self.userId,
        id: params.messageId
      },
      function(err, response) {
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
  googleAuth.authorize( function (err, auth) {

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
 * @param  {object} params - Parameters for request
 * @param  {string} params.labelIds - The ID of the labels on which to filter the search.
 * @param  {string} params.freetextSearch - Gmail search parameters
 * @param  {callback} callback - The callback that handles the response.
 */
method.listMessages = function (params,callback)  {

  var self = this;

  self.log.debug('Listing messages')
  self.log.debug('With search criteria: ' + params.freetextSearch)

  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  googleAuth.authorize(function (err, auth) {

    if (err) { callback(err); return null }

    var gParams = {
      auth: auth,
      userId: self.userId,
    }

    if (params.hasOwnProperty('freetextSearch')) gParams.q          = params.freetextSearch;
    if (params.hasOwnProperty('labelIds'))       gParams.labelIds   = params.labelIds;
    if (params.hasOwnProperty('maxResults'))     gParams.maxResults = params.maxResults;

    self.gmail.users.messages.list( gParams, function(err, response) {
        if (err) {
          console.log('The API returned an error: ' + err);
          return;
        }

        var messages

        if (response.resultSizeEstimate == 0) {
          messages = []
        } else {
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
 * @param  {string} params.from - The sender
 * @param  {string} params.to - The recipient
 * @param  {string} params.subject - subject
 * @param  {string} params.body - Email body
 * @param  {callback} callback - The callback that handles the response.
 */
method.sendMessage = function (params,callback)  {

  var self = this;

  self.log.debug('Sending message')

  var server = emailjs.server.connect({
    user:     self.user,
    password: self.appSpecificPassword,
    host:     'smtp.gmail.com',
    ssl:      true
  });

  var from    = params.from,
      to      = params.to,
      subject = params.subject;

  server.send({
    from:    params.from,
    to:      params.to,
    subject: params.subject,
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
 * gmailModel.trashMessage
 *
 * @desc Trashes a message
 *
 * @alias gmailModel.trashMessage
 * @memberOf! gmailModel(v1)
 *
 * @param  {object} params - Parameters for request
 * @param  {string} params.messageId   - Message to trash
 * @param  {callback} callback - The callback that handles the response.
 */
method.trashMessage = function (params,callback)  {

  var self = this

  googleAuth.authorize(function (err, auth) {

    if (err) { callback(err); return null }

    self.gmail.users.messages.trash({
      auth: auth,
      userId: self.userId,
      id: params.messageId
    }, function(err, response) {

      if (err) {
        var errMsg = 'gmailModel.trashMessage: The google API returned an error: ' + err;
        self.log.error(errMsg)
        callback(err)
        return null
      }

      callback(null,message);
    });
  });
}


/**
 * gmailModel.updateMessage
 *
 * @desc Updates a message
 *
 * @alias gmailModel.updateMessage
 * @memberOf! gmailModel(v1)
 *
 * @param  {object} params - Parameters for request
 * @param  {string} params.messageId   - Message to modify
 * @param  {string} params.addLabelIds - List of label ID's to add to the message
 * @param  {callback} callback - The callback that handles the response.
 */
method.updateMessage = function (params,callback)  {

  var self = this

  self.log.info('Updating message %s', params.messageId)

  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  googleAuth.authorize(function (err, auth) {

    if (err) { callback(err); return null}

    self.gmail.users.messages.modify({
      auth: auth,
      id: params.messageId,
      userId: self.userId,
      resource: {
        addLabelIds: params.addLabelIds,
        removeLabelIds: params.removeLabelIds
      }
    }, function(err, response) {
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
