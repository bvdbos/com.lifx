var _ = require('underscore');
var Cutter = require('utf8-binary-cutter');
var Lifx = require('node-lifx').Client;
var client = new Lifx();

/**
 * Global settings object, to keep track of color settings for multiple bulbs
 */
var globalSettings = {
	duration: 500
};

var lights = [];
var temp_lights = [];

/***
 * Initially start Lifx client to search for bulbs on the network
 * @param devices (already installed)
 * @param callback
 */
module.exports.init = function (devices_data, callback) {

	// If client fails, destroy it
	client.on('error', function () {
		client.destroy();
	});

	// Loop bulbs found by Lifx
	client.on('light-new', function (light) {

		// Get more data about the light
		light.getState(function (error, data) {

			// If no data available skip this one
			if (!error && typeof data === "object") {

				// Check if device was installed before
				var lists = (_.findWhere(devices_data, {id: light.id})) ? [lights, temp_lights] : [temp_lights];

				// Iterate over lists that needs to have device added
				lists.forEach(function (list) {

					// Add device including all data
					list.push({
						data: {
							id: light.id,
							client: light,
							status: light.status
						},
						name: data.label
					});
				});
			}
		})
	});

	// Initialize new Lifx client
	client.init();

	// Ready
	callback(true);
};

/**
 * Pairing process that calls list_devices when in need of all devices
 * Lifx can find, here the devices array is built and send to the front-end
 */
module.exports.pair = function (socket) {

	/**
	 * Constructs array of all available devices
	 * @param callback
	 */
	socket.on("list_devices", function (data, callback) {
		var devices = [];
		temp_lights.forEach(function (temp_light) {
			devices.push({
				data: {
					id: temp_light.data.id
				},
				name: temp_light.name
			});
		});

		callback(null, devices);
	});

	/**
	 * Register device internally as installed
	 * @param callback
	 * @param emit
	 * @param device
	 */
	socket.on("add_device", function (device, callback) {

		temp_lights.forEach(function (temp_light) {
			if (temp_light.data.id === device.data.id) {
				lights.push({
					data: {
						id: temp_light.data.id,
						client: temp_light.data.client,
						status: temp_light.data.status
					},
					name: temp_light.name
				});
			}
		});
	});
};

/**
 * These represent the capabilities of the LIFX light bulbs
 */
