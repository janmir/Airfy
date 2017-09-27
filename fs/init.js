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
load('api_aws.js');

let led01 = Cfg.get('config.blinky02');
let led02 = Cfg.get('config.blinky02');
let led03 = Cfg.get('config.blinky02');
let w01 = Cfg.get('config.initWait01') * 1000;
let w02 = Cfg.get('config.initWait02') * 1000;
let w03 = Cfg.get('config.initWait03') * 1000;

let device_id = Cfg.get('device.id');

let cLed = led01;
let initWait = w01;
let blinkWait = Cfg.get('config.blinkWait');
let blinkCount = 0;
let blinkCMax = 0;

let status = 0; //if wifi initialization done and is connected
let isConnected = false;
let isMQTTReady = false;

let sysInfo = null;

//MQTT
let pTopic = Cfg.get('config.mqttPubTopic');
let sTopic = Cfg.get('config.mqttSubTopic');

//Timers
let tCheck = 0;
let tBlink = 0;
let tMainLoop = 0;

//Set GPIO to output
//GPIO.set_mode(led01, GPIO.MODE_OUTPUT);
GPIO.set_mode(led02, GPIO.MODE_OUTPUT);
//GPIO.set_mode(led03, GPIO.MODE_OUTPUT);


/***********************************************************/
/*                                                         */
/*                                                         */
/*                    ~~~Functions~~~                      */
/*                                                         */
/*                                                         */
/***********************************************************/

