var printing = false;

function fetchPrinterStatus() {

  var octoprint_host = localStorage.getItem('octoprinthost');
  var octoprint_port = localStorage.getItem('octoprintport');
  var octoprint_api_key = localStorage.getItem('octoprintapikey');

  var octoprint_api_url = 'http://' + octoprint_host + ':' + octoprint_port + '/api/printer?apikey=' + octoprint_api_key;
  
  var response;
  var req = new XMLHttpRequest();
  req.open('GET', octoprint_api_url, true);
  req.onload = function(e) {
  if (req.readyState == 4) {
    if(req.status == 200) {
      response = JSON.parse(req.responseText);
      
      var filename = response.job.filename;
      
      // send notification when done
      if(printing && !response.state.flags.printing){
        var d = new Date();
        Pebble.showSimpleNotificationOnPebble('Printing Complete', filename + ' finished printing at ' + d);
      }
      
      printing = response.state.flags.printing;
      
      var remaining = response.progress.printTimeLeft;
      var remaining_string = '00:00';
      
      if(remaining){
        remaining_string = remaining.toString().substring(0,5);
      }
      
      remaining = remaining_string;
      
      var prog_percent = Math.round(Number(response.progress.progress) * 100);
      prog_percent = prog_percent + '% complete';
      var progress = prog_percent.toString();
      
      console.log(filename);
      console.log(remaining);
      console.log(progress);
      
      // Issue: too long filenames break messaging, so
      // for now, trimming them to 23chrs max
      filename = filename.substring(0,20) + '...';
      
      Pebble.sendAppMessage({
        "0":filename,
        "1":remaining,
        "2":progress}, appMessageACK, appMessageNACK);
      }
    
    } else {
    
      console.log('something went wrong, ' + req.status);
      
    }
  }
  req.send(null);
}

function pausePrinter() {

  var octoprint_host = localStorage.getItem('octoprinthost');
  var octoprint_port = localStorage.getItem('octoprintport');
  var octoprint_api_key = localStorage.getItem('octoprintapikey');
  
  var octoprint_api_url = 'http://' + octoprint_host + ':' + octoprint_port + '/api/control/job';
  
  // debug
  console.log('calling ' + octoprint_api_url + ' to pause current print job');
  
  var response;
  var req = new XMLHttpRequest();
  req.open('POST', octoprint_api_url, true);
  req.data = 'x-api-key=' + octoprint_api_key + '&body={"command":"pause"}';
  req.onload = function(e) {
  if (req.readyState == 4) {
    if(req.status == 200) {
      
      response = JSON.parse(req.responseText);
      
      console.log(response);
      
      Pebble.sendAppMessage({"3":"paused"}, appMessageACK, appMessageNACK);
      }
    } else {
    
      console.log('something went wrong, ' + req.status);
    }
  }
  req.send(null);
}


function appMessageACK(e){
  console.log('message delivered!');
}

function appMessageNACK(e){
  console.log('message failed!');
  console.log(e.error);
}

Pebble.addEventListener("ready",
    function(e) {
      console.log("got ready event");
    }
);

Pebble.addEventListener("appmessage",
  function(e) {
    console.log('received appMessage:');                        
    console.log(e.type);
    console.log(e.payload.octoprint_command);
    
    if(e.payload.octoprint_command == "update"){
      fetchPrinterStatus();
    }
    
    if(e.payload.octoprint_command == "pause"){
      // toggle pause state
      //pausePrinter();
    }
    
    if(e.payload.octoprint_command == "cancel"){
      // cancel the print job
    }
});

Pebble.addEventListener("showConfiguration",
  function(){
    console.log('running configuration');
  
      var octoprint_host = localStorage.getItem('octoprinthost'),
        octoprint_port = localStorage.getItem('octoprintport'),
        octoprint_api_key = localStorage.getItem('octoprintapikey'),
        uri;
      uri = 'https://rawgithub.com/jjg/octowatch/master/configure.html?host=' + encodeURIComponent(octoprint_host) + '&port=' + encodeURIComponent(octoprint_port) + '&key=' + encodeURIComponent(octoprint_api_key);
      Pebble.openURL(uri);
  }
);

Pebble.addEventListener("webviewclosed", function(e) {

    console.log('saving settings');

    try{
      var options = JSON.parse(decodeURIComponent(e.response));
    
      localStorage.setItem('octoprinthost', options.server_host);
      localStorage.setItem('octoprintport', options.server_port);
      localStorage.setItem('octoprintapikey', options.server_api_key);
    } catch(e) {
      console.log('settings not updated');
    }
  }
);





