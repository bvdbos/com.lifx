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
		if(args.color){
			driver.capabilities.color.set( args.device.data, args.color, callback )
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
		//Set temperature on kettle
		driver.capabilities.color.set( args.device.data, args, callback );
	});
};

App.prototype.speech = function( speech ) {
	Homey.manager('speech-output').say( "hello" );
}