function getInfo() {
    return JSON.stringify({
        total_ram: Sys.total_ram(),
        free_ram: Sys.free_ram()
    });
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

function startClock(wait, fn){
    return Timer.set(wait, true, fn, null);
}

function startBlink(led, count){
    cLed = led;
    blinkCMax = count;

    //While waiting blink * * *
    tBlink = startClock(blinkWait, function(){
        //call connection check
        GPIO.toggle(cLed);

        //let value = GPIO.toggle(cLed);
        //print('---',value ? 'Tick' : 'Tock', 'uptime:', Sys.uptime(), getInfo());

        blinkCount++;
        if(blinkCMax > 0 && blinkCount >= blinkCMax){
            Timer.del(tBlink);
        }
    });
}

function initProcess(){
    print('---Initialization Process---');                

    //Wait for 10 seconds to connect
    //10 seconds after still not connected wait for 15s
    //15 seconds after still not connected enable AP wait for 60s
    if(status === 0){
        //Connection check
        print('---Connection Check---');                
        
        RPC.call(RPC.LOCAL, 'Sys.GetInfo', {}, function (res, ud) {
    
            print('Response:', JSON.stringify(res));            
            sysInfo = res;
    
            if(sysInfo.wifi.status === "disconnected"){
    
                print('---Unable to connect device.');
                if(initWait === w01){
                    initWait = w02;
                }else if(initWait === w02){
                    //Check if already enabled
                    RPC.call(RPC.LOCAL, 'Config.Get', {"key": "wifi.ap.enable"}, function (res, ud) {
                        if(res !== true){
                            print('---Access Point Not Enabled Yet.');            
                            
                            //Enable AP
                            enableAccessPoint();
                        }else{
                            print('---Access Point Already Enabled, waiting for user input.');
                            
                            //Check AP SSID
                        }
                    }, null);
                    initWait = w03;
                }else if(initWait === w03){
                    //Do something after a 1-minute wait
                }
    
                print('---Increasing wait time to', initWait);
    
                //Connected stop checking
                Timer.del(tCheck);            
    
                //Restart Checking
                tCheck = startClock(initWait, initProcess);
    
            }else if (isConnected && sysInfo.wifi.status === "got ip"){
                print('---Device connected to', sysInfo.wifi.ssid, '---');
                
                //Disable the Access Point should be done by web interface
    
                print('---Stopping timers & setting blink to default---');        
                                                
                //Start blink led 2 for nex stage
                Timer.del(tBlink);
                startBlink(led02, -1);          
                
                //set to default
                GPIO.write(led01, 0);

                //Connected stop checking
                Timer.del(tCheck);            

                //Add status
                status++;

                print('---MQTT establishing subcription---');                                
                //Start subscription
                mqttSubscribe();

                //Start a MQTT check
                tCheck = startClock(30000, initProcess);
            }else{
                print('---Device Loading...---');
            }
        }, null);
    }else if(status === 1){
        //MQTT Check
        print('---MQTT Check---');                
        
        if(isMQTTReady){
            print('---MQTT Connection established---');                

            //Start blink led 2 for nex stage
            Timer.del(tBlink);
            startBlink(led03, -1);

            //set to default
            GPIO.write(led02, 0);

            //Connected stop checking
            Timer.del(tCheck);  

            //Add status
            status++;

            //Start a device shadow check
            tCheck = startClock(5000, initProcess);
        }else{
            print('---Device Loading...---');
        }
    }else if(status === 2){
        //Device Shadow update & subscription
        print('---Device Shadow Update---');                        

        //Start blink led 2 for nex stage
        Timer.del(tBlink);

        //set to default
        GPIO.write(led03, 0);

        //Connected stop checking
        Timer.del(tCheck);

        //Shadow Set
        status++;

        //Delayed turn off all led
        Timer.set(2000, false, function(){
            GPIO.write(led01, 1); //should be led01
            GPIO.write(led02, 1); //should be led02
            GPIO.write(led03, 1); //should be led03
        }, null);

        if(status === 3){
            print('---Starting Main loop---');
            
            //Start main loop
            //*******************************/
            tMainLoop = startClock(60000 * 5, loopMain);
            //*******************************/
        }
    }
    
}

function loopMain(){
    //Things to do here
    
    let message = JSON.stringify({
        "device_id": device_id,
        "status": status,
        free_ram: (Sys.free_ram() / Sys.total_ram()) * 100
    });

    let ok = MQTT.pub(pTopic, message, 1);
    print('---MQTT Publish Results: ', ok, '---');
}

function mqttSubscribe(){
    // Subscribe to the topic to ring the bell
    MQTT.sub(sTopic, function(conn, topic, msg) {
        print('---MQTT Message Recieved---');
        print('---Topic:', topic, ', Message:', msg, '---');
        
        /*let obj = JSON.parse(msg);

        if(obj.number === bellNumber || obj.number === 0){ //use bell #0 to ring all the bells
        print('ok');
        GPIO.write(relayPin, 1);
        Sys.usleep(20000); //wait for 20msec
        GPIO.write(relayPin, 0);
        Sys.usleep(200000); //wait for 200msec
        GPIO.write(relayPin, 1);
        Sys.usleep(20000); //wait for 20msec
        GPIO.write(relayPin, 0);
        }*/
    }, null);
}

/***********************************************************/
/*                                                         */
/*                                                         */
/*                      ~~~Main~~~                         */
/*                                                         */
/*                                                         */
/***********************************************************/

print('---Onload', getInfo(), '---');

//Start blinking
startBlink(led02, -1); //should be led01

//Start initialization/checks
tCheck = startClock(initWait, initProcess);

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

      //Re-init the connection info
      RPC.call(RPC.LOCAL, 'Sys.GetInfo', null, function (res, ud) {
        sysInfo = res;        
      }, null);
    }
    print('---Network event:', evs, '---');
  }, null);

  //Monitor MQTT Connection
MQTT.setEventHandler(function(conn, ev, edata) {
    let msg = "";

    if (ev === MQTT.EV_CONNACK) {            //202, Connection to broker has been established.
        msg = "Connection to broker has been established.";
        isMQTTReady = true;
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
        isMQTTReady = false;
    }

    if(msg.length > 0){
        print('---MQTT Event: ', msg, '---');
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