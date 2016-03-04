const Twitter = require('twitter');
const urlParse = require('url').parse;
const Promise = require('promise');
const express = require('express');

const client = new Twitter({
	consumer_key: process.env.TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
	access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
	access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

function smallStatus(status) {
	return {
		created: status.created_at.replace(/( \+)/, ' UTC$1'),
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
	return new Promise((resolve, reject) => {
		client.get('search/tweets', {
			q: `#Gwoek_${score}`
		}, (error, tweets) => {
			if (error) {
				reject(error);
			} else {
				resolve({
					score,
					status: tweets.statuses.reduce(extractRelevant, null)
				});
			}
		});
	});
}

const app = express();

app.get('/', (req, res) => {
	res.redirect('/index.html');
	res.end();
});

app.get('/scores', (req, res) => {
	const query = urlParse(req.url, true).query;
	let gwoekScores = query.score;

	if (!gwoekScores) {
		res.writeHead(404);
		res.end();
	} else {
		if (!(gwoekScores instanceof Array)) {
			gwoekScores = [gwoekScores];
		}

		res.writeHead(200, {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		});

		Promise.all(gwoekScores.map(getTwitterPromise)).then(results => {
			const all = {};
			results.forEach(result => {
				all[result.score] = result.status;
			});
			res.end(JSON.stringify(all));
		}, error => console.log(error));
	}
});

app.use(express.static('client'));

const server = app.listen(process.env.PORT || 5000, () => {
	const host = server.address().address;
	const port = server.address().port;
	console.log('Gwoek listening at http://%s:%s', host, port);
});
