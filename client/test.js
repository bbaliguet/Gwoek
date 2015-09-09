var MersenneTwister = require("./mt19937");
var	assert = require("assert");

// test random generator
var seed = Math.floor(Math.random() * 100000000);

var generator1 = new MersenneTwister(seed);
var	valuesToTest = [];
var nbTest = 100000;

for (var i = 0; i < nbTest; i++) {
	valuesToTest[i] = generator1.random();
}

var generator2 = new MersenneTwister(seed);

for (var i = 0; i < nbTest; i++) {
	assert.equal(valuesToTest[i], generator2.random(), "Different value at index " + i);
}
