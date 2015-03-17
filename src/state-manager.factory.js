/*
	angular-state-manager

	v0.5.1
	Changes:	New feature (config), backwards incompatible
	
	Joshua Beam
	
	joshua.a.beam@gmail.com
	
	(MIT) License
*/
;(function(angular) {
	'use strict';
	
	angular.module('stateManager')
		.factory('stateManager',stateManager);
		
	function stateManager() {
		var exports = {
			StateGroup: StateGroup,
			State: State
		},
			utils = {
				getStringModelToModel: getStringModelToModel,
				setStringModelToModel: setStringModelToModel
		};
		
		StateGroup.prototype = {
			getAll: getAll,
			models: models,
			config: config
		};
		
		State.prototype = {
			get: stateGet,
			start: start,
			stop: stop,
			done: done,
			subject: subject,
			model: model,
			isActive: isActive,
			and: and
		};
		
		return exports;	
		
		function StateGroup() {
			this.states = [];
			this.$scope = {};
						
			angular.forEach(arguments,function(state) {
				this.states.push(new State(state));
			}.bind(this));
			
			/*
				usage:
				
				vm.states = new stateManager.StateGroup(...);
				// ==> instantiates a new StateGroup
				// ==> returns a function
				
				vm.states()
				// ==> returns the StateGroup object
				// ==> gives access to the prototype e.g. vm.states().getAll(...)
				
				vm.states('stateName');
				// ==> returns the state with the specified name
			*/
			return function(stateName) {
				if(!!stateName) {
					return this.states.filter(function(state) {
						return state.$name === stateName;
					})[0];	
				} else {
					return this;
				}
			}.bind(this);
		}
		
		function State(config) {
			this.$name = config.name;
			this.$start = config.start || null;
			this.$stop = config.stop || null;
			this.$done = config.done || null;
			// pass by reference is magic
			this.$subject = config.subject || {};
			this.$active = false;
			this.$model = '';
			this.$exclusiveOf = [];
			this.$auxillary = config.auxillary || {};
			this.$scope = {};
		}
		
		function getAll() {
			/*jshint validthis: true */
			return this.states;	
		}
		
		function config(_config_) {
			/*jshint validthis: true */
			/*
				pass in something like this:
				
				return {
					scope: someScopeObject,
					exclusive: {
						group: ['state1','state2','state3'],
						group: ['state4','stat5']
						// ...
					}
				}
			*/
			var config, countOfArrays = 0, type;
			
			if(!!_config_ && _config_.constructor === Function) {
				config = _config_();
				if('scope' in config) {
					scope.call(this, config.scope);	
				}
				
				if('exclusive' in config) {
					if(config.exclusive.constructor === Array) {
						// [[],[]] or []
						angular.forEach(config.exclusive,function(obj) {
							if(obj.constructor === Array) {
								type = 'array';
								countOfArrays++;	
							} else if(typeof obj === 'string') {
								type = 'string';	
							}
						}.bind(this));
						
						// if [[],[]], and all are arrays
						if(countOfArrays === config.exclusive.length && type === 'array') {
							angular.forEach(config.exclusive,function(arrayOfStateNames) {
								exclusive.apply(this,arrayOfStateNames);
							}.bind(this));
							
							// if ['stateName','stateName']
						} else if(type === 'string') {
							exclusive.apply(this,config.exclusive);
						}
					}
				}
			}
			
			///////////
			
			function scope(scope) {
				/*jshint validthis: true */
				if(!!scope) {
					this.$scope = scope;
					angular.forEach(this.states,function(state) {
						state.$scope = scope;
					});
				} else {
					return this.$scope;	
				}
			}	
			
			function exclusive() {
				// try to make this cleaner
				var stateNames = Array.prototype.slice.call(arguments);	

				// e.g. stateNames === ['addingComments','editingDescription','assigning']
				angular.forEach(stateNames, function(name) {

					// get the currently looped State
					// e.g. 'addingComments'
					var current = this.states.filter(function(state) {
						return state.$name === name;
					})[0];

					// create a new array of names that doesn't contain the currently looped State's name
					// e.g. ['editingDescription','assigning']
					var exclusiveOf = stateNames.filter(function(stateName) {
						return stateName !== current.$name;
					});

					// in the currently looped State's $exclusiveOf array,
					// push all the other State objects
					// e.g. $exclusiveOf === [State, State]
					angular.forEach(exclusiveOf, function(stateName) {
						current.$exclusiveOf.push(this.states.filter(function(state) {
							return state.$name === stateName;
						})[0]);
					}.bind(this));

				}.bind(this));
			}
		}
		
		function models() {
			/*jshint validthis: true */
			// useful for debugging to see all of the current models being used in the group
			var models = [];
			
			angular.forEach(this.states,function(state) {
				models.push(state.$model);
			});
			
			return models;
		}
		
		function stateGet(prop) {
			/*jshint validthis: true */
			if(prop in this) return this[prop];
		}
		
		function start(_config_) {
			/*jshint validthis: true */
			var config = {}, subject = {}, model = {};
			if(!!_config_) {
				config = _config_;
				
				if('subject' in config) {
					subject = config.subject;	
				}
				
				if('model' in config) {
					model = config.model;	
				}
			}
			
			if(this.isActive()) {
				this.model({});
				this.stop();
			}
			
			var resolvedModel = null;
			this.$active = true;
			// pass by reference!
			this.$subject = subject;
			// initialize the model to contain the string version of the model
			// e.g. vm.models.descriptionOfItemBeingEdited
			this.$model = model;

			if(model.constructor !== Object && typeof model === 'string') {
				resolvedModel = utils.getStringModelToModel(this, this.$scope, model);
			}
									
			angular.forEach(this.$exclusiveOf,function(state) {
				if(state.isActive()) {
					state.stop();
				}
			}.bind(this));
			
			if(this.$start !== null) {
				return this.$start(this.$subject,resolvedModel);
			}
		}
		
		function stop(keepCurrentSubject) {
			/*jshint validthis: true */
			this.$active = false;
			this.$subject = !!keepCurrentSubject ? this.$subject : {};
			
			// reset the model
			//if(this.model().constructor !== Object && typeof this.model() === 'string') {
			this.$model = '';
			//}
			
			if(this.$stop !== null) {
				return this.$stop();
			}
		}
		
		function done(keepCurrentSubject) {
			/*jshint validthis: true */
			// need to re-resolve the model to see the updates from the scope
			var resolvedModel = utils.getStringModelToModel(this, this.$scope, this.$model);
			if(this.$done !== null) {
				this.$done(this.$subject,resolvedModel);
			}
			
			// this *has* to be called second, since it can reset the subject
			// if keepCurrentSubject is not passed in
			this.stop(keepCurrentSubject);
			
			return this;
		}
		
		function subject(val) {
			/*jshint validthis: true */
			if(!!val) {
				this.$subject = val;	
			} else if (!val) {
				return this.$subject;	
			}
		}
		
		function model(val) {
			/*jshint validthis: true */
			var resolvedModel;
			
			if(!!val || val === '') {
				if(typeof this.$model === 'string' && Object.keys(this.$scope).length > 0) {
					utils.setStringModelToModel(this.$scope, this.$model, val);
					return true;
				} else if (!val) {
					return false;	
				}			
			} else {
				return this.$model;
			}
		}
		
		function isActive() {
			/*jshint validthis: true */
			return this.$active;	
		}
		
		function and() {
			/*jshint validthis: true */
			/*
				usage:
				
				NOTE: must pass in 'true' to .done() if using $subject in
				the declaration of the auxillary function
				
				vm.states.get('editing').done(true).and('remove', 'sayHi');
				... .and({remove: 'param'});
				... .and({remove: ['param1','param2']}, 'sayHi');
				... .and({remove: 'param'}, {sayHi: 'param'});
			*/
			
			angular.forEach(arguments, function(arg) {
				if(arg.constructor !== Object) {
					if(arg in this.$auxillary) {
						this.$auxillary[arg].call(this,this.$subject);	
					}
				} else if (arg.constructor === Object) {
					for(var fn in arg) {
						if(arg[fn].constructor !== Array) {
							// force it to become an array
							arg[fn] = [arg[fn]];
						}
						// add subject as first param
						arg[fn].unshift(this.$subject);
						
						// call the auxillary function with subject and any additional params
						this.$auxillary[fn].apply(this,arg[fn]);	
					}
				}
			}.bind(this));
		}
		
		function getStringModelToModel(thisArg, scope, string) {
			var m = false, keys;
			
			if(typeof string === 'string') {
				keys = string.split('.');
				// remove ControllerAs prefix, because we don't need it
				// the user still uses it though in the string declaration, because it creates a namespace
				keys.shift();

				angular.forEach(keys,function(key) {
					if(!!m) {
						m = m[key];	
					} else {
						m = scope[key];	
					}
				}.bind(thisArg));
			}
			
			//m will end up being undefined, false, or an object
			//if it is undefined or false, keep it false
			//otherwise, return m
			return !!m ? m : false;	
		}
		
		function setStringModelToModel(scope, string, val) {
			var m = scope, keys, prevObject;
			
			if(typeof string === 'string') {
				keys = string.split('.');
				// remove ControllerAs prefix, because we don't need it
				// the user still uses it though in the string declaration, because it creates a namespace
				keys.shift();

				for(var i = 0; i<keys.length; i++) {
					if(i === 0) {
						m[keys[0]] = {};
						prevObject = m[keys[0]];
					}
					
					if(i > 0 && i < keys.length - 1) {
						prevObject[keys[i]] = {};
						prevObject = prevObject[keys[i]];
					}
					
					if(i === keys.length - 1) {
						prevObject[keys[i]] = val;
					}
				}
			}
		}
	}
})(angular);