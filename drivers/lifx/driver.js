var _ = require('underscore');
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

    // Loop bulbs found by Lifx
    client.on('light-new', function ( light ) {

        // Get more data about the light
        light.getState( function ( error, data ) {

            // Check if device was installed before
            var devices = (_.findWhere(devices_data, {id: light.id})) ? lights : temp_lights;

            // Add them to create devices array
            devices.push( {
                data: {
                    id: light.id,
                    client: light,
                    status: light.status
                },
                name: data.label
            } );
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
     */
    list_devices: function ( callback ) {
        var devices = [];
        temp_lights.forEach(function (temp_light){
            devices.push({
                data: {
                    id: temp_light.data.id
                },
                name: temp_light.name
            });
        });

        callback(devices);
    },

    add_device: function (callback, emit, device){

        temp_lights.forEach(function(temp_light){
            if(temp_light.data.id === device.data.id){
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
    }

};

/**
 * These represent the capabilities of the Lifx light bulbs
 */
module.exports.capabilities = {

    onoff: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            var light = getLight( device_data.id );

            // Get more information about light
            light.data.client.getState( function ( error, data ) {

                // Determine on/off state
                var state = ( data.power === 1 ) ? true : false;

                // Return current bulb state
                if ( callback ) callback( state );
            });
        },
        set: function ( device_data, onoff, callback ) {

            var light = getLight( device_data.id );

            if ( onoff ) {

                // Turn bulb on with global duration setting
                light.data.client.on( globalSettings.duration );

                // Let know that bulb is turned on
                callback( true );
            }
            else {

                // Turn bulb off with global duration setting
                light.data.client.off( globalSettings.duration );

                // Let know that bulb is turned off
                callback( false );
            }
        }
    },

    hue: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            var light = getLight( device_data.id );

            // Get more information about light
            light.data.client.getState( function ( error, data ) {

                // Return mapped hue
                if ( callback ) callback( mapRange( data.color.hue, 0, 360, 0, 100 ) );
            } );
        },
        set: function ( device_data, hue, callback ) {

            var light = getLight( device_data.id );

            // Get more information about light
            light.data.client.getState( function ( error, data ) {

                // Change light color
                console.log(hue);
                light.data.client.color( mapRange( hue, 0, 100, 0, 360 ), data.color.saturation, data.color.brightness );

                if ( callback ) callback( hue );
            } );
        }
    },

    saturation: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            var light = getLight( device_data.id );

            // Get more information about light
            light.data.client.getState( function ( error, data ) {

                // Return saturation
                if ( callback ) callback( data.color.saturation );
            } );
        },
        set: function ( device_data, saturation, callback ) {

            var light = getLight( device_data.id );

            // Get more information about light
            light.data.client.getState( function ( error, data ) {

                // Change light color
                light.data.client.color( data.color.hue, saturation, data.color.brightness );

                if ( callback ) callback( saturation );
            } );
        }
    },

    brightness: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            var light = getLight( device_data.id );

            // Get more information about light
            light.data.client.getState( function ( error, data ) {

                // Return brightness
                if ( callback ) callback( data.color.brightness );
            } );
        },
        set: function ( device_data, brightness, callback ) {

            var light = getLight( device_data.id );

            // Get more information about light
            light.data.client.getState( function ( error, data ) {

                // Change light color
                light.data.client.color( data.color.hue, data.color.saturation, brightness );

                if ( callback ) callback( brightness );
            } );
        }
    },

    temperature: {
        get: function ( device_data, callback ) {
            if ( device_data instanceof Error ) return callback( device_data );

            var light = getLight( device_data.id );

            // Get more information about light
            light.data.client.getState( function ( error, data ) {

                // Return mapped kelvin value
                if ( callback ) callback( mapRange( data.color.kelvin, 2500, 9000, 0, 100 ) );
            } );
        },
        set: function ( device_data, temperature, callback ) {

            var light = getLight( device_data.id );

            // Get more information about light
            light.data.client.getState( function ( error, data ) {

                // Convert temperature to usable range for Lifx and update temperature
                light.data.client.color( data.color.hue, data.color.saturation, data.color.brightness, mapRange( temperature, 0, 100, 2500, 9000 ) );

                if ( callback ) callback( temperature );
            } );
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

function getLight ( device_id ) {
    var found_light = null;
    lights.forEach(function(light){
        if(light.data.id === device_id){
            found_light = light;
        }
    });
    return found_light;
}