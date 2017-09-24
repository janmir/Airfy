load('api_config.js');
load('api_rpc.js');
load('api_wifi.js');
load('api_timer.js');

Timer.set(1000, true, function() {
  print('Hello', ' ', 'World!');
}, null);