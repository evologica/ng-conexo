'use strict';

describe('', function() {

  var module;
  var dependencies;
  dependencies = [];

  var hasModule = function(module) {
  return dependencies.indexOf(module) >= 0;
  };

  beforeEach(function() {

  // Get module
  module = angular.module('ngConexo');
  dependencies = module.requires;
  });

  it('should load config module', function() {
    expect(hasModule('ngConexo.config')).to.be.ok;
  });

  

  

  
  it('should load services module', function() {
    expect(hasModule('ngConexo.services')).to.be.ok;
  });
  

});