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

/**
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
			if (!error && data != null) {

				// Check if device was installed before
				var lists = (_.findWhere(devices_data, {id: light.id})) ? [lights, temp_lights] : [temp_lights];

				// Iterate over lists that needs to have device added
				lists.forEach(function (list) {

					// Add device including all data
					var temp_device = {
						data: {
							id: light.id,
							client: light,
							status: light.status
						},
						name: data.label
					};

					// Get more information about light
					temp_device.data.client.getState(function (error, data) {
						if (data != null) {

							// Store initial values

							temp_device.data.light_temperature = map(2500, 9000, 0, 1, data.color.kelvin);
							temp_device.data.dim = data.color.brightness / 100;
							temp_device.data.light_saturation = data.color.saturation / 100;
							temp_device.data.light_hue = data.color.hue / 360;
						}
					});

					list.push(temp_device);
				});
			}
		})
	});

	// Light goes offline
	client.on('light-offline', function (light) {

		// Get light
		var foundLight = getLight(light.id, temp_lights);

		// If it exists
		if (foundLight != null && foundLight.data != null) {
			foundLight.data.status = "off";
			module.exports.setUnavailable({id: light.id}, __("offline"));
		}
	});

	// Light gets back online
	client.on('light-online', function (light) {

		// Get light
		var foundLight = getLight(light.id, temp_lights);

		// If it exists
		if (foundLight != null && foundLight.data != null) {
			foundLight.data.status = "on";
			module.exports.setAvailable({id: light.id});
		}
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
			if (temp_light.data.status == "on") {
				devices.push({
					data: {
						id: temp_light.data.id
					},
					name: temp_light.name
				});
			}
		});

		callback(null, devices);
	});

	/**
	 * Register device internally as installed
	 * @param callback
	 * @param emit
	 * @param device
	 */
	socket.on("add_device", function (device) {

		temp_lights.forEach(function (temp_light) {
			if (temp_light.data.id === device.data.id) {
				var light = {
					data: {
						id: temp_light.data.id,
						client: temp_light.data.client,
						status: temp_light.data.status
					},
					name: temp_light.name
				};

				// Get more information about light
				light.data.client.getState(function (error, data) {
					if (data != null) {

						// Store initial values
						light.data.light_temperature = map(2500, 9000, 0, 1, data.color.kelvin);
						light.data.dim = data.color.brightness / 100;
						light.data.light_saturation = data.color.saturation / 100;
						light.data.light_hue = data.color.hue / 360;
					}
				});

				lights.push(light);
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
			if (light != null && light.data != null && light.data.client != null) {

				// Get more information about light
				light.data.client.getState(function (error, data) {

					// If error return immediately
					if (error) {
						callback(error, null);
					}
					else if (data != null) {

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
			if (light != null && light.data != null && light.data.client != null) {
				if (onoff) {

					// Turn bulb on with global duration setting
					light.data.client.on(globalSettings.duration);

					// Emit realtime event to register change in mobile card
					module.exports.realtime(device_data, 'onoff', true);

					// Let know that bulb is turned on
					callback(null, true);
				}
				else {

					// Turn bulb off with global duration setting
					light.data.client.off(globalSettings.duration);

					// Emit realtime event to register change in mobile card
					module.exports.realtime(device_data, 'onoff', false);

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
			if (light != null && light.data != null && light.data.client != null) {

				// Get more information about light
				light.data.client.getState(function (error, data) {

					// If error return immediately
					if (error) {
						return callback(error, null);
					}
					else if (typeof data === "object") {

						// Store light_hue
						light.data.light_hue = data.color.hue / 360;

						// Return mapped light_hue
						if (callback) callback(error, light.data.light_hue);
					}
				});
			}
			else {
				if (typeof callback === "function") {
					callback(true, false);
				}
			}
		},
		set: function (device_data, light_hue, callback) {
			if (device_data instanceof Error) return callback(device_data);

			var light = getLight(device_data.id);
			if (light != null && light.data != null && light.data.client != null) {

				// Get more information about light
				light.data.client.getState(function (error, data) {

					// If error return immediately
					if (error) {
						return callback(error, null);
					}
					else if (typeof data === "object") {

						// Store light_hue
						light.data.light_hue = light_hue;

						// Toggle color mode
						if(light_hue > 0) light.data.light_mode = "color";

						// Update bulb state
						update(light.data.id, "light_hue", function (err) {
							callback(err, light_hue)
						});
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
			if (light != null && light.data != null && light.data.client != null) {

				// Get more information about light
				light.data.client.getState(function (error, data) {

					// If error return immediately
					if (error) {
						return callback(error, null);
					}
					else if (typeof data === "object") {

						// Store light_saturation
						light.data.light_saturation = data.color.saturation / 100;

						// Return light_saturation
						if (callback) callback(error, light.data.light_saturation);
					}
				});
			}
			else {
				if (typeof callback === "function") {
					callback(true, false);
				}
			}
		},
		set: function (device_data, light_saturation, callback) {
			if (device_data instanceof Error) return callback(device_data);

			var light = getLight(device_data.id);
			if (light != null && light.data != null && light.data.client != null) {

				// Get more information about light
				light.data.client.getState(function (error, data) {

					// If error return immediately
					if (error) {
						return callback(error, null);
					}
					else if (typeof data === "object") {

						// Store light_saturation
						light.data.light_saturation = light_saturation;

						// Toggle color mode
						if(light_saturation > 0) light.data.light_mode = "color";

						// Update bulb state
						update(light.data.id, "light_saturation", function (err) {
							callback(err, light_saturation);
						})
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
			if (light != null && light.data != null && light.data.client != null) {

				// Get more information about light
				light.data.client.getState(function (error, data) {

					// If error return immediately
					if (error) {
						return callback(error, null);
					}
					else if (typeof data === "object") {

						// Store dim
						light.data.dim = data.color.brightness / 100;

						// Return dim
						if (callback) callback(error, light.data.dim);
					}
				});
			}
			else {
				if (typeof callback === "function") {
					callback(true, false);
				}
			}
		},
		set: function (device_data, dim, callback) {
			if (device_data instanceof Error) return callback(device_data);

			var light = getLight(device_data.id);
			if (light != null && light.data != null && light.data.client != null) {

				// Get more information about light
				light.data.client.getState(function (error, data) {

					// If error return immediately
					if (error) {
						return callback(error, null);
					}
					else if (typeof data === "object") {

						// Store dim
						light.data.dim = dim;

						// Update bulb state
						update(light.data.id, "dim", function (err) {
							callback(err, dim);
						})
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
			if (light != null && light.data != null && light.data.client != null) {

				// Get more information about light
				light.data.client.getState(function (error, data) {

					// If error return immediately
					if (error) {
						return callback(error, null);
					}
					else if (typeof data === "object") {

						// Store light_temperature
						light.data.light_temperature = map(2500, 9000, 0, 1, data.color.kelvin);

						// Return mapped kelvin value
						if (callback) callback(error, light.data.light_temperature);
					}
				});
			}
			else {
				if (typeof callback === "function") {
					callback(true, false);
				}
			}
		},
		set: function (device_data, light_temperature, callback) {
			if (device_data instanceof Error) return callback(device_data);

			var light = getLight(device_data.id);
			if (light != null && light.data != null && light.data.client != null) {

				// Get more information about light
				light.data.client.getState(function (error, data) {

					// If error return immediately
					if (error) {
						return callback(error, null);
					}
					else if (typeof data === "object") {

						// Store light_temperature
						light.data.light_temperature = light_temperature;

						// Update bulb state
						update(light.data.id, "light_temperature", function (err) {
							callback(err, light_temperature)
						})
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

	light_mode: {
		get: function (device_data, callback) {
			if (device_data instanceof Error) return callback(device_data);

			var light = getLight(device_data.id);
			if (light != null && light.data != null && light.data.client != null) {

				if (!light.data.light_mode) light.data.light_mode = "color";
				callback(null, light.data.light_mode);
			}
		},
		set: function (device_data, light_mode, callback) {
			if (device_data instanceof Error) return callback(device_data);

			var light = getLight(device_data.id);
			if (light != null && light.data != null && light.data.client != null) {

				light.data.light_mode = light_mode;

				// Update bulb state
				update(device_data.id, "light_mode", function (err) {
					callback(err, light.data.light_mode);
				});
			}
		}
	}
};

/**
 * Function that debounces multiple capability changes
 * @type {Array}
 */
var changedStates = [];
function update(light_id, capability, callback) {

	// Keep track of changed capabilites
	if (capability) changedStates.push(capability);

	// Get light
	var light = getLight(light_id);
	if (!light) {
		return callback(light, false);
	}
	else {
		callback(null, true);
	}

	// Clear debounce
	if (light.updateTimeout) {

		// Clear timeout
		clearTimeout(light.updateTimeout);

		// Destroy timeout
		light.updateTimeout = null;
	}

	// Debounce
	light.updateTimeout = setTimeout(function () {

		// Set hue and saturation
		var hue = Math.round(light.data.light_hue * 360);
		var saturation = light.data.light_saturation * 100;

		// If light mode is white
		if (light.data.light_mode == "temperature") {

			// Set hue and saturation to 0
			hue = 0;
			saturation = 0;
		}

		// Perform update on bulb
		light.data.client.color(hue, saturation, light.data.dim * 100, map(0, 1, 9000, 2500, light.data.light_temperature));

		// emit event to realtime listeners
		changedStates.forEach(function (capability) {

			// Emit realtime events for changed capabilities
			module.exports.realtime({
				id: light.data.id
			}, capability, light.data[capability]);
		});

		// Clear changed states
		changedStates = [];

		// Callback success
		callback(null, true);
	}, 150);
}

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

function map(input_start, input_end, output_start, output_end, input) {
	return output_start + ((output_end - output_start) / (input_end - input_start)) * (input - input_start);
}