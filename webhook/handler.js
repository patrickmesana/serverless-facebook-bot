'use strict';
var joi = require('joi');
var _ = require('lodash');
var request = require('request');
var dialog = require('../bot-dialog');
var PAGE_ACCESS_TOKEN = require('../constants').pageAccessToken;

var schema = joi.object().keys({
  fb_verify_token: joi.string(),
  fb_challenge: joi.string()
});

function response(verify_token, challenge) {
  return _.isEqual(verify_token, PAGE_ACCESS_TOKEN) ?
      parseInt(challenge) :
      'Error, wrong validation token';
}

function getRequest(event, context) {
  joi.validate(event, schema);
  response(event.fb_verify_token, event.fb_challenge)
}

function callSendAPI(messageData, context) {
  console.log('sending text...' + JSON.stringify(messageData));
    request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData
  });
}

function sendTextMessage(recipientId, messageText, context) {

    var dialogText = dialog(messageText);

    var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: dialogText
    }
  };

  return callSendAPI(messageData, context);
}

function receivedMessage(event, context) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
      senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {

    // If we receive a text message, check to see if it matches any special
    // keywords and send back the corresponding example. Otherwise, just echo
    // the text we received.
    return sendTextMessage(senderID, messageText);
  } else if (messageAttachments) {
    return sendTextMessage(senderID, "Message with attachment received");
  }
}

function postRequest(event, context) {
    var data = event.body;

    // Make sure this is a page subscription
    if (data.object == 'page') {
        // Iterate over each entry
        // There may be multiple if batched
        data.entry.forEach(function (pageEntry) {
            var pageID = pageEntry.id;
            var timeOfEvent = pageEntry.time;
            console.log(JSON.stringify(pageEntry));
            // Iterate over each messaging event
            pageEntry.messaging.forEach(function (messagingEvent) {

                if (messagingEvent.optin) {
                    //receivedAuthentication(messagingEvent);
                    console.log('optin not impletmented');
                } else if (messagingEvent.message) {
                    receivedMessage(messagingEvent, context);
                } else if (messagingEvent.delivery) {
                    //receivedDeliveryConfirmation(messagingEvent);
                    console.log('delivered not implemented')
                } else if (messagingEvent.postback) {
                    //receivedPostback(messagingEvent);
                    console.log('postback not impletmented');
                } else {
                    console.log("Webhook received unknown messagingEvent: ", messagingEvent);
                }
            });
        });
    }
}


module.exports.handler = function(event, context) {
    if (event.httpMethod === 'GET')  return context.done(null, getRequest(event, context));
    else if (event.httpMethod === 'POST') return postRequest(event, context);
    else throw new Error('Unknown route');
    context.done(null);
};