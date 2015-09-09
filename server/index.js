var http = require("http");
var Twitter = require("twitter");
var urlParse = require("url").parse;
var Promise = require("promise");

var client = new Twitter({
	consumer_key: process.env.TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
	access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
	access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

function smallStatus(status) {
	return {
		created: status.created_at.replace(/( \+)/, " UTC$1"),
		id: status.id,
		user: status.user.screen_name
	};
}

function extractRelevant(oldest, status) {
	// TODO: return real oldest
	if (!oldest) {
		return smallStatus(status);
	}
	return oldest;
}

function getTwitterPromise(score) {
	return new Promise(function(resolve, reject) {
		client.get("search/tweets", {
			q: "#Gwoek_" + score
		}, function(error, tweets, response) {
			if (error) {
				return reject(error);
			}
			resolve({
				score: score,
				status: tweets.statuses.reduce(extractRelevant, null)
			});
		});
	});
}

http.createServer(function(req, res) {
	var query = urlParse(req.url, true).query;
	var gwoekScores = query.score;

	if (!gwoekScores) {
		res.writeHead(404);
		return res.end();
	}

	if (!(gwoekScores instanceof Array)) {
		gwoekScores = [gwoekScores];
	}

	res.writeHead(200, {
		"Content-Type": "application/json",
		"Access-Control-Allow-Origin": "*"
	});

	Promise.all(gwoekScores.map(getTwitterPromise)).then(function(results) {
		var all = {};
		results.forEach(function(result) {
			all[result.score] = result.status;
		});
		res.end(JSON.stringify(all));
	}, function(error) {
		console.log(error);
	});

}).listen(process.env.PORT || 5000);
