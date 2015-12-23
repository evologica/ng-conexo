(function (angular) {

  // Create all modules and define dependencies to make sure they exist
  // and are loaded in the correct order to satisfy dependency injection
  // before all nested files are concatenated by Gulp

  // Config
  angular.module('ngConexo.config', [])
      .value('ngConexo.config', {
          debug: true
      });

  // Modules
  angular.module('ngConexo.services', ['LocalStorageModule']);

  angular.module('ngConexo',
      [
          'ngConexo.config',
          'ngConexo.services',
          'ngSanitize'
      ]);

})(angular);

'use strict';

var mod = angular.module('ngConexo.services');

mod.constant('$cxConstants', {
	LOGOUT: 4,
	LOGIN: 5,
	USER_DATA: 7,
	OPEN_UC: 11
});

mod.factory('$cxAuth',['$cxRequest', '$q', 'localStorageService', '$cxConstants',
	function($cxRequest, $q, localStorageService, $cxConstants) {

		var cxAuth = {};
		var user;

		cxAuth.updateSession = function(context) {
			localStorageService.set('context', context);
		};

		cxAuth.getAuth = function() {
			var context = $cxRequest.getSessionContext();
			if (context === undefined) {
				context = localStorageService.get('context');
				if (context !== undefined || context !== null) {
					$cxRequest.setSessionContext(angular.fromJson(context));
				} else {
					context = undefined;
				}
			}
			return context;
		};

		cxAuth.cleanAuth = function() {
			localStorageService.remove('context');
			localStorageService.remove('user');
			this.user = {
				name: '',
				nature: 'anonymous'
			};
		};

		cxAuth.isAuthenticated = function () {
			return (this.getAuth() !== undefined || this.getAuth() !== null);
		};

		cxAuth.isAuthorized = function (authorizedNatures) {
			if (!angular.isArray(authorizedNatures)) {
				authorizedNatures = [authorizedNatures];
			}
			console.log('user role: ' + this.user.nature + ' authorized: ' + authorizedNatures[0]);
			return authorizedNatures.indexOf(this.user.nature) !== -1;
		};

		cxAuth.login = function(credentials) {
			var self = this;
			var deferred = $q.defer();

			$cxRequest.openSession(credentials).then(
				function (response) {
					console.log(response);
					localStorageService.set('context', response);
					$cxRequest.getUserData(credentials).then(
						function(data) {
							self.user = {};
							self.user.id = data.SYSMSG.ID[0]._;
							self.user.login = data.SYSMSG.Name[0]._;
							self.user.email = data.SYSMSG.Email[0]._;
							if (data.SYSMSG.Profile !== undefined) {
								self.user.nature = data.SYSMSG.Profile[0]._;
							} else {
								self.user.nature = 'unknown';
							}

							localStorageService.set('user', self.user);
							deferred.resolve(self.user);
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
			return deferred.promise;
		};

		cxAuth.logout = function() {

			var deferred = $q.defer();

			$cxRequest.closeSession().then(
				function (response) {
					cxAuth.cleanAuth();
					deferred.resolve(true);
				},
				function (err) {
					deferred.reject(err);
				}
			);
			return deferred.promise;
		};

		cxAuth.getUser = function () {
			if (this.user === undefined) {
				this.user = localStorageService.get('user');
				if (this.user === undefined || this.user === null) {
					this.user = {
						name: '',
						nature: 'anonymous'
					};
				} else  {
					this.user = angular.fromJson(this.user);
				}
			}
			return this.user;
		};

		$cxRequest.registerOnContextUpdate(cxAuth.updateSession);
		cxAuth.getAuth();
		cxAuth.getUser();
		return cxAuth;
	}
]);

'use strict';

var mod = angular.module('ngConexo.services');

mod.provider('$cxRequest', [
	function() {

		var url = '';
		var server = 'localhost';
		var syscode = '';
		var port = '';
		var channel = '';
		var timeout = 100000;
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
							$timeout.cancel(self.timer);
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
							$timeout.cancel(self.timer);
						}

						self.onConnectionError(err);
						deferred.reject(err);
					}
				);
				return deferred.promise;
			};

			cxRequest.getUserData = function(auth) {
				var self = this;

				var deferred = $q.defer();

				var data = {
					SYSMSG: {
						_SignalName: $cxConstants.USER_DATA,
						_Recipient: 0,
						SYSTEM_CODE: syscode,
						LOGIN: auth.username,
						AUDIT_CONTEXT: '',
						CLIENT_VERSION: '1.0.5.0',
						CHANNEL: channel
					}
				};

				self.execute(data).then(
					function (response) {
						deferred.resolve(response);
					},
					function (err) {
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

'use strict';

var mod = angular.module('ngConexo.services');

mod.factory('$cxRequestInterceptor',['$injector',
	function ($injector) {
		var cxInterceptor = {};
		cxInterceptor.request = function (req) {
			var context = $injector.get('$cxAuth').getAuth();
			if (req.method === 'POST' && req.data!==undefined) {
				if (req.data.SYSMSG._SerialNumber === undefined) {
					req.data.SYSMSG._SerialNumber = 0;
				}
				if (req.data.SYSMSG._Sender === undefined) {
					req.data.SYSMSG._Sender = 0;
				}
				if (req.data.SYSMSG._Recipient === undefined) {
					if (context !== undefined) {
						req.data.SYSMSG._Recipient = context.mainUCid;
					} else {
						req.data.SYSMSG._Recipient = 0;
					}
				}
			}
			return req;
		};
		return cxInterceptor;
	}
]);

mod.config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.push('$cxRequestInterceptor');
}]);

mod.config(['localStorageServiceProvider', function(localStorageServiceProvider) {
  localStorageServiceProvider.setPrefix('auth');
  localStorageServiceProvider.setStorageType('localStorage');
  localStorageServiceProvider.setNotify(true, true);
}]);
