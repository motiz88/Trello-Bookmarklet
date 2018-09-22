```javascript
javascript:(function(a){window.trelloAppKey="KEY";window.trelloIdList="LIST";window.flatSearchCentre="London";var b=a.createElement("script");b.src="https://rawgit.com/motiz88/Trello-Bookmarklet/master/trello_bookmarklet.js";a.getElementsByTagName("head")[0].appendChild(b)})(document);
```

This is a <a href="http://en.wikipedia.org/wiki/Bookmarklet">bookmarklet</a> you can use to create a card in <a href="https://trello.com">Trello</a> from a Zoopla property details page (`https://www.zoopla.co.uk/to-rent/details/#######`).

The code is completely tailored to my own personal flat search and the Trello board I'm using for it; I am not taking issue reports or PRs, sorry! Feel free to fork and make your own changes, or check if your use case is a good fit for @danlec's upstream repo at https://github.com/danlec/Trello-Bookmarklet.

The first time you run the bookmarklet, it will walk you through a simple setup:

 1. Input your API Key (which you can get at https://trello.com/1/appKey/generate)
 2. Authorize the site to interact with Trello
 3. Select the list that you'd like the bookmarklet to add cards to

You'll only need to go through those steps once per domain; from then on, you should be able to send your
cards directly to Trello in a single click.

To install the bookmarklet, modify `window.trelloAppKey`, `window.trelloIdList` and `window.flatSearchCentre` as appropriate, and paste it into the URL field of a new bookmark in Chrome.
