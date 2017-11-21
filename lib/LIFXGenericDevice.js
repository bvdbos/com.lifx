'use strict';

const Homey = require('homey');
const LIFXApi = require('./LIFXApi');

class LIFXGenericDevice extends Homey.Device {
	
	onInit() {
		
		let data = this.getData();
		this._id = data.id;
		
		let store = this.getStore();
		this._token = store.token;
		
		// app < 3.0.0
		if( !this._token ) return this.setUnavailable( Homey.__('old_device') );
		
		this._api = new LIFXApi();
		this._api.setToken( this._token );
		this._api.on('token', this._onToken.bind(this));
		
		let capabilities = this.getCapabilities();
		
		this.registerMultipleCapabilityListener(capabilities , ( valueObj, optsObj ) => {
			let duration = optsObj[ Object.keys(optsObj)[0] ].duration;
			console.log('duration', duration);
			
			return this._setState(valueObj, duration)
		}, 100);
				
	}
	
	_onToken( token ) {
		this.log('Refreshed OAuth2 token');
		this._token = token;
		this.setStoreValue('token', this._token)
			.catch( this.error );
	}
	
	_setState( newHomeyState, duration ) {
		
		let homeyState = Object.assign({
			onoff: this.getCapabilityValue('onoff') || true,
			dim: this.getCapabilityValue('dim') || 1,
			light_hue: this.getCapabilityValue('light_hue') || 0,
			light_saturation: this.getCapabilityValue('light_saturation') || 1,
			light_temperature: this.getCapabilityValue('light_temperature') || 0.5,
			light_mode: this.getCapabilityValue('light_mode'),
		}, newHomeyState)
		
		let lifxState = {}
			lifxState.power = homeyState.onoff ? 'on' : 'off'
			
		if( homeyState.light_mode === 'temperature' ) {
			
			// The LIFX Kelvin range is 1500-9000
			let kelvin = Math.round(1500 + (1-homeyState.light_temperature) * ( 9000 - 1500 ));
			
			lifxState.color = `kelvin:${kelvin}`;
			lifxState.brightness = homeyState.dim;
		} else {
			lifxState.color = `hue:${Math.round(homeyState.light_hue*360)} saturation:${homeyState.light_saturation} brightness:${homeyState.dim}`;
		}
		
		if( typeof duration === 'number' ) {
			lifxState.duration = duration / 1000;
		}
		
		console.log('homeyState', homeyState)
		console.log('lifxState', lifxState)
		
		return this._api.setState({
			selector: `id:${this._id}`,
			state: lifxState
		})
	}
	
}

module.exports = LIFXGenericDevice;