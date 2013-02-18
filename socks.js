/*
	AUTHOR: byhgj
	
	var socks = require('./socks.js');
	socks({
		host:x.x.x.x,
		port:1080,
		username:'admin',
		password:'123',
		targethost:x.x.x.x,
		targetport:23,
		callback:function(socket){
		}
	});
*/

var net=require('net');
const __DEBUG__=false;
function log(args){
	if (!__DEBUG__) return;
	console.log(args);
}
const
	SOCKS_VERSION = 5,
    AUTHENTICATION = {
        NOAUTH: 0x00,
        GSSAPI: 0x01,
        USERPASS: 0x02,
        NONE: 0xFF
    },
    REQUEST_CMD = {
        CONNECT: 0x01,
        BIND: 0x02,
        UDP_ASSOCIATE: 0x03
    },
    ATYP = {
        IP_V4: 0x01,
        DNS: 0x03,
        IP_V6: 0x04
    };

function socks(options){	
	var opts = options || {};
	var socket = new net.Socket();
	socket.connect(opts.port, opts.host, function() {
		console.log('CONNECTED TO: ' + opts.host + ':' + opts.port + ' by socks');
		socket.write(new Buffer([SOCKS_VERSION,2,AUTHENTICATION.NOAUTH,AUTHENTICATION.USERPASS]));
	});
	socket.on('data', Handshake_stage);
	socket.on('close', function() {
		//console.log('Connection closed with socks');
	});
	function Handshake_stage(chunk){
		socket.removeListener('data', Handshake_stage);
		if (chunk[0] != SOCKS_VERSION) {
			errorLog('handshake: wrong socks version: %d', chunk[0]);
			socket.end();
		}
		switch(chunk[1]){
			case AUTHENTICATION.NOAUTH:
				start_Connection();
				break;
			case AUTHENTICATION.USERPASS:
				sendAuth(opts.username,opts.password);
				socket.on('data',Authentication_stage);
				break;
			case AUTHENTICATION.NONE:
				socket.end();
				console.log('disconnected by server.');
				break;
			default:
				socket.end();
		}
	}
	function Authentication_stage(chunk){
		socket.removeListener('data', Authentication_stage);
		if (chunk[0] != 1) {
			errorLog('authentication: wrong authid: %d', chunk[0]);
			socket.end();
		}
		switch(chunk[1]){
			case 0:
				start_Connection();
				break;
			case 1:
				socket.end();
				console.log('SOCKS username/password incorrect');
				break;
			default:
				socket.end();
		}
	}
	function start_Connection(){
		var ipv4 = opts.targethost.split('.');
		socket.write(new Buffer([SOCKS_VERSION,REQUEST_CMD.CONNECT,0,ATYP.IP_V4,parseInt(ipv4[0]),parseInt(ipv4[1]),parseInt(ipv4[2]),parseInt(ipv4[3]),opts.targetport >> 8,opts.targetport & 0xff]));
		socket.on('data',Connection_phase);
		console.log('connecting to ' + opts.targethost + ':' + opts.targetport);
	}
	function Connection_phase(chunk){
		socket.removeListener('data', Connection_phase);
		if (chunk[0] == SOCKS_VERSION && chunk[1] == 0) {
			if (typeof opts.callback == 'function')
				opts.callback(socket);
		} else
			socket.end();
	}
	function sendAuth(username,password){
		var buf=new Buffer(username.length+password.length+3);
		new Buffer([1,username.length]).copy(buf);
		new Buffer(username).copy(buf,2);
		buf[username.length+2]=password.length;
		new Buffer(password).copy(buf,username.length+3);
		socket.write(buf);
	}
}
exports = module.exports = socks;
