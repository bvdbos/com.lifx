'use strict';

const Homey = require('homey');
const LIFXApi = require('./LIFXApi');

class LIFXGenericDriver extends Homey.Driver {
	
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
						
						devices.push({
							data: {
								id: device.id
							},
							name: device.label,
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
	
}

module.exports = LIFXGenericDriver;