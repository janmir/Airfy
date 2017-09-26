load('api_config.js');
load('api_rpc.js');
load('api_wifi.js');
load('api_timer.js');
load('api_esp8266.js');
load('api_http.js');
load('api_gpio.js');
load('api_sys.js');
load('api_net.js');
load('api_mqtt.js');

let led_1 = Cfg.get('config.blinky01');
let led_2 = Cfg.get('config.blinky02');
let led_3 = Cfg.get('config.blinky03');
let initWait = Cfg.get('config.initWait') * 1000;
let blinkWait = Cfg.get('config.blinkWait');
let status = 0; //if wifi initialization done and is connected
let isConnected = false;
let sysInfo = null;

//MQTT
let topic = Cfg.get('config.mqttTopic');

//Timers
let tCheck = 0;
let tBlink = 0;

function getInfo() {
    return JSON.stringify({
        total_ram: Sys.total_ram(),
        free_ram: Sys.free_ram()
    });
}

function setDefaultAP(){
    print('---Manually Setting Default Access Point Settings.'); 
}

function enableAccessPoint(){
    print('---Manually Enabling Access Point.');            

    //Not connected enable AP
    RPC.call(RPC.LOCAL, 'Config.Set', {"config": {"wifi": {"ap": {"enable":true}}}}, function (res, ud) {

        RPC.call(RPC.LOCAL, 'Config.Save', {"reboot":true}, function (res, ud) {
            print('---Enable AP done.');  
        }, null);

    }, null);
}

function startConnectionBlink(){
    //Set GPIO to output
    GPIO.set_mode(led_2, GPIO.MODE_OUTPUT);

    //While waiting blink * * *
    tBlink =  Timer.set(blinkWait, true, function(){
        //call connection check
        let value = GPIO.toggle(led_2);
        print('---',value ? 'Tick' : 'Tock', 'uptime:', Sys.uptime(), getInfo());
    }, null);
}

print('---Onload---');
print('---Info', getInfo(), '---');

//Start blinking
startConnectionBlink();

//Wait 20 secs for connection
tCheck = Timer.set(initWait, false, function(){
    print('---Initialization---');                

    let message = getInfo();
    let ok = MQTT.pub(topic, message, 1);
    
    //call connection check
    RPC.call(RPC.LOCAL, 'Sys.GetInfo', null, function (res, ud) {

        //print('Response:', JSON.stringify(res));            
        sysInfo = res;

        if(sysInfo.wifi.status === "disconnected"){

            print('---Unable to connect device.');            
            //Check if already enabled
            RPC.call(RPC.LOCAL, 'Config.Get', {"key": "wifi.ap.enable"}, function (res, ud) {
                print('---Is Enabled: ', res);
                if(res !== true){
                    print('---Not Enabled Yet.');            
                    
                    //Enable AP
                    enableAccessPoint();
                }else{
                    print('---Already Enabled, waiting for user input.');            
                }
            }, null);
            
            isConnected = false;
            status = 0;

        }else if (sysInfo.wifi.status === "got ip"){
            print('---Device already connected---');     

            isConnected = true;
            status++;
        }else{
            print('---Device Loading...---');     
        }

        print('---Stopping timers & setting blink to default---');        

        //Connected stop blinking
        Timer.del(tBlink);

        //set to default
        GPIO.write(led_2, 0);
    }, null);

    //Delete timer
    Timer.del(tCheck); 
    
}, null);

// Monitor network connectivity.
Net.setStatusEventHandler(function(ev, arg) {
    let evs = "";

    if (ev === Net.STATUS_DISCONNECTED) {
      evs = 'DISCONNECTED';
      isConnected = false;
    } else if (ev === Net.STATUS_CONNECTING) {
      evs = 'CONNECTING';
      isConnected = false;
    } else if (ev === Net.STATUS_CONNECTED) {
      evs = 'CONNECTED';
      isConnected = false;
    } else if (ev === Net.STATUS_GOT_IP) {
      evs = 'GOT_IP';
      isConnected = true;
      status++;

      //Re-init the connection info
      RPC.call(RPC.LOCAL, 'Sys.GetInfo', null, function (res, ud) {
        sysInfo = res;        
      }, null);
    }
    print('--- Network event:', evs, '---');
  }, null);

MQTT.setEventHandler(function(conn, ev, edata) {
    let msg = "";

    if (ev === MQTT.EV_CONNACK) {            //202, Connection to broker has been established.
        msg = "Connection to broker has been established.";
        status++;
    } else if (ev === MQTT.EV_PUBLISH) {     //203, A message has been published to one of the topics we are subscribed to.
        msg = "A message has been published to one of the topics we are subscribed to.";
    } else if (ev === MQTT.EV_PUBACK) {      //204, Ack for publishing of a message with QoS > 0.
        msg = "Ack for publishing of a message with QoS > 0.";
    } else if (ev === MQTT.EV_SUBACK) {      //209, Ack for a subscribe request.
        msg = "Ack for a subscribe request.";
    } else if (ev === MQTT.EV_UNSUBACK) {    //211, Ack for an unsubscribe request.
        msg = "Ack for an unsubscribe request.";
    } else if (ev === MQTT.EV_CLOSE) {       //5,   Connection to broker was closed.
        msg = "Connection to broker was closed.";
    }

    if(msg.length > 0){
        print('--- MQTT Event: ', msg, '---');
    }
}, null);

//For Handling Front-end
RPC.addHandler('Wifi.Connected', function(args) {
    return {
        "status": status,
        "connected" : isConnected,
        "ssid": sysInfo ? sysInfo.wifi.ssid : "",
        "ip": sysInfo ? sysInfo.wifi.sta_ip : ""
    };
});

/*HTTP.query({
    url: "https://api.janmir.me/aws-odtr-v2/check?username=jp.miranda&password=awsol%2B123",
    //url: "https://janmir.me",
    success: function(body, msg){
        print('---Body:', body);
        //print('---Msg:', msg);
    },
    error: function(error){
        print('---Error:', error);
    }
});*/