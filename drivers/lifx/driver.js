var Lifx = require( 'node-lifx' ).Client;
var client = new Lifx();

/**
 * Global settings object, to keep track of color settings for multiple bulbs
 */
var globalSettings = {
    duration: 500
};

/***
 * Initially start Lifx client to search for bulbs on the network
 * @param devices (already installed)
 * @param callback
 */
module.exports.init = function ( devices, callback ) {

    // Initialize new Lifx client
    client.init();

    // Listing for incoming bulbs
    client.on( 'bulb-new', function ( bulb ) {
        console.log( 'New bulb found: ' + bulb.address + ':' + bulb.port );
    } );

    callback (true);
};

/**
 * Pairing process that calls list_devices when in need of all devices
 * Lifx can find, here the devices array is built and send to the front-end
 */
module.exports.pair = {

    /**
     * Constructs array of all available devices
     */
    list_devices: function ( callback ) {
        var devices = [];

        // Loop bulbs found by Lifx
        client.lights().forEach( function ( bulb ) {

            // Add them to create devices array
            devices.push( {
                data: {
                    id: bulb.id, //TODO check
                    bulb: bulb
                },
                name: bulb.label //TODO check
            } );
        } );

        // Send devices array to front-end
        callback( devices );
    }
};

/**
 * These represent the capabilities of the Lifx light bulbs
 */
module.exports.capabilities = {

    onoff: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            // Return current bulb state
            if ( callback ) callback( device_data.bulb.state ); //TODO check
        },
        set: function ( device_data, onoff, callback ) {

            if ( onoff ) {

                // Turn bulb on with global duration setting
                device_data.bulb.on( globalSettings.duration );

                // Let know that bulb is turned on
                callback( true );
            }
            else {

                // Turn bulb off with global duration setting
                device_data.bulb.off( globalSettings.duration );

                // Let know that bulb is turned off
                callback( false );
            }
        }
    },
    hue: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            // Return mapped hue
            if ( callback ) callback( mapRange( device_data.bulb.hue, 0, 360, 0, 100 ) ); //TODO check
        },
        set: function ( device_data, hue, callback ) {

            device_data.bulb.color( mapRange( hue, 0, 100, 0, 360 ), device_data.bulb.saturation, device_data.bulb.brightness );

            if ( callback ) callback( hue );
        }
    },

    saturation: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            // Return saturation
            if ( callback ) callback( device_data.bulb.saturation ); //TODO check
        },
        set: function ( device_data, saturation, callback ) {

            device_data.bulb.color( device_data.bulb.hue, saturation, device_data.bulb.brightness );

            if ( callback ) callback( saturation );
        }
    },

    brightness: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            // Return brightness
            if ( callback ) callback( device_data.bulb.brightness ); //TODO check
        },
        set: function ( device_data, brightness, callback ) {

            device_data.bulb.color( device_data.bulb.hue, device_data.bulb.saturation, brightness );

            if ( callback ) callback( brightness );
        }
    },

    temperature: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            // Return mapped kelvin value
            if ( callback ) callback( mapRange( device_data.bulb.kelvin, 2500, 9000, 0, 100 ) ); //TODO check
        },
        set: function ( device_data, temperature, callback ) {

            // Convert temperature to usable range for Lifx and update temperature
            device_data.bulb.color( device_data.bulb.hue, device_data.bulb.saturation, device_data.bulb.brightness, mapRange( temperature, 0, 100, 2500, 9000 ) ); //TODO check

            if ( callback ) callback( temperature );
        }
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