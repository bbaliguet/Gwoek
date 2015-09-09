var AudioContext = window.AudioContext || window.webkitAudioContext;
window.audioCtx = new AudioContext();

var gainNode = audioCtx.createGain();
gainNode.gain.value = 0.2;
gainNode.connect(audioCtx.destination);

/* simplified Monotron from http://noisehack.com/ */
var Monotron = (function() {
	function Monotron(context) {
		this.context = context;

		this.vco = this.context.createOscillator();

		this.lfo = this.context.createOscillator();
		this.lfoGain = this.context.createGain();

		this.vcf = this.context.createBiquadFilter();

		this.output = this.context.createGain();

		this.vco.connect(this.vcf);
		this.vcf.connect(this.output);
		this.lfo.connect(this.lfoGain);
		this.lfoGain.connect(this.vcf.frequency);

		this.output.gain.value = 0;
		this.vco.type = "sawtooth";
		this.lfo.type = "sawtooth";
		this.vco.start(this.context.currentTime);
		this.lfo.start(this.context.currentTime);
	}

	Monotron.prototype.noteOn = function(frequency, time) {
		this.vco.frequency.setValueAtTime(frequency, time);
		return this.output.gain.linearRampToValueAtTime(1.0, time + 0.05);
	};

	Monotron.prototype.noteOff = function(time) {
		return this.output.gain.linearRampToValueAtTime(0.0, time + 0.1);
	};

	Monotron.prototype.connect = function(target) {
		return this.output.connect(target);
	};

	return Monotron;

})();
