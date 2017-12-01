'use strict';

const Homey = require('homey');
const LIFXApi = require('./LIFXApi');
const assert = require('assert');

const POLL_INTERVAL = 5000;		
const DEFAULT_CAPABILITY_VALUES = {
	onoff: true,
	dim: 1,
	light_saturation: 1,
	light_temperature: 0.5,
	light_mode: 'color',
	lifx_infrared: 0
}

class LIFXGenericDevice extends Homey.Device {
	
	onInit() {
		
		let data = this.getData();
		this._id = data.id;
		
		let store = this.getStore();
		this._token = store.token;
		
		this._minKelvin = ( typeof store.min_kelvin === 'number' ) ? store.min_kelvin : 1500;
		this._maxKelvin = ( typeof store.max_kelvin === 'number' ) ? store.max_kelvin : 9000;
		this._zonesCount = ( typeof store.zones_count === 'number' ) ? store.zones_count : null;
		
		// app < 3.0.0
		if( !this._token ) return this.setUnavailable( Homey.__('old_device') );
		
		this._api = new LIFXApi();
		this._api.setToken( this._token );
		this._api.on('token', this._onToken.bind(this));
		
		let capabilities = this.getCapabilities();
		
		this.registerMultipleCapabilityListener(capabilities, this._onMultipleCapabilityListener.bind(this), 100);
		
		this._getStateInterval = setInterval(this._getStatePoll.bind(this), POLL_INTERVAL)
		this._getState();
		
		this._settingState = null;
				
	}
	
	getApiInstance() {
		return this._api;
	}
	
	setInfrared( value, duration ) {
		return this._setState({
			lifx_infrared: value,
			duration: duration
		});
	}
	
	setMultizone( colors, duration ) {
						
		let states = [];
		for( let zoneIndex = 0; zoneIndex < this._zonesCount; zoneIndex++ ) {
			let colorIndex = Math.floor(colors.length / this._zonesCount * zoneIndex)
			states[zoneIndex] = {
				selector: `id:${this._id}|${zoneIndex}`,
				color: colors[ colorIndex ]
			}
		}
		
		if( typeof duration === 'number' ) 
			duration /= 1000;
		
		return this._api.setStates({
			states: states,
			defaults: {
				duration: duration
			}
		}).then(result => {
			this._settingState = null;			
			return this._getState();
		}).catch( err => {
			this._settingState = null;
			throw err;
		})
		
	}
	
	_onMultipleCapabilityListener( valueObj, optsObj ) {
		let duration = undefined;
		if( Object.keys(optsObj).length ) {
			optsObj[ Object.keys(optsObj)[0] ].duration;
		}
		
		return this._setState(valueObj, duration)	
	}
	
	_onToken( token ) {
		this.log('Refreshed OAuth2 token');
		this._token = token;
		this.setStoreValue('token', this._token)
			.catch( this.error );
	}
	
	async _getStatePoll() {
		
		if( this._settingState instanceof Date ) {
			let now = (new Date()).getTime();
			if( now - this._settingState.getTime() < POLL_INTERVAL ) return;
		}
		
		return this._getState();
	}
	
	async _getState() {		
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
							
			let promises = [];
				promises.push( this.setAvailable() );
				
			let newHomeyState = {};			
			
			newHomeyState.onoff = light.power === 'on';			
			newHomeyState.dim = light.brightness;
			newHomeyState.light_hue = light.color.hue / 360;
			newHomeyState.light_saturation = light.color.saturation;
			newHomeyState.light_temperature = 1 - ( ( light.color.kelvin - this._minKelvin ) / ( this._maxKelvin - this._minKelvin ) );
			newHomeyState.light_mode = ( newHomeyState.light_saturation === 0 ) ? 'temperature' : 'color';
			newHomeyState.lifx_infrared = parseFloat( light.infrared );
			
			for( let capabilityId in newHomeyState ) {
				if( !this.hasCapability(capabilityId) ) continue;
				
				let promise = this.setCapabilityValue( capabilityId, newHomeyState[capabilityId]);
				promises.push( promise );
			}
			
			return Promise.all(promises);
		}).catch( err => {
			this.error( err )
			return this.setUnavailable( err );
		}).catch( err => {
			this.error( err );
		});
	}
	
	_setState( newHomeyState, duration ) {
				
		let homeyState = {};
		this.getCapabilities().forEach( capabilityId => {
			
			if( typeof newHomeyState[capabilityId] !== 'undefined' ) {			
				homeyState[ capabilityId ] = newHomeyState[capabilityId];
			} else {
				let currentValue = this.getCapabilityValue(capabilityId);
				if( typeof currentValue !== 'undefined' ) {
					homeyState[ capabilityId ] = currentValue;
				} else {
					homeyState[ capabilityId ] = DEFAULT_CAPABILITY_VALUES[capabilityId];
				}
			}
		});
		
		let lifxState = {}
		
		if( typeof homeyState.onoff === 'boolean' ) {
			lifxState.power = homeyState.onoff ? 'on' : 'off'
		}
			
		if( typeof homeyState.lifx_infrared === 'number' ) {		
			lifxState.infrared = homeyState.lifx_infrared;
		}
		
		if( typeof homeyState.dim === 'number' ) {
			lifxState.brightness = homeyState.dim;
		}
		
		if( typeof duration === 'number' ) {
			lifxState.duration /= 1000;
		}
		
		if( typeof newHomeyState.light_hue !== 'undefined' 
		 || typeof newHomeyState.lightsaturation !== 'undefined' 
		 || typeof newHomeyState.light_temperature !== 'undefined' 
		 || typeof newHomeyState.light_mode !== 'undefined' ) {
		
			let lightMode = homeyState.light_mode;
			if( lightMode === null ) {
				if( newHomeyState.light_temperature ) lightMode = 'temperature';
				else lightMode = 'color';
			}
				
			if( lightMode === 'temperature' ) {
				
				let kelvin = Math.round(this._minKelvin + (1-homeyState.light_temperature) * ( this._maxKelvin - this._minKelvin ));
				
				lifxState.color = `kelvin:${kelvin}`;
				lifxState.brightness = homeyState.dim;
			} else if( lightMode === 'color' ) {
				lifxState.color = `hue:${Math.round(homeyState.light_hue*360) || 0} saturation:${homeyState.light_saturation || 1} brightness:${homeyState.dim || 1}`;
			}
		}
				
		this._settingState = new Date();
				
		return this._api.setState({
			selector: `id:${this._id}`,
			state: lifxState
		}).then(result => {
			this._settingState = null;
			return result;
		}).catch( err => {
			this._settingState = null;
			throw err;
		})
	}
	
}

module.exports = LIFXGenericDevice;