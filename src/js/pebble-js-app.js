Pebble.addEventListener("ready",
    function(e) {
      console.log("got ready event");
    }
);

var remaining_string, temperatures_string, filename, remaining, progress, temperatures;
var octoprint_host = localStorage.getItem('octoprinthost');
var octoprint_port = localStorage.getItem('octoprintport');
var octoprint_api_key = localStorage.getItem('octoprintapikey');
var octoprint_api_job = 'http://' + octoprint_host + ':' + octoprint_port + '/api/job?apikey=' + octoprint_api_key;
var octoprint_api_printer = 'http://' + octoprint_host + ':' + octoprint_port + '/api/printer?apikey=' + octoprint_api_key;

function fetchJobStatus() {
  var response;
  var req = new XMLHttpRequest();
  req.open('GET', octoprint_api_job, true);
  req.onload = function(e) {
    if (req.readyState == 4) {
      if(req.status == 200) {
        response = JSON.parse(req.responseText);
          filename = response.job.file.name;
          remaining = response.progress.printTimeLeft;
            if(remaining) {
              // Convert seconds from API to HH:MM format
              remaining_string = secondsToHm(remaining);
              } else {
                remaining_string = '00:00';
              }
              remaining = remaining_string.toString();
      
              // Convert progress % to integer
              var prog_percent = Math.round(response.progress.completion);
              prog_percent = prog_percent + '% complete';
              progress = prog_percent.toString();
              }
        }
	};
  req.send(null);
}  
 
function fetchPrinterStatus() {   
   var response;
   var req = new XMLHttpRequest();
   req.open('GET', octoprint_api_printer, true);
   req.onload = function(e) {
     if (req.readyState == 4) {
       if(req.status == 200) {
          response = JSON.parse(req.responseText);
            var etemp = Math.round(response.temperature.tool0.actual.toString());
            var btemp = Math.round(response.temperature.bed.actual.toString());
            temperatures_string = 'Ex: ' + etemp + '\u00B0' + 'C - Bed: ' + btemp + '\u00B0' + 'C';
            temperatures = temperatures_string.toString();
            }
        }
  };
  req.send(null);
}


function fetchall() {
  fetchJobStatus();
	fetchPrinterStatus();
    // Issue: too long filenames break messaging, so
    // for now, trimming them to 21chrs max
    if (filename.length > 21) {
      filename = filename.substring(0,18) + '...';
    }
    Pebble.sendAppMessage({
        "0":filename,
        "1":remaining,
        "2":progress,
        "3":temperatures}, appMessageACK, appMessageNACK); 
}

function secondsToHm(d) {
  d = Number(d);
  var h = Math.floor(d / 3600);
  var m = Math.floor(d % 3600 / 60);
  if (m < 10) {
    m = '0' + m;
  }
  return (h + ':' + m);
}

function appMessageACK(e){
  console.log('message delivered!');
}

function appMessageNACK(e){
  console.log('message failed!');
  console.log(e.error);
}

Pebble.addEventListener("appmessage",
  function(e) {
    console.log('received appMessage:');                        
    console.log(e.type);
    console.log(e.payload.octoprint_command);
    
    if(e.payload.octoprint_command == "update"){
      fetchall();
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
  };
  req.send(null);
}