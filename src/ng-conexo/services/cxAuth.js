'use strict';

var mod = angular.module('ngConexo.services');

mod.constant('$cxConstants', {
	LOGOUT: 4,
	LOGIN: 5,
	OPEN_UC: 11
});

mod.factory('$cxAuth',['$cxRequest', '$q', '$cookies', '$cookieStore', '$cxConstants', 
	function($cxRequest, $q, $cookies, $cookieStore, $cxConstants) {

		var cxAuth = {};
		var user;

		cxAuth.updateSession = function(context) {
			$cookieStore.put('context', context);
		};

		cxAuth.getAuth = function() {
			var context = $cxRequest.getSessionContext();
			if (context === undefined) {
				context = $cookies.context;
				if (context !== undefined) {
					$cxRequest.setSessionContext(angular.fromJson(context));
				}
			}
			return context;
		};

		cxAuth.cleanAuth = function() {
			$cookieStore.remove('context');
			$cookieStore.remove('user');			
			this.user = {
				name: '',
				nature: 'anonymous'
			};
		};

		cxAuth.isAuthenticated = function () {
			return this.getAuth() !== undefined;
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
					$cookieStore.put('context', response);
					var req = $cxRequest.newRequest(2759, 'RM_OBTEM_DADOS_USUARIO');
					req.send().then(
						function(data) {
							self.user = {};
							self.user.id = data.SYSMSG.user[0].id[0]._; 
							self.user.login = data.SYSMSG.user[0].login[0]._; 
							self.user.nature = data.SYSMSG.user[0].nature[0]._;
							if (data.SYSMSG.user[0].name !== undefined) {
								self.user.name = data.SYSMSG.user[0].name[0]._;	
							}
							$cookieStore.put('user', self.user);
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
				this.user = $cookies.user;
				if (this.user === undefined) {
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

		$cxRequest.registerContextListener(cxAuth.updateSession);
		cxAuth.getAuth();
		cxAuth.getUser();
		return cxAuth;
	}
]);