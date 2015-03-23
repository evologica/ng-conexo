'use strict'

var app = angular.module('demo', ['ngConexo']);

app.controller('DemoCtrl', ['$cxAuth', '$cxRequest', '$scope', 
	function ($cxAuth, $cxRequest, $scope) {

		$scope.message = $cxAuth.getUser();

		$scope.login = function() {

			$scope.message = '';

			var credentials = {
				username: 'Administrador',
				password: '',
				syscode: 63
			};

			$cxAuth.login(credentials).then(
				function(response) {
					$scope.message = response
				},
				function(err) {
					$scope.message = err;
				}
			);
		};

		$scope.logout = function() {

			$scope.message = '';

			$cxAuth.logout().then(
				function(response) {
					$scope.message = 'logout successful'
				},
				function(err) {
					$scope.message = err;
				}
			);
		};

		$scope.listPolicies = function() {
			$scope.message = '';
			var req = $cxRequest.newRequest(2655, 'RM_CONSULTA_CONTRATOS');
			req.data.SYSMSG.CPF_CNPJ = '07031922720';
			req.send().then(
				function (response) {
					console.log(response);
					$scope.message = response;
				},
				function (err) {
					$scope.message = err;
				}
			);
		};
	}
]);

app.config(function($cxRequestProvider) {
	$cxRequestProvider.setUrl('http://192.168.0.32/cxIsapi/cxIsapiClient.dll/gatewayJSON');
	$cxRequestProvider.setServer('localhost');
	$cxRequestProvider.setSysCode(63);
	$cxRequestProvider.setPort(5370);
	$cxRequestProvider.setChannel('BANSEG');
	$cxRequestProvider.setTimeout(1500000);
});