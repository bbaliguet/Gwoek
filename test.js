var MersenneTwister = require("./mt19937"),
    assert = require("assert");

// test random generator
var seed = Math.floor(Math.random() * 100000000),
    generator1 = new MersenneTwister(seed),
    valuesToTest = [],
    nbTest = 100000,
    i;
    
for(i = 0; i < nbTest; i++) {
    valuesToTest[i] = generator1.random();
}

var generator2 = new MersenneTwister(seed);

for(i = 0; i < nbTest; i++) {
    assert.equal(valuesToTest[i], generator2.random(), "Different value at index " + i);
}
