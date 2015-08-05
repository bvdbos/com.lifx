var lifx = require('lifx');
var lx;

/**
 * Holds all found bulb objects
 * @type {Array}
 */
var bulbs = [];

/**
 * Function that finds a bulb using its device_id
 * @param device_id
 * @returns {*}
 */
var getBulb = function (device_id) {

	// If no device id, return
	if(device_id === null) return;

	// Loop over bulb objects
	for (var x = 0; x < bulbs.length; x++) {

		// Return if one found with matching ids
		if (bulbs[x].id === device_id) {
			return bulbs[x];
		}
	}
};

/**
 * Function that updates a single light bulb, or all in bulk,
 * depending on the device id provided.
 * @param key hue/saturation/luminance/whiteColour/timing
 * @param value 16bit updated value
 * @param id device_data.id
 */
var updateLightSettings = function (key, value, id) {
	var bulb = getBulb(id);

	// Update bulb color settings
	if (bulb) {

		// Store updated value in bulb object
		bulb[key] = value;

		// Broadcast new color settings to bulb
		lx.lightsColour(intTo16bit(bulb.hue), intTo16bit(bulb.saturation), intTo16bit(bulb.luminance), intTo16bit(bulb.whiteColour), bulb.timing, bulb);

	} // Update global color settings
	else {

		// Store updated value in global color settings
		globalColorSettings[key] = value;

		// Broadcast new color settings to all bulbs
		lx.lightsColour(intTo16bit(globalColorSettings.hue), intTo16bit(globalColorSettings.saturation), intTo16bit(globalColorSettings.luminance), intTo16bit(globalColorSettings.whiteColour), globalColorSettings.timing);
	}
}

/**
 * Function that converts 0 - 65535 to 0x0000 - 0xffff
 * @param i
 * @returns {string}
 */
var intTo16bit = function( i ) {
	i = '0x' + i.toString(16);
	return i;
};

/**
 * Global color settings object, to keep track of color settings for multiple bulbs
 */
var globalColorSettings = {
	hue: 0,
	saturation: 0,
	luminance: 8,
	whiteColour: 0,
	timing: 500
};

module.exports.init = function ( devices, callback ) {
	// Start looking for lifx bulbs
	lx = lifx.init();

	// Found a bulb
	lx.on('bulb', function(b) {

		// Add new bulb object to bulbs
		bulbs.push({
			name: b.name,
			ip: b.addr,
			get id() {
				return this.name + '_' + this.ip
			},
			hue: 0x0000,
			saturation: 0x0000,
			luminance: 0x8000,
			whiteColour: 0x0af0,
			timing: 500,
			onoff: true
		});
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
			if (callback) callback();

			//TODO access device name here
			return device_data.name;

		},
		set: function (device_data, name, callback) {

			//TODO set device name here
			device_data.name = name;

			if (callback) callback();
		}
	},

	onoff: {
		get: function (device_data, callback) {
			if (callback) callback();

			var bulb = getBulb(device_data);

			return bulb.onoff;
		},
		set: function (device_data, onoff, callback) {
			var bulb = getBulb(device_data.id);

			if(onoff){
				if (bulb) {
					lx.lightsOn(bulb);
				}
				else {
					lx.lightsOn();
				}
			}
			else {
				if (bulb) {
					lx.lightsOff(bulb);
				}
				else {
					lx.lightsOff();
				}
			}

			if (callback) callback();
		}
	},

	//TODO find out values to set (0-100 or different)
	hue: {
		get: function (device_data, callback) {
			if (callback) callback();

			var bulb = getBulb(device_data);

			return bulb.hue;
		},
		set: function (device_data, hue, callback) {

			//Update hue of lights
			updateLightSettings("hue", hue,  device_data.id || null);

			if (callback) callback();
		}
	},

	saturation: {
		get: function (device_data, callback) {
			if (callback) callback();

			var bulb = getBulb(device_data);

			return bulb.saturation;
		},
		set: function (device_data, saturation, callback) {

			//Update saturation of lights
			updateLightSettings("saturation", saturation,  device_data.id || null);

			if (callback) callback();
		}
	},

	temperature: {
		get: function (device_data, callback) {
			if (callback) callback();

			var bulb = getBulb(device_data);

			return bulb.onoff;
		},
		set: function (device_data, temperature, callback) {

			//Update temperature of lights
			updateLightSettings("whiteColour", temperature, device_data.id || null);

			if (callback) callback();
		}
	},

	brightness: {
		get: function (device_data, callback) {
			if (callback) callback();

			var bulb = getBulb(device_data);

			return bulb.onoff;
		},
		set: function (device_data, luminance, callback) {

			//Update luminance of lights
			updateLightSettings("luminance", luminance, device_data.id || null);

			if (callback) callback();
		}
	}
};