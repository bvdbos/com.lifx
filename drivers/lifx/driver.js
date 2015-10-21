var _ = require( 'underscore' );
var Cutter = require('utf8-binary-cutter');
var Lifx = require( 'node-lifx' ).Client;
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
module.exports.init = function ( devices_data, callback ) {

    // Initialize new Lifx client
    client.init();

    // If client fails, destroy it
    client.on( 'error', function () {
        client.destroy();
    } );

    // Loop bulbs found by Lifx
    client.on( 'light-new', function ( light ) {

        // Get more data about the light
        light.getState( function ( error, data ) {

            // If no data available skip this one
            if ( !error && typeof data === "object" ) {

                // Check if device was installed before
                var lists = (_.findWhere( devices_data, { id: light.id } )) ? [ lights, temp_lights ] : [ temp_lights ];

                // Iterate over lists that needs to have device added
                lists.forEach( function ( list ) {

                    // Add device including all data
                    list.push( {
                        data: {
                            id: light.id,
                            client: light,
                            status: light.status
                        },
                        name: data.label
                    } );
                } );
            }
        } )
    } );

    // Ready
    callback( true );
};

/**
 * Pairing process that calls list_devices when in need of all devices
 * Lifx can find, here the devices array is built and send to the front-end
 */
module.exports.pair = {

    /**
     * Constructs array of all available devices
     * @param callback
     */
    list_devices: function ( callback ) {

        var devices = [];
        temp_lights.forEach( function ( temp_light ) {
            devices.push( {
                data: {
                    id: temp_light.data.id
                },
                name: temp_light.name
            } );
        } );

        callback( devices );
    },

    /**
     * Register device internally as installed
     * @param callback
     * @param emit
     * @param device
     */
    add_device: function ( callback, emit, device ) {

        temp_lights.forEach( function ( temp_light ) {
            if ( temp_light.data.id === device.data.id ) {
                lights.push( {
                    data: {
                        id: temp_light.data.id,
                        client: temp_light.data.client,
                        status: temp_light.data.status
                    },
                    name: temp_light.name
                } );
            }
        } );
    }
};

/**
 * These represent the capabilities of the LIFX light bulbs
 */
