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
  localStorageServiceProvider.setPrefix('sala-segurado');
  localStorageServiceProvider.setStorageType('localStorage');
  localStorageServiceProvider.setNotify(true, true);
}]);