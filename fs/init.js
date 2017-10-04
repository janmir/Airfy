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
load('api_ds3231.js');

let led01 = Cfg.get('config.blinky02');
let led02 = Cfg.get('config.blinky02');
let led03 = Cfg.get('config.blinky02');
let w01 = Cfg.get('config.initWait01') * 1000;
let w02 = Cfg.get('config.initWait02') * 1000;
let w03 = Cfg.get('config.initWait03') * 1000;

let device_id = Cfg.get('device.id');

let cLed = led01;
let initWait = w01;
let blinkRate = Cfg.get('config.blinkRate');
let blinkCount = 0;
let blinkCMax = 0;

let status = 0;
let isConnected = false;
let isMQTTReady = false;
let hasUpdates = false;
let currSchedIndex = 0;

let sysInfo = null;

//MQTT
let pTopic = Cfg.get('config.mqttPubTopic');
let sTopic = Cfg.get('config.mqttSubTopic');

//Timers
let tCheck = 0;
let tBlink = 0;
let tMainLoop = 0;

//I2C
let DS3231_I2C_addresss = 104;
let rtc = DS3231.create(DS3231_I2C_addresss);

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

function setDate(d, m, y) {
	rtc.setTimeDate(d);
	rtc.setTimeMonth(m);
	rtc.setTimeYear(y);
}

function setTime(h, m, s) {
	rtc.setTimeSeconds(s);
	rtc.setTimeMinutes(m);
	rtc.setTimeHours(h);
}

function getDate() {
	return  JSON.stringify(rtc.getTimeMonth()) + "/" + 
            JSON.stringify(rtc.getTimeDate()) + "/" + 
            JSON.stringify(rtc.getTimeYear());
}

function getTime() {
	return  JSON.stringify(rtc.getTimeHours()) + ":" + 
            JSON.stringify(rtc.getTimeMinutes()) + ":" + 
            JSON.stringify(rtc.getTimeSeconds());
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
    tBlink = startClock(blinkRate, function(){
        //call connection check
        GPIO.toggle(cLed);

        //let value = GPIO.toggle(cLed);
        //print('---',value ? 'Tick' : 'Tock', 'uptime:', Sys.uptime(), getInfo());

        blinkCount++;
        if(blinkCMax > 0 && blinkCount >= blinkCMax){
            Timer.del(tBlink);
            GPIO.write(cLed, 0);
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
            
        if(!isConnected){
            print('---Unable to connect device.');

            if(initWait === w01){
                initWait = w02;
            }else if(initWait === w02){
                //Check if already enabled
                if(Cfg.get('wifi.ap.enable') !== true){
                    print('---Access Point Not Enabled Yet.');            
                    
                    //Enable AP
                    enableAccessPoint();
                }else{
                    print('---Access Point Already Enabled, waiting for user input.');
                    
                    //Check AP SSID
                }

                initWait = w03;
            }else if(initWait === w03){
                //Do something after the last minute wait

                //Start!
                start();
            }

            print('---Increasing wait time to', initWait);

            //Connected stop checking
            Timer.del(tCheck);            

            //Restart Checking
            tCheck = startClock(initWait, initProcess);

        }else{
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
        }
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
        tCheck = 0;

        //Shadow Set
        status++;

        //Delayed turn off all led
        Timer.set(2000, false, function(){
            GPIO.write(led01, 1); //should be led01
            GPIO.write(led02, 1); //should be led02
            GPIO.write(led03, 1); //should be led03
        }, null);

        //Start a device shadow check
        initProcess();

    }else if(status === 3){
            //Start!
            start();
    }
}

function start(){

    print('---Requesting schedule update---');
    /****Request schedule update****/
    /*******************************/

    print('---Loading todays schedules---');

    /*****Load todays schedule******/
    currSchedIndex = 0;
    /*******************************/

    print('---Starting Main loop---');

    /*******Start main loop*******/
    tMainLoop = startClock(60000 * 1, loopMain);
    /*****************************/
}

function loopMain(){
    //Things to do here
    
    let message = JSON.stringify({
        "device_id": device_id,
        "status": status,
        "timestamp": getDate() + " " + getTime(),
        free_ram: (Sys.free_ram() / Sys.total_ram()) * 100
    });

    let ok = MQTT.pub(pTopic, message, 1);
    print('---MQTT Publish Results: ', ok, '---');

    //Check the time RTP

    //Use current index for schedule to shorten search time
    let index = currSchedIndex++;

    //Fetch new data if available
    if(hasUpdates){
        //Get todays data

        hasUpdates = false;
    }

    //Check schedule if reamaining time < 1min
    
}

function mqttSubscribe(){
    // Subscribe to the topic to ring the bell
    MQTT.sub(sTopic, function(conn, topic, msg) {
        print('---MQTT Message Recieved---');
        print('---Topic:', topic, ', Message:', msg, '---');
        
        //Blink all lights 5 times
        startBlink(led02, 5);

        let obj = JSON.parse(msg);
        if(obj.type){
            if(obj.type === "ntp"){
                //Contains date and time
                //To be saved to RTP module
            }else if(obj.type === "sched"){
                //Contains the ff:
                //  Schedule Array:
                //      - date: (mon ~ sun) 
                //        - time: (time to execute the thingy)
                //          switch: (either on or off)
                //          data: (data is custom formated ir pulses)
                //        - time: (time to execute the thingy)
                //          switch: (either on or off)
                //          ir: (data is custom formated ir pulses)
                //      - date: (mon ~ sun) 
                //        - time: (time to execute the thingy)
                //          switch: (either on or off)
                //          ir: (data is custom formated ir pulses)
                //        - time: (time to execute the thingy)
                //          switch: (either on or off)
                //          ir: (data is custom formated ir pulses)

                //Set flag
                hasUpdates = true;
                currSchedIndex = 0;
            }else{
                //Other special data
            }
        }else{
            print('---MQTT Message Invalid---');
        }

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
//tCheck = startClock(initWait, initProcess);

// Monitor network connectivity.
Net.setStatusEventHandler(function(ev, arg) {
    let evs = "";
    isConnected = false;
    
    if (ev === Net.STATUS_DISCONNECTED) {
        evs = 'DISCONNECTED';
        status = 0;

        if(tCheck === 0){
            initWait = w01;
            tCheck = startClock(initWait, initProcess);
        }

    } else if (ev === Net.STATUS_CONNECTING) {
        evs = 'CONNECTING';
    } else if (ev === Net.STATUS_CONNECTED) {
        evs = 'CONNECTED';
    
        //Start initialization/checks
        if(tCheck === 0){
            initWait = w02;
            tCheck = startClock(initWait, initProcess);
        }

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

//For setting time
RPC.addHandler('RTC.SetTime', function(args) {
    let time = "";

    //Set time
    setTime(args.h, args.m, args.s);
    
    time =  getTime();
    return {"time": time};
});

//For setting date
RPC.addHandler('RTC.SetDate', function(args) {
    let date = "";

    //Set time
    setDate(args.d, args.m, args.y);
    
    date =  getDate();
    return {"date": date};
});

//For getting time
RPC.addHandler('RTC.GetTime', function(args) {
    let time =  getTime();
    return {"time": time};
});

//For getting date
RPC.addHandler('RTC.GetDate', function(args) {
    let date =  getDate();
    return {"date": date};
});

/***********************************************************/
/*                                                         */
/*                                                         */
/*                      ~~~Gist~~~                         */
/*                                                         */
/*                                                         */
/***********************************************************/

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

//Temp RTC set
//setDate(27,09,17);
//setTime(23,09,00);