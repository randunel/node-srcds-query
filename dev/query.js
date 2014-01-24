var Query = require('../index.js');
var server = '192.168.0.14:27015';

var query = new Query( {
    port: 27016,
    ip: '192.168.0.14'
});

query.on('ready', function() {
    query.query( {
        server: '192.168.0.14:27015',
        query: 'A2S_PLAYER'
    }, function(err, res) {
        console.log(err, res);
        console.log(res.payload.length);
        process.exit(0);
    });
});

