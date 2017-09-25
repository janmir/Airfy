load('api_config.js');
load('api_rpc.js');
load('api_wifi.js');
load('api_timer.js');
load('api_esp8266.js');
load('api_http.js');
load('api_gpio.js');
load('api_sys.js');

print('---Onload---');
let led = 2;
let getInfo = function() {
        return JSON.stringify({
            total_ram: Sys.total_ram(),
            free_ram: Sys.free_ram()
        });
    };

print('---Info', getInfo(), '---');
RPC.addHandler('Sum', function(args) {
    return args.a + args.b;
});

function enable(){
    print('---Manually Enabling Access Point.');            

    //Not connected enable AP
    RPC.call(RPC.LOCAL, 'Config.Set', {"config": {"wifi": {"ap": {"enable":true}}}}, function (response, ud) {

        RPC.call(RPC.LOCAL, 'Config.Save', {"reboot":true}, function (response, ud) {
            print('---Enable AP done.');  
            print('---End---');            
        }, null);

    }, null);
}

//While waiting blink * * *
GPIO.set_mode(led, GPIO.MODE_OUTPUT);
let tBlink =  Timer.set(700, true, function(){
    //call connection check
    let value = GPIO.toggle(led);
    print(value ? 'Tick' : 'Tock', 'uptime:', Sys.uptime(), getInfo());
}, null);

//Wait 20 secs for connection
let tCheck = Timer.set(5000, false, function(){
    print('---Start---');
    
    //call connection check
    RPC.call(RPC.LOCAL, 'Sys.GetInfo', null, function (response, ud) {
        //print('Response:', JSON.stringify(response));            
        
        if(response.wifi.status === "disconnected"){

            print('---Unable to connect device.');            
            //Check if already enabled
            RPC.call(RPC.LOCAL, 'Config.Get', {"key": "wifi.ap.enable"}, function (response, ud) {
                print('---Is Enabled: ', response);
                if(response !== true){
                    print('---Not Enabled Yet.');            
                    
                    //Enable AP
                    enable();
                }else{
                    print('---Already Enabled, waiting for user input.');            
                    print('---End---');
                }
            }, null);        
        }

        //Connected stop blinking
        Timer.del(tBlink);

        //set to default
        GPIO.write(led, 0);
    }, null);

    //Delete timer
    Timer.del(tCheck); 
    
}, null);

//check sched file for any upcoming event
//let tFile = Timer.set(1000, true, function() {
//    print('Time:', Timer.now());
//}, null);