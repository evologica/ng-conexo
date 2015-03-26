'use strict';

var mod = angular.module('ngConexo.services');

mod.provider('$cxRequest', [
	function() {

		var url = '';
		var server = 'localhost';
		var syscode = '';
		var port = '';
		var channel = '';
		var timeout = 10000;
		var config = {};

		var updateConfig = function() {

			config = {
				headers: {
					'Content-type': 'application/json',
					'cxSystemCode': syscode,
					'cxServer': server,
					'cxPort': port
				}
			};

		};

		this.setUrl = function(value) {
			url = value;
		};

		this.setServer = function(value) {
			server = value;
			updateConfig();
		};

		this.setSysCode = function(value) {
			syscode = value;
			updateConfig();
		};

		this.setPort = function(value) {
			port = value;
			updateConfig();
		};

		this.setChannel = function(value) {
			channel = value;
		};

		this.setTimeout = function(value) {
			timeout = value;
		};		

		this.$get = function($http, $q, $rootScope, $cxConstants, $timeout) {

			var context;
			var contextListener;
			var timer;

			var onConnectionError;
			var onTimeoutError;
			var onContextUpdate;

			var cxRequest = {};

			cxRequest.registerOnConnectionError = function (callback) {
				this.onConnectionError = callback;
			};

			cxRequest.registerOnTimeoutError = function (callback) {
				this.onTimeoutError = callback;
			};

			cxRequest.registerOnContextUpdate = function (callback) {
				this.onContextUpdate = callback; 
			};

			cxRequest.getSessionContext = function () {
				return this.context;
			};

			cxRequest.setSessionContext = function(ctx) {
				this.context = ctx;
			};

			cxRequest.initSessionContext = function() {
				var ctx = {
					mainUCid: undefined,
					openUC: {}
				};

				return ctx;
			};

			cxRequest.resetSessionContext = function() {
				this.context = undefined;
			};

			cxRequest.updateContext = function() {
				if (this.onContextUpdate !== undefined) {
					this.onContextUpdate(this.getSessionContext());
				}
			};

			cxRequest.getSessionContext = function() {
				return this.context;
			};

			cxRequest.newRequest = function(ucid, signal) {
				var req = {};
				req.ucid = ucid;
				req.signal = signal;

				req.data = {
					SYSMSG: {
						_SignalName: undefined,
						_SerialNumber: undefined,
						_Recipient: undefined,
						_Sender: undefined
					}
				};
				req.send = function() {
					return cxRequest.callUseCase(this.ucid, this.signal, this.data);
				};
				return req;
			};

			cxRequest.execute = function(data) {
				var self = this;
				var deferred = $q.defer();
				console.log('execute:');
				console.log(data);
				$http.post(url, data, config).success(
					function(response) {
						console.log(response);
						if (response.SYSMSG._Id === 1) { //SYSTEM ERROR
							if (response.SYSMSG.MESSAGE[0]._.indexOf('Destinario da requisição não encontrado') > -1) {
								self.resetSessionContext();
								self.onTimeoutError(response.SYSMSG.MESSAGE[0]._);
							}
							deferred.reject(response.SYSMSG.MESSAGE[0]._);
						}
						else if (response.SYSMSG._Id === 2) {
							deferred.reject(response.SYSMSG.MESSAGE[0]._);
						}
						else {

							deferred.resolve(response);
						}
						//timeout
						if (self.timer !== undefined) {
							console.log('canceling timeout');
							$timeout.cancel(timer);
						}
						console.log('reset timeout');
						self.timer = $timeout(
							function() {
								console.log('timeout reached');
								self.resetSessionContext();
								self.onTimeoutError('Tempo limite da sessão expirado');
							},
							timeout
						);
					}
				).error(
					function(err) {
						//calback

						//timeout
						if (self.timer !== undefined) {
							console.log('canceling timeout2');
							$timeout.cancel(timer);
						}

						self.onConnectionError(err);
						deferred.reject(err);
					}
				);
				return deferred.promise;
			};

			cxRequest.openSession = function(auth) {

				var self = this;

				var deferred = $q.defer();

				var data = {
					SYSMSG: {
						_SignalName: $cxConstants.LOGIN,
						_Recipient: 0,
						SYSTEM_CODE: syscode,
						LOGIN: auth.username,
						PASSWORD: auth.password,
						AUDIT_CONTEXT: '',
						CLIENT_VERSION: '1.0.5.0',
						CHANNEL: channel
					}
				};

				console.log(data);

				self.execute(data).then(
					function (response) {
						self.context = self.initSessionContext();
						self.context.mainUCid = response.SYSMSG.UCID[0]._;
						deferred.resolve(self.context);
					},
					function (err) {
						deferred.reject(err);
					}
				);
				return deferred.promise;
			};

			cxRequest.closeSession 	= function() {

				var self = this;

				var deferred = $q.defer();

				var data = {
					SYSMSG: {
						_SignalName: $cxConstants.LOGOUT,
					}
				};

				self.execute(data).then(
					function (response) {
						self.resetSessionContext();
						deferred.resolve(true);
					},
					function (err) {
						deferred.reject(err);
					}
				);

				return deferred.promise;
			};

			cxRequest.openUseCase = function(ucid) {
				var data = {
					SYSMSG: {
						_Recipient: this.context.mainUCid,
						_SignalName: $cxConstants.OPEN_UC,
						USECASEID: ucid,
						GUIID: ucid
					}
				};
				return this.execute(data);
			};

			cxRequest.callUseCase = function(ucid, signal, msg) {
				var self = this;
				var deferred = $q.defer();

				console.log(self.context);

				if (self.context !== undefined) {
					console.log(self.context.openUC);
					if (self.context.openUC[ucid] === undefined) {
						//must open UC first
						self.openUseCase(ucid).then(
							function(response) {
								console.log('uc opened');
								console.log(response);

								self.context.openUC[ucid] = response.SYSMSG.UCID[0]._; //store Running UC Id
								self.updateContext();

								msg.SYSMSG._SignalName  	= signal;
								msg.SYSMSG._Recipient   	= self.context.openUC[ucid];
								self.execute(msg).then(
									function(resp) {
										deferred.resolve(resp);
									},
									function(err) {
										deferred.reject(err);
									}
								);
							},
							function (err) {
								deferred.reject(err);
							}
						);
					} else {
						msg.SYSMSG._SignalName  = signal;
						msg.SYSMSG._Recipient   = self.context.openUC[ucid];
						self.execute(msg).then(
							function(resp) {
								deferred.resolve(resp);
							},
							function(err) {
								deferred.reject(err);
							}
						);
					}
				} else {
					deferred.reject('not authenticated');
				}
				return deferred.promise;
			};
			return cxRequest;
		};
	}
]);