module.exports.capabilities = {

    onoff: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            var light = getLight( device_data.id );
            if ( typeof light === "object" ) {

                // Get more information about light
                light.data.client.getState( function ( error, data ) {

                    // If error return immediately
                    if ( error ) {
                        return callback( error, null );
                    }
                    else if ( typeof data === "object" ) {

                        // Determine on/off state
                        var state = ( data.power === 1 ) ? true : false;

                        // Return current bulb state
                        if ( callback ) callback( error, state );
                    }
                } );
            }
            else {
                if ( typeof callback === "function" ) {
                    callback( true, false );
                }
            }
        },
        set: function ( device_data, onoff, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            var light = getLight( device_data.id );
            if ( typeof light === "object" ) {
                if ( onoff ) {

                    // Turn bulb on with global duration setting
                    light.data.client.on( globalSettings.duration );

                    // Let know that bulb is turned on
                    callback( null, true );
                }
                else {

                    // Turn bulb off with global duration setting
                    light.data.client.off( globalSettings.duration );

                    // Let know that bulb is turned off
                    callback( null, false );
                }
            }
            else {
                if ( typeof callback === "function" ) {
                    callback( true, false );
                }
            }
        }
    },

    hue: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            var light = getLight( device_data.id );
            if ( typeof light === "object" ) {

                // Get more information about light
                light.data.client.getState( function ( error, data ) {

                    // If error return immediately
                    if ( error ) {
                        return callback( error, null );
                    }
                    else if ( typeof data === "object" ) {

                        // Return mapped hue
                        if ( callback ) callback( error, mapRange( data.color.hue, 0, 360, 0, 100 ) );
                    }
                } );
            }
            else {
                if ( typeof callback === "function" ) {
                    callback( true, false );
                }
            }
        },
        set: function ( device_data, hue, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            var light = getLight( device_data.id );
            if ( typeof light === "object" ) {

                // Get more information about light
                light.data.client.getState( function ( error, data ) {

                    // If error return immediately
                    if ( error ) {
                        return callback( error, null );
                    }
                    else if ( typeof data === "object" ) {

                        // Change light color
                        light.data.client.color( mapRange( hue, 0, 100, 0, 360 ), data.color.saturation, data.color.brightness );

                        if ( callback ) callback( error, hue );
                    }
                } );
            }
            else {
                if ( typeof callback === "function" ) {
                    callback( true, false );
                }
            }
        }
    },

    saturation: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            var light = getLight( device_data.id );
            if ( typeof light === "object" ) {

                // Get more information about light
                light.data.client.getState( function ( error, data ) {

                    // If error return immediately
                    if ( error ) {
                        return callback( error, null );
                    }
                    else if ( typeof data === "object" ) {

                        // Return saturation
                        if ( callback ) callback( error, data.color.saturation );
                    }
                } );
            }
            else {
                if ( typeof callback === "function" ) {
                    callback( true, false );
                }
            }
        },
        set: function ( device_data, saturation, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            var light = getLight( device_data.id );
            if ( typeof light === "object" ) {

                // Get more information about light
                light.data.client.getState( function ( error, data ) {

                    // If error return immediately
                    if ( error ) {
                        return callback( error, null );
                    }
                    else if ( typeof data === "object" ) {

                        // Change light color
                        light.data.client.color( data.color.hue, saturation, data.color.brightness );

                        if ( callback ) callback( error, saturation );
                    }
                } );
            }
            else {
                if ( typeof callback === "function" ) {
                    callback( true, false );
                }
            }
        }
    },

    brightness: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            var light = getLight( device_data.id );
            if ( typeof light === "object" ) {

                // Get more information about light
                light.data.client.getState( function ( error, data ) {

                    // If error return immediately
                    if ( error ) {
                        return callback( error, null );
                    }
                    else if ( typeof data === "object" ) {

                        // Return brightness
                        if ( callback ) callback( error, data.color.brightness );
                    }
                } );
            }
            else {
                if ( typeof callback === "function" ) {
                    callback( true, false );
                }
            }
        },
        set: function ( device_data, brightness, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            var light = getLight( device_data.id );
            if ( typeof light === "object" ) {

                // Get more information about light
                light.data.client.getState( function ( error, data ) {

                    // If error return immediately
                    if ( error ) {
                        return callback( error, null );
                    }
                    else if ( typeof data === "object" ) {

                        // Change light color
                        light.data.client.color( data.color.hue, data.color.saturation, brightness );

                        if ( callback ) callback( error, brightness );
                    }
                } );
            }
            else {
                if ( typeof callback === "function" ) {
                    callback( true, false );
                }
            }
        }
    },

    temperature: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            var light = getLight( device_data.id );
            if ( typeof light === "object" ) {

                // Get more information about light
                light.data.client.getState( function ( error, data ) {

                    // If error return immediately
                    if ( error ) {
                        return callback( error, null );
                    }
                    else if ( typeof data === "object" ) {

                        // Return mapped kelvin value
                        if ( callback ) callback( error, mapRange( data.color.kelvin, 2500, 9000, 0, 100 ) );
                    }
                } );
            }
            else {
                if ( typeof callback === "function" ) {
                    callback( true, false );
                }
            }
        },
        set: function ( device_data, temperature, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            var light = getLight( device_data.id );
            if ( typeof light === "object" ) {

                // Get more information about light
                light.data.client.getState( function ( error, data ) {

                    // If error return immediately
                    if ( error ) {
                        return callback( error, null );
                    }
                    else if ( typeof data === "object" ) {

                        // Convert temperature to usable range for Lifx and update temperature
                        light.data.client.color( data.color.hue, data.color.saturation, data.color.brightness, mapRange( temperature, 0, 100, 2500, 9000 ) );

                        if ( callback ) callback( error, temperature );
                    }
                } );
            }
            else {
                if ( typeof callback === "function" ) {
                    callback( true, false );
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
module.exports.renamed = function ( device_data, new_name ) {

    // Check for valid new name
    if ( typeof device_data === "object" && typeof new_name === "string" && new_name !== '' ) {

        // Parse new label and truncate at 32 bytes
        var label = Cutter.truncateToBinarySize( new_name, 32 );

        // Get light targeted
        var light = getLight( device_data.id );
        var temp_light = getLight( device_data.id, temp_lights );

        // Store new name internally
        if ( light ) light.name = label;
        if ( temp_light ) temp_light.name = label;

        // Set new label with a max of 32 bytes (LIFX limit)
        if ( light ) light.data.client.setLabel( label );
    }
};

/**
 * Util function that maps values between ranges
 * @param value
 * @param low1
 * @param high1
 * @param low2
 * @param high2
 * @returns {*}
 */
function mapRange ( value, low1, high1, low2, high2 ) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}

/**
 * Gets a light from one of the internal device arrays
 * uses lights by default
 * @param device_id
 * @param list, optional
 * @returns {*}
 */
function getLight ( device_id, list ) {
    var found_light = null;
    var list = (list) ? list : lights;
    list.forEach( function ( light ) {
        if ( light.data.id === device_id ) {
            found_light = light;
        }
    } );
    return found_light;
}