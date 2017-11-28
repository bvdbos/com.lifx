'use strict';

const Homey = require('homey');
const LIFXApi = require('./LIFXApi');

class LIFXGenericDriver extends Homey.Driver {
	
	onInit() {
		
		new Homey.FlowCardAction('set_infrared')
			.register()
			.registerRunListener( args => {
				return args.device.setInfrared( args.infrared );
			})
		
	}
	
	onPair( socket ) {

		let lifxApi = new LIFXApi();

		let apiUrl = lifxApi.getOAuth2AuthorizationUrl();
		new Homey.CloudOAuth2Callback(apiUrl)
			.on('url', url => {
				socket.emit('url', url);
			})
			.on('code', async code => {
				try {
					let token = await lifxApi.getOAuth2Token(code);
					lifxApi.setToken(token);
					socket.emit('authorized');
				} catch( err ) {
					this.error( err );
					socket.emit('error', err.message || err.toString());
				}
			})
			.generate()
			.catch( err => {
				socket.emit('error', err);
			})

		socket.on('list_devices', ( data, callback ) => {
	
			return lifxApi.getLights()
				.then( result => {
	
					if( !Array.isArray(result) )
						throw new Error('Invalid response');
	
					let devices = [];
					result.forEach( device => {
						
						if( this._onPairFilter(device) !== true ) return;
						let capabilities = this._onPairGetCapabilities( device );
						
						devices.push({
							data: {
								id: device.id
							},
							name: device.label,
							capabilities: capabilities,
							store: {
								token: lifxApi.getToken()
							}
						});
					});
	
					callback( null, devices );
	
				})
				.catch( err => {
					this.error(err);
					socket.emit('error', err.message || err.toString());
				})
		});

	}
	
	_onPairFilter( device ) {
		return true;
	}
	
	_onPairGetCapabilities( device ) {						
		
		let homeyCapabilities = [ 'onoff', 'dim' ];
		let lifxCapabilities = device.product.capabilities;
		
		if( lifxCapabilities.has_color )
			homeyCapabilities.push('light_hue');
			homeyCapabilities.push('light_saturation');
		
		if( lifxCapabilities.has_variable_color_temp )
			homeyCapabilities.push('light_temperature');
		
		if( lifxCapabilities.has_color && lifxCapabilities.has_variable_color_temp )
			homeyCapabilities.push('light_mode');
			
		if( lifxCapabilities.has_ir )
			homeyCapabilities.push('lifx_infrared');
			
		if( lifxCapabilities.has_multizone )
			// TODO
		
		return homeyCapabilities;
	}
	
}

module.exports = LIFXGenericDriver;