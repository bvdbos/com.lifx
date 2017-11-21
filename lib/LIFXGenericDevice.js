'use strict';

const Homey = require('homey');
const LIFXApi = require('./LIFXApi');

const POLL_INTERVAL = 5000;

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
			return this._setState(valueObj, duration)
		}, 100);
		
		this._getStateInterval = setInterval(this._getState.bind(this), POLL_INTERVAL)
		this._getState();
				
	}
	
	_onToken( token ) {
		this.log('Refreshed OAuth2 token');
		this._token = token;
		this.setStoreValue('token', this._token)
			.catch( this.error );
	}
	
	_getState() {
		return this._api.getLights({
			selector: `id:${this._id}`,
		}).then( result => {
			if( result.length !== 1 )
				throw new Error('no_result');
			
			let light = result[0];
			
			if( light.id !== this._id )
				throw new Error('invalid_result');
				
			if( light.connected !== true )
				throw new Error( Homey.__('not_connected') ); 
			
			let onoff = light.power === 'on';
			let dim = light.brightness;
			let light_hue = light.color.hue / 360;
			let light_saturation = light.color.saturation;
			let light_temperature = 1 - ( ( light.color.kelvin - 1500 ) / ( 9000 - 1500 ) );
			let light_mode = ( light_saturation === 0 ) ? 'temperature' : 'color';
			
			return Promise.all([
				this.setAvailable(),
				this.setCapabilityValue('onoff', onoff),
				this.setCapabilityValue('dim', dim),
				this.setCapabilityValue('light_hue', light_hue),
				this.setCapabilityValue('light_saturation', light_saturation),
				this.setCapabilityValue('light_temperature', light_temperature),
				this.setCapabilityValue('light_mode', light_mode),
			]);
		}).catch( err => {
			this.error( err )
			return this.setUnavailable( err );
		}).catch( err => {
			this.error( err );
		});
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