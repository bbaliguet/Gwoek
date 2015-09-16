var AudioContext = window.AudioContext || window.webkitAudioContext;
var mono1 = {
	note: function() {}
};
var mono2 = mono1;

if (AudioContext) {
	audioCtx = new AudioContext();
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

		Monotron.prototype.note = function(frequency, duration) {
			var time = this.context.currentTime;
			this.vco.frequency.setValueAtTime(frequency, time);
			this.output.gain.linearRampToValueAtTime(1.0, time + duration / 10);
			setTimeout(function() {
				this.output.gain.linearRampToValueAtTime(0.0, time + duration);
			}.bind(this), duration / 10);
		};

		Monotron.prototype.connect = function(target) {
			return this.output.connect(target);
		};

		return Monotron;

	})();

	mono1 = new Monotron(audioCtx);
	mono1.connect(gainNode);

	mono2 = new Monotron(audioCtx);
	mono2.connect(gainNode);

}
