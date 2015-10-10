// Generated by CoffeeScript 1.10.0
(function() {
  var EventEmitter, Max4Node, Promise, osc, promiseMessage, udp;

  osc = require('osc-min');

  udp = require('dgram');

  EventEmitter = require('events').EventEmitter;

  Promise = require('bluebird');

  Max4Node = (function() {
    function Max4Node() {
      this.read = null;
      this.write = null;
      this.ports = {};
      this.emitters = {};
    }

    Max4Node.prototype.bind = function(ports) {
      if (ports == null) {
        ports = {};
      }
      ports.send || (ports.send = 9000);
      ports.receive || (ports.receive = 9001);
      this.ports = ports;
      this.read = this.create_input_socket(ports.receive);
      return this.write = udp.createSocket('udp4');
    };

    Max4Node.prototype.create_input_socket = function(port) {
      var socket;
      socket = udp.createSocket('udp4');
      socket.bind(port);
      socket.on('message', (function(_this) {
        return function(msg, rinfo) {
          var err, error, obj;
          obj = _this.parse_message(msg);
          if (obj.is_get_reply || obj.is_observer_reply) {
            try {
              _this.emitters[obj.callback].emit('value', obj.value);
            } catch (error) {
              err = error;
            }
          }
          if (obj.is_get_reply) {
            return delete _this.emitters[obj.callback];
          }
        };
      })(this));
      return socket;
    };

    Max4Node.prototype.parse_message = function(msg) {
      var args, obj;
      obj = osc.fromBuffer(msg);
      args = obj.args.map(function(item) {
        return item.value;
      });
      switch (obj.address) {
        case '/_get_reply':
          obj.is_get_reply = true;
          obj.callback = args[0];
          obj.value = args[1];
          break;
        case '/_observer_reply':
          obj.is_observer_reply = true;
          obj.callback = args[0];
          obj.value = args[2];
      }
      return obj;
    };

    Max4Node.prototype.send_message = function(address, args) {
      var buf;
      buf = osc.toBuffer({
        address: '/' + address,
        args: args
      });
      return this.write.send(buf, 0, buf.length, this.ports.send, 'localhost');
    };

    Max4Node.prototype.observer_emitter = function(msg, action) {
      var args, callback, emitter;
      if (action == null) {
        action = 'observe';
      }
      emitter = new EventEmitter();
      callback = this.callbackHash();
      this.emitters[callback] = emitter;
      args = [msg.path, msg.property, callback];
      this.send_message(action, args);
      return emitter;
    };

    Max4Node.prototype.callbackHash = function() {
      return (new Date()).getTime().toString() + Math.random().toString();
    };

    Max4Node.prototype.get = function(msg) {
      return this.observer_emitter(msg, 'get');
    };

    Max4Node.prototype.set = function(msg) {
      var args;
      args = [msg.path, msg.property, msg.value];
      return this.send_message('set', args);
    };

    Max4Node.prototype.call = function(msg) {
      var args;
      args = msg.hasOwnProperty('params') ? [msg.path, msg.method, msg.params] : [msg.path, msg.method];
      return this.send_message('call', args);
    };

    Max4Node.prototype.observe = function(msg) {
      return this.observer_emitter(msg, 'observe');
    };

    Max4Node.prototype.count = function(msg) {
      return this.observer_emitter(msg, 'count');
    };

    Max4Node.prototype.promise = function() {
      if (this.promisedFn) {
        return this.promisedFn;
      }
      return this.promisedFn = {
        get: promiseMessage.bind(this, 'get'),
        count: promiseMessage.bind(this, 'count')
      };
    };

    return Max4Node;

  })();

  promiseMessage = function(method, msg) {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        var emitter;
        emitter = _this[method](msg);
        return emitter.on('value', resolve);
      };
    })(this));
  };

  module.exports = Max4Node;

}).call(this);
