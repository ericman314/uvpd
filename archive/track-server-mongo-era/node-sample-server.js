var express = require('express');
var bodyParser = require('body-parser');
var SerialPort = require('serialport');

var app = express();

app.listen(80, function () {
  console.log('Server listening on port 80!');
});

// Config to allow json formatted data in the request body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/**************** http routing *******************/

// Serve static files from the public directory. For example, http://localhost/some/web/page.html would be mapped to /path/to/server/public/some/web/page.html.
//app.use('/', express.static(__dirname + '/public/'));

// If no page is given in the url, send the index page
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/public/index.html');
});

// /api/command is a custom route.
// Example usage from a webpage: $.post('/api/command', { command: 'Fire missles' }, function(response) { alert(response); });
app.post('/api/command', function(req, res) {
  var command = req.body.command;
  console.log("Writing '" + command + "' to the serial port.");
  writeSerial(command);
  
  res.json({message: "As you wish."});
});

/**************** serial ***********************/

var port;

function writeSerial(data) {
  if(port && port.isOpen()) {
    port.write(data, function(err) {
      if(err) {
        console.log("Error when writing to serial port: " + err);
      }
    });
  }
  else {
    console.log("Cannot write to serial port: it is not open.");
  }
}

// Using setInterval so the server can try to reestablish a lost connection
setInterval(function() {
  if(!port || !port.isOpen()) {
    SerialPort.list(function(err, ports) {
      if(err) {
        console.log(err);
        return;
      }
      if(ports.length > 0) {
        console.log("Trying to connect to " + ports[0].comName);
        // Change the baud rate to your favorite number
        port = new SerialPort(ports[0].comName, { parser: SerialPort.parsers.readline('\n'), baudRate: 115200  }, function(err) {
          if(err) {
            console.log(err);
          }
        });
        
        port.on('open', function() {
          console.log("Serial port opened.");
        });
        
        port.on('error', function(err) {
          console.log('Serial port error: ', err.message);
        });
        
        port.on('data', function(data) {
          console.log("Received data from the serial port: ", data);
        });
        
        port.on('disconnect', function(err) {
          console.log("Serial port disconnected: ", err.message);
        });
        
        port.on('close', function() {
          console.log('Serial port closed.');
        });
      }
      else {
        console.log("No serial ports available");
      }
    }); 
  }
}, 5000);

