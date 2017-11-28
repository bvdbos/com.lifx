'use strict';

const Homey = require('homey');

class LIFXApp extends Homey.App {
	
	onInit() {
		new Homey.FlowCardAction('set_scene')
			.register()
			.registerRunListener(args => {
				let api = this._getLIFXApiInstance();
		
				if( typeof args.duration === 'number' ) 
					args.duration /= 1000;
					
				return api.setScene({
					sceneUuid: args.scene.uuid,
					duration: args.duration
				});
			})
			.getArgument('scene')
			.registerAutocompleteListener( query => {
				let api = this._getLIFXApiInstance();
				return api.getScenes().then( scenes => {
					return scenes.map(scene => {
						return {
							name: scene.name,
							uuid: scene.uuid
						}
					})
				});
			})
	}
	
	_getLIFXApiInstance() {
		let driver = Homey.ManagerDrivers.getDriver('lifx');
		if( driver instanceof Error ) throw driver;
		
		let devices = driver.getDevices();
		if( devices.length < 1 ) throw new Error('Please add a device first.');
		
		return devices[0].getApiInstance();
	}
	
}

module.exports = LIFXApp;