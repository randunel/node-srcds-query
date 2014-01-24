var dgram = require('dgram');
var packet = require('srcds-packet');
var EventEmitter = require('events').EventEmitter;

module.exports = Query;

function Query(options) {
    var self = this;
    this.client = dgram.createSocket('udp4');
    this.queues = {
        challenge: [],
        callback: []
    };

    this.client.on('error', function(err) {
        self.emit('error', err);
    });

    this.client.on('message', this.handleMessage.bind(this));

    if(options.port) {
        this.client.bind(options.port, options.ip, function() {
            self.emit('ready');
        });
        return;
    }
    setImmediate(this.emit.bind(this, 'ready'));
}

Query.prototype.__proto__ = EventEmitter.prototype;

Query.prototype.query = function(options, cb) {
    var item = Query[options.query] || options.query;

    var payload = new Buffer(4 + (item.body !== null ? item.body.length || 4 : 0));
    payload.writeInt32LE(item.header, 0);
    if(typeof(item.body) !== 'null') {
        item.body.length ? payload.write(item.body, 4, item.body.length, 'ascii') : payload.writeInt32LE(item.body, 4);
    }

    this.run(options.server, packet.buildRequest(payload), item, cb);
};

Query.prototype.run = function(address, request, item, lastPhase, cb) {
    var self = this;
    if(typeof(lastPhase) === 'function') {
        cb = lastPhase;
        lastPhase = false;
    }
    this.client.send(request.buffer, 0, request.buffer.length, Number(address.split(':')[1]) || 27015, address.split(':')[0], function(err) {
        if(err) {
            return cb(err);
        }
        // TODO: find a way to preserve the order for concurrent requests
        // TODO: set timeout
        item.challenge && !lastPhase ? self.queues.challenge.push( {
            item: item,
            address: address,
            cb: cb
        }) : self.queues.callback.push( {
            item: item,
            cb: cb
        });
    });
};

Query.prototype.handleMessage = function(buffer) {
    var response = packet.decodeResponse(buffer);
    var header = response.payload.readInt8(0);

    var todo;
    if(header === Query.CHALLENGE_GENERIC) {
        todo = this.queues.challenge.shift();
        var request = new Buffer(response.payload.length);
        request.writeInt8(todo.item.header, 0);
        response.payload.copy(request, 1, 1, response.payload.length);
        this.run(todo.address, packet.buildRequest(request), todo.item, true, todo.cb);
        return;
    }
    todo = this.queues.callback.shift();
    todo.parse ? todo.parse(response, todo.cb) : todo.cb(null, response);
};

var CHALLENGE_GENERIC = Query.CHALLENGE_GENERIC = 0x41; // A

Query.A2S_INFO = { // Does not require a challenge
    header: 0x54, // T
    body: 'Source Engine Query'
};

Query.A2S_PLAYER = {
    header: 0x55, // U
    body: -1,
    challenge: CHALLENGE_GENERIC,
    parse: parsePlayer
};

Query.A2S_RULES = {
    header: 0x56, // V
    body: -1,
    challenge: CHALLENGE_GENERIC
};

Query.A2A_PING = { // deprecated
    header: 0x69, // i
    body: null
};

Query.A2S_SERVERQUERY_GETCHALLENGE = {
    header: 0x57, // W
    body: null,
    challenge: CHALLENGE_GENERIC
};

function parsePlayer(buffer, cb) {
    console.log('parsing player', buffer);
    cb(null, buffer);
}

