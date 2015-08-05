"use strict";
  
function App() 
{
	
}

module.exports = App;

App.prototype.init = function(){

	// flow:action:on
	Homey.manager('flow').on('action.on', function( args, callback ){
		if( typeof args.device == 'undefined' ) return;
		var driver = Homey.manager('drivers').getDriver( args.device.driver.id );

		//TODO check for specific bulb or all bulbs
		// Turn on bulb(s)
		driver.capabilities.onoff.set( args.device.data, true, args.device.bulb, callback );

		//TODO integrate color object
		// Set given color on bulb(s)
		if(args.hue){
			driver.capabilities.hue.set( args.device.data, args.hue, callback )
		}
		if(args.saturation){
			driver.capabilities.saturation.set( args.device.data, args.saturation, callback )
		}
		if(args.brightness){
			driver.capabilities.brightness.set( args.device.data, args.brightness, callback )
		}
		if(args.temperature){
			driver.capabilities.temperature.set( args.device.data, args.temperature, callback )
		}
	});

	// flow:action:off
	Homey.manager('flow').on('action.off', function( args, callback ){
		if( typeof args.device == 'undefined' ) return;
		var driver = Homey.manager('drivers').getDriver( args.device.driver.id );

		// Turn off bulb(s)
		driver.capabilities.onoff.set( args.device.data, false, args.device.bulb, callback );
	});

	// flow:action:color
	Homey.manager('flow').on('action.color', function( args, callback ){
		if( typeof args.device == 'undefined' ) return;
		var driver = Homey.manager('drivers').getDriver( args.device.driver.id );

		//TODO integrate color object
		// Set given color on bulb(s)
		if(args.hue){
			driver.capabilities.hue.set( args.device.data, args.hue, callback )
		}
		if(args.saturation){
			driver.capabilities.saturation.set( args.device.data, args.saturation, callback )
		}
		if(args.brightness){
			driver.capabilities.brightness.set( args.device.data, args.brightness, callback )
		}
		if(args.temperature){
			driver.capabilities.temperature.set( args.device.data, args.temperature, callback )
		}
	});
};

App.prototype.speech = function( speech ) {
	Homey.manager('speech-output').say( "hello" );
}