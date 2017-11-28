'use strict';

const events = require('events');
const querystring = require('querystring');

const rp = require('request-promise-native');
const Homey = require('homey');

const scopes = [
	'remote_control:all',
];
const userAgent = 'Homey (com.lifx)';

class LIFXApi extends events.EventEmitter {
	
	constructor() {
		super();
	
		this._clientId = Homey.env.CLIENT_ID;
		this._clientSecret = Homey.env.CLIENT_SECRET;
		this._oAuth2AuthorizationUrl = ` https://cloud.lifx.com/oauth/authorize`;
		this._oAuth2TokenUrl = `https://cloud.lifx.com/oauth/token`
		this._apiUrl = `https://api.lifx.com/v1`;
		this._redirectUri = 'https://callback.athom.com/oauth2/callback';
		this._token = null;
		
	}

	/*
		OAuth2 Methods
	*/

	getOAuth2AuthorizationUrl() {
		let qs = querystring.stringify({
			client_id: this._clientId,
			response_type: 'code',
			scope: scopes.join(' ')
		});
		return `${this._oAuth2AuthorizationUrl}?${qs}`;
	}

	async getOAuth2Token( code ) {
		return rp.post({
			url: this._oAuth2TokenUrl,
			json: true,
			headers: {
				'User-Agent': userAgent,
			},
			form: {
				client_id: this._clientId,
				client_secret: this._clientSecret,
				grant_type: 'authorization_code',
				code: code,
			}
		}).catch( err => {
			if( err && err.error ) {
				throw new Error( err.error.error || err.error )
			} else {
				throw err;
			}
		});
	}

	async refreshOAuth2Token() {

		if( typeof this._token !== 'object' )
			throw new Error('Missing token');
			
		return rp.post({
			url: this._oAuth2TokenUrl,
			json: true,
			form: {
				client_id: this._clientId,
				client_secret: this._clientSecret,
				refresh_token: this._token.refresh_token,
				grant_type: 'refresh_token',
			}
		})
	}

	getToken() {
		return this._token;
	}

	setToken( token ) {
		this._token = token;
	}
	
	/*
		API Helper methods
	*/	
	async _call( method, path, data, isRefreshed ) {

		if( typeof this._token !== 'object' )
			throw new Error('Missing token');
			
		return rp({
			method: method,
			url: `${this._apiUrl}${path}`,
			json: data || true,
			headers: {
				'User-Agent': userAgent,
				'Authorization': `Bearer ${this._token.access_token}`
			}
		}).catch( err => {
			
			// check if access_token is expired, try to refresh it
			if( !isRefreshed && err.statusCode === 401 )
				return this.refreshOAuth2Token()
					.then( token => {
						this.setToken(token);
						this.emit('token', this._token);
						return this._call( method, path, data, true );
					})
			if( err && err.error ) {
				throw new Error( err.error.error || err.error )
			} else {
				throw err;
			}
		})
	}

	_get( path ) {
		return this._call( 'GET', path );
	}

	_post( path, data ) {
		return this._call( 'POST', path, data );
	}

	_put( path, data ) {
		return this._call( 'PUT', path, data );
	}

	_delete( path, data ) {
		return this._call( 'DELETE', path, data );
	}
	
	/*
		LIFX Methods
	*/
	
	getLights({ selector = 'all' } = {}) {
		return this._get(`/lights/${selector}`);
	}
	
	setState({ selector = 'all', state = {} }) {
		return this._put(`/lights/${selector}/state`, state);
	}
	
	setStates({ selector = 'all', states = [], defaults = {} }) {
		return this._put(`/lights/states`, {
			states: states,
			defaults: defaults
		});
	}
}

module.exports = LIFXApi;