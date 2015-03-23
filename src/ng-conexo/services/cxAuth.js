'use strict';

var mod = angular.module('ngConexo.services');

mod.constant('$cxConstants', {
	LOGOUT: 4,
	LOGIN: 5,
	OPEN_UC: 11
});

mod.constant('USER_ROLES', {
  all: '*',
  unknown: 'unknown',
  notConfirmed: 'not-confirmed',
  fullUser: 'full-user'

});

mod.factory('$cxAuth',['$cxRequest', '$q', '$cookies', '$cookieStore', '$cxConstants', 
	function($cxRequest, $q, $cookies, $cookieStore, $cxConstants) {

		var cxAuth = {};
		var user, token;

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
			user = {
				role: 'unknown'
			};
			$cookieStore.remove('context');
			$cookieStore.remove('user');
		};

		cxAuth.isAuthenticated = function () {
			return this.getAuth() !== undefined;
		};

		cxAuth.isAuthorized = function (authorizedRoles) {
			if (!angular.isArray(authorizedRoles)) {
				authorizedRoles = [authorizedRoles];
			}
			console.log('user role: ' + user.role + ' authorized: ' + authorizedRoles[0]);
			return authorizedRoles.indexOf(user.role) !== -1;
		};		

		cxAuth.login = function(credentials) {

			var deferred = $q.defer();

			$cxRequest.openSession(credentials).then(
				function (response) {
					console.log(response);
					$cookieStore.put('context', response);
					deferred.resolve(response.mainUCid);
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

		$cxRequest.registerContextListener(cxAuth.updateSession);

		cxAuth.getAuth();

		return cxAuth;
	}
]);