module.exports.capabilities = {

	onoff: {
		get: function (device_data, callback) {
			if (device_data instanceof Error) return callback(device_data);

			var light = getLight(device_data.id);
			if (typeof light === "object" && light.data && light.data.client) {

				// Get more information about light
				light.data.client.getState(function (error, data) {

					// If error return immediately
					if (error) {
						return callback(error, null);
					}
					else if (typeof data === "object") {

						// Determine on/off state
						var state = ( data.power === 1 ) ? true : false;

						// Return current bulb state
						if (callback) callback(error, state);
					}
				});
			}
			else {
				if (typeof callback === "function") {
					callback(true, false);
				}
			}
		},
		set: function (device_data, onoff, callback) {
			if (device_data instanceof Error) return callback(device_data);

			var light = getLight(device_data.id);
			if (typeof light === "object") {
				if (onoff) {

					// Turn bulb on with global duration setting
					light.data.client.on(globalSettings.duration);

					// Let know that bulb is turned on
					callback(null, true);
				}
				else {

					// Turn bulb off with global duration setting
					light.data.client.off(globalSettings.duration);

					// Let know that bulb is turned off
					callback(null, false);
				}
			}
			else {
				if (typeof callback === "function") {
					callback(true, false);
				}
			}
		}
	},

	light_hue: {
		get: function (device_data, callback) {
			if (device_data instanceof Error) return callback(device_data);

			var light = getLight(device_data.id);
			if (typeof light === "object") {

				// Get more information about light
				light.data.client.getState(function (error, data) {

					// If error return immediately
					if (error) {
						return callback(error, null);
					}
					else if (typeof data === "object") {
						// Return mapped hue
						if (callback) callback(error, (data.color.hue / 360));
					}
				});
			}
			else {
				if (typeof callback === "function") {
					callback(true, false);
				}
			}
		},
		set: function (device_data, hue, callback) {
			if (device_data instanceof Error) return callback(device_data);

			var light = getLight(device_data.id);
			if (typeof light === "object") {

				// Get more information about light
				light.data.client.getState(function (error, data) {

					// If error return immediately
					if (error) {
						return callback(error, null);
					}
					else if (typeof data === "object") {

						// Change light color
						light.data.client.color(Math.round(hue * 360), data.color.saturation, data.color.brightness);
						if (callback) callback(error, hue);
					}
				});
			}
			else {
				if (typeof callback === "function") {
					callback(true, false);
				}
			}
		}
	},
	light_saturation: {
		get: function (device_data, callback) {
			if (device_data instanceof Error) return callback(device_data);

			var light = getLight(device_data.id);
			if (typeof light === "object") {

				// Get more information about light
				light.data.client.getState(function (error, data) {

					// If error return immediately
					if (error) {
						return callback(error, null);
					}
					else if (typeof data === "object") {

						// Return saturation
						if (callback) callback(error, data.color.saturation);
					}
				});
			}
			else {
				if (typeof callback === "function") {
					callback(true, false);
				}
			}
		},
		set: function (device_data, saturation, callback) {
			if (device_data instanceof Error) return callback(device_data);

			var light = getLight(device_data.id);
			if (typeof light === "object") {

				// Get more information about light
				light.data.client.getState(function (error, data) {

					// If error return immediately
					if (error) {
						return callback(error, null);
					}
					else if (typeof data === "object") {

						// Change light color
						light.data.client.color(data.color.hue, saturation * 100, data.color.brightness);

						if (callback) callback(error, saturation);
					}
				});
			}
			else {
				if (typeof callback === "function") {
					callback(true, false);
				}
			}
		}
	},

	dim: {
		get: function (device_data, callback) {
			if (device_data instanceof Error) return callback(device_data);

			var light = getLight(device_data.id);
			if (typeof light === "object") {

				// Get more information about light
				light.data.client.getState(function (error, data) {

					// If error return immediately
					if (error) {
						return callback(error, null);
					}
					else if (typeof data === "object") {
						// Return brightness
						if (callback) callback(error, data.color.brightness);
					}
				});
			}
			else {
				if (typeof callback === "function") {
					callback(true, false);
				}
			}
		},
		set: function (device_data, brightness, callback) {
			if (device_data instanceof Error) return callback(device_data);

			var light = getLight(device_data.id);
			if (typeof light === "object") {

				// Get more information about light
				light.data.client.getState(function (error, data) {

					// If error return immediately
					if (error) {
						return callback(error, null);
					}
					else if (typeof data === "object") {

						// Change light color
						light.data.client.color(data.color.hue, data.color.saturation, brightness * 100);
						if (callback) callback(error, brightness);
					}
				});
			}
			else {
				if (typeof callback === "function") {
					callback(true, false);
				}
			}
		}
	},

	light_temperature: {
		get: function (device_data, callback) {
			if (device_data instanceof Error) return callback(device_data);

			var light = getLight(device_data.id);
			if (typeof light === "object") {

				// Get more information about light
				light.data.client.getState(function (error, data) {

					// If error return immediately
					if (error) {
						return callback(error, null);
					}
					else if (typeof data === "object") {

						// Return mapped kelvin value
						if (callback) callback(error, ((data.color.kelvin - 2500) / (9000 - 2500) * (1 - 0)));
					}
				});
			}
			else {
				if (typeof callback === "function") {
					callback(true, false);
				}
			}
		},
		set: function (device_data, temperature, callback) {
			if (device_data instanceof Error) return callback(device_data);

			var light = getLight(device_data.id);
			if (typeof light === "object") {

				// Get more information about light
				light.data.client.getState(function (error, data) {

					// If error return immediately
					if (error) {
						return callback(error, null);
					}
					else if (typeof data === "object") {

						// Convert temperature to usable range for Lifx and update temperature
						light.data.client.color(data.color.hue, data.color.saturation, data.color.brightness, (temperature - 0) / (1 - 0) * (9000 - 2500) + 2500);

						if (callback) callback(error, temperature);
					}
				});
			}
			else {
				if (typeof callback === "function") {
					callback(true, false);
				}
			}
		}
	}
};

/**
 * When a device is renamed in Homey, make sure the actual
 * label of the device is changed as well
 * @param device_data
 * @param new_name
 */
module.exports.renamed = function (device_data, new_name) {

	// Check for valid new name
	if (typeof device_data === "object" && typeof new_name === "string" && new_name !== '') {

		// Parse new label and truncate at 32 bytes
		var label = Cutter.truncateToBinarySize(new_name, 32);

		// Get light targeted
		var light = getLight(device_data.id);
		var temp_light = getLight(device_data.id, temp_lights);

		// Store new name internally
		if (light) light.name = label;
		if (temp_light) temp_light.name = label;

		// Set new label with a max of 32 bytes (LIFX limit)
		if (light) light.data.client.setLabel(label);
	}
};

/**
 * Gets a light from one of the internal device arrays
 * uses lights by default
 * @param device_id
 * @param list, optional
 * @returns {*}
 */
function getLight(device_id, list) {
	var found_light = null;
	var list = (list) ? list : lights;
	list.forEach(function (light) {
		if (light.data.id === device_id) {
			found_light = light;
		}
	});
	return found_light;
}