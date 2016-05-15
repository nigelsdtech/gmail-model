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

var google       = require('googleapis');
var doGoogleAuth = require('do-google-auth');

var method = GmailModel.prototype;

var name
   ,userId
   ,gmail
   ,googleAuth
   ,log
   ,log4js;



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
  googleAuth.authorize( function (auth) {

    self.gmail.users.labels.create({
      auth: auth,
      userId: self.userId,
      resource: {
        name: params.labelName
      }
    }, function(err, response) {

      if (err) {
        callback(new Error('gmailModel.createLabel: The API returned an error: ' + err))
        return null
      }

      self.log.trace('Returned response:')
      self.log.trace(response)

      self.log.info('Label created: %s', params.labelName)
      callback(null,response.id)
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
  googleAuth.authorize( function (auth) {

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
          callback(response)
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

  self.listLabels ( function (labels) {

    var retErr, labelId;

    if (labels.length == 0) {

      self.log.info('No labels found.');

    } else {

      self.log.debug('gmail.getLabelId: Found %s labels', labels.length)

      for (var i = 0; i < labels.length; i++) {

        var label = labels[i]

        if ( label.name == params.labelName ) {
          self.log.debug('Label matches - %s (%s)', label.name, label.id);
          labelId = label.id
          break
        }
      }
    }

    // Create the label if it doesn't exist
    if (!labelId && params.hasOwnProperty('createIfNotExists') && params.createIfNotExists) {
      self.createLabel({
        labelName: params.labelName
      }, function (err, labelId) {
        if (err) {
          self.log.error('gmailModel.getLabelId error: ' + err);
          retErr = err
        } else {
          labelId = labelId
        }
      });
    }


    callback(retErr, labelId);
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

  self.log.debug('Getting message')

  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  googleAuth.authorize( function (auth) {

    self.gmail.users.messages.get(
      {
        auth: auth,
        userId: self.userId,
        id: params.messageId
      },
      function(err, response) {
        if (err) {
          console.log('The API returned an error: ' + err);
        } else {
          self.log.trace('Returned response:')
          self.log.trace(response)
          callback(response)
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
  googleAuth.authorize( function (auth) {

    self.gmail.users.labels.list({
      auth: auth,
      userId: self.userId,
    }, function(err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        return;
      }
      var labels = response.labels;
      callback(labels)

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

  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  googleAuth.authorize( function (auth) {

    var gParams = {
      auth: auth,
      userId: self.userId,
    }

    if (params.hasOwnProperty('freetextSearch')) {
      gParams.q = params.freetextSearch
    }

    if (params.hasOwnProperty('labelIds')) {
      gParams.labelIds = params.labelIds
    }

    if (params.hasOwnProperty('maxResults')) {
      gParams.maxResults = params.maxResults
    }

    self.gmail.users.messages.list(
      gParams,
      function(err, response) {
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

        callback(messages)

      }
    )
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
  googleAuth.authorize( function (auth) {

        //removeLabelIds: []
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
        callback(new Error(errMsg))
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
