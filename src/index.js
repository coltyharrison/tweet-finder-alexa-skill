const Alexa = require('alexa-sdk'),
      Twit = require('twit'),
      CONFIG = require('./config.js'),
      twitter = require('twitter-text'),
      HELP_MESSAGE = 'To find the latest tweet on a subject, say ' +
                    'something like, ',
      STOP_MESSAGE = 'Goodbye',
      RANDOM_RESPONSES = [
        'Alexa, ask Tweet Finder to search for donald trump',
        'Alexa, ask Tweet Finder to search for pizza',
        'Alexa, ask Tweet Finder to search for the mariners',
        'Alexa, ask Tweet Finder to search for the new york times',
        'Alexa, ask Tweet Finder for the latest tweet on portland',
        'Alexa, ask Tweet Finder to find a tweet about saturday night live',
        'Alexa, ask Tweet Finder for the latest tweet on harry potter',
        'Alexa, ask Tweet Finder to search for reviews',
        'Alexa, ask Tweet Finder for the latest tweet on gay marriage',
        'Alexa, ask Tweet Finder to find a tweet on Golden State Warriors',
        'Alexa, ask Tweet Finder to search for Game of Thrones',
        'Alexa, ask Tweet Finder for the latest tweet on the UK elections',
        'Alexa, ask Tweet Finder to to find a tweet about Volcanoes'
      ];


exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.APP_ID = CONFIG.APP_ID;
    alexa.registerHandlers(handlers);
    alexa.dynamoDBTableName = 'Alexa-Tweet-Finder';
    alexa.execute();
};

function parseTweet(tweet) {
  let tweeter;
  if (tweet.retweeted_status) {
    tweet = tweet.retweeted_status;
    tweeter = tweet.user.name;
  } else {
    tweeter = tweet.user.name;
  }

  let tweetMsg = tweet.text;

  // first pass at removing URLs
  for (let i = 0; i < tweet.entities.urls.length; i++) {
    tweetMsg = tweetMsg.replace(tweet.entities.urls[i].url, '');
  }

  // second pass at removing URLs
  tweetMsg = tweetMsg.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');

  //removes emojis
  tweetMsg = tweetMsg.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, '');
  tweeter = tweeter.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, '');
  return {
    'tweet': tweetMsg,
    'tweeter': tweeter
  }
}


const handlers = {
    'LaunchRequest': function() {
      this.emit('SearchPrompt');
    },
    'SearchPrompt': function() {
      this.emit(':ask', "Welcome to Tweet Finder! Respond with a topic, person, place, thing" +
                        ", or event, and I will give you the latest tweet about it.");
    },
    'ImmediateSearchTweets': function () {
      console.log('IST!');
        this.attributes.date = new Date();
        const T = new Twit({
          consumer_key: CONFIG.CONSUMER_KEY,
          consumer_secret: CONFIG.CONSUMER_SECRET,
          access_token: CONFIG.ACCESS_TOKEN,
          access_token_secret: CONFIG.ACCESS_TOKEN_SECRET
        });
        if (!this.event.request.intent.slots.ISTTerm.value) {
          console.log('not working');
          this.attributes.search_term = null;
          this.attributes.found = false;
          this.emit('Unhandled');
        } else {
          console.log('working');
          const searchTerm = this.event.request.intent.slots.ISTTerm.value;
          let self = this;
          self.attributes.search_term = searchTerm;
          T.get('search/tweets', { q: searchTerm, count: 1, result_type: 'recent', lang: 'en' }, function(err, data, response) {
            if (data.statuses.length === 0) {
              self.attributes.found = false;
              self.emit('NotFound');
            } else {
              self.attributes.found = true;
              const tweetInfo = parseTweet(data.statuses[0]);
              self.emit(':tell', `${tweetInfo.tweeter} tweeted, ${tweetInfo.tweet}`);
            }
          });
        }
    },
    'SearchTweets': function() {
      console.log('searchtweets2');
      const T = new Twit({
        consumer_key: CONFIG.CONSUMER_KEY,
        consumer_secret: CONFIG.CONSUMER_SECRET,
        access_token: CONFIG.ACCESS_TOKEN,
        access_token_secret: CONFIG.ACCESS_TOKEN_SECRET
      });
      if (!this.event.request.intent.slots.STTerm.value) {
        this.attributes.search_term = null;
        this.attributes.found = false;
        this.emit('Unhandled');
      } else {
        const searchTerm = this.event.request.intent.slots.STTerm.value;
        let self = this;
        self.attributes.search_term = searchTerm;
        T.get('search/tweets', { q: searchTerm, count: 1, result_type: 'recent', lang: 'en' }, function(err, data, response) {
          if (data.statuses.length === 0) {
            self.attributes.found = false;
            self.emit('NotFound');
          } else {
            self.attributes.found = true;
            const tweetInfo = parseTweet(data.statuses[0]);
            self.emit(':tell', `${tweetInfo.tweeter} tweeted, ${tweetInfo.tweet}`);
          }
        });
      }
    },
    'AMAZON.HelpIntent': function () {
        const rIndx = Math.floor(Math.random() * 13);
        const speechOutput = HELP_MESSAGE + RANDOM_RESPONSES[rIndx];
        this.emit(':ask', speechOutput);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', STOP_MESSAGE);
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', STOP_MESSAGE);
    },
    'SessionEndedRequest': function() {
        this.emit(':saveState', true);
    },
    'Unhandled': function() {
      console.log('unhandled1');
        const rIndx = Math.floor(Math.random() * 13);
        this.emit(':ask', "I'm sorry. I didn't understand that. Find a tweet " +
                          "by saying something like, " + RANDOM_RESPONSES[rIndx]);
    },
    'NotFound': function() {
      console.log('notfound1');
      this.emit(':tell', "I couldn't find any tweets about that.");
    }
};
