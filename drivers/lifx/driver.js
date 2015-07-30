var bulbs = [];

module.exports.init = function ( devices, callback ) {
	var lifx = require('lifx');

	// Start looking for lifx bulbs
	var lx = lifx.init();

	// Events listening
	lx.on('bulbstate', function(b) {
		console.log('Bulb state: ' + b);
	});

	lx.on('bulbonoff', function(b) {
		console.log('Bulb on/off: ' + b);
	});

	lx.on('bulb', function(b) {
		console.log('New bulb found: ' + b.name + " : " + b.addr.toString("hex"));
	});

	lx.on('gateway', function(g) {
		console.log('New gateway found: ' + g.ip);
	});

	if(callback) callback();
}

module.exports.pair = {
	list_devices: function ( callback, emit, data){
		//TODO implement listing devices
		callback (bulbs);
	},
	add_device: function ( ) {
		//TODO implement add device
	}
}

module.exports.capabilities = {
	name: {
		get: function (device_data, callback) {
			if (callback) callback()

			//TODO access device name here
			return device_data;

		},
		set: function (device_data, name, callback) {

			//TODO set device name here
			device_data.name = name;
			if (callback) callback()
		}
	},

	onoff: {
		get: function (device_data, callback) {
			//TODO implement getters
		},
		set: function (device_data, onoff, bulb, callback) {

			if (bulb) {
				lx.lightsOn(bulb);
			} else {
				lx.lightsOn();
			}

			if (callback) callback();
		}
	},

	color: {
		get: function (device_data, callback) {
			//TODO implement getters
		},
		set: function (device_data, color, bulb, callback) {

			//TODO fetch correct color parameters from color object
			if (bulb) {
				lx.lightsColour(hue, saturation, luminance, whiteColour, fadeTime, bulb);
			} else {
				lx.lightsColour(hue, saturation, luminance, whiteColour, fadeTime);
			}

		}
	}
}