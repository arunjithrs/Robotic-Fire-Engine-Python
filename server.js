var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var gpio = require('rpi-gpio')
var gpiop = gpio.promise;
var gpio1 = require("gpio");
const Gpio = require('pigpio').Gpio;

// public directory
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

// Motor pin
const motorPump = 7;

// ultrasonic sensor
const MICROSECDONDS_PER_CM = 1e6/34321;

const trigger = new Gpio(5, {mode: Gpio.OUTPUT});
const echo = new Gpio(6, {mode: Gpio.INPUT, alert: true});
trigger.digitalWrite(0);
let totalTankCap = 15;
let tankOffsetDist = 3;

const watchHCSR04 = () => {
  let startTick;

  echo.on('alert', (level, tick) => {
    if (level == 1) {
      startTick = tick;
    } else {
      const endTick = tick;
      const diff = (endTick >> 0) - (startTick >> 0);
      var dist = diff / 2 / MICROSECDONDS_PER_CM;
      
      let tankDist = dist - tankOffsetDist;
      let level = totalTankCap - tankDist;
      let perc = level / totalTankCap * 100;
      
      if(perc >= 100)
      	perc = 100;
      
      levelJson = {'water': perc.toFixed(2)};
      io.emit('water', levelJson);
    }
  });
};
watchHCSR04();


// humidity and temperature sensor
var rpiDhtSensor = require('rpi-dht-sensor');
 
var dht = new rpiDhtSensor.DHT11(2);
 
function read () {
  var readout = dht.read();
  item = {'temp': readout.temperature.toFixed(2), 'humidity': readout.humidity.toFixed(2)};
  console.log(item);
  return item;
}

// for motor controls
const motorAE = 37;
const motorAA = 33;
const motorAB = 35;

const motorBE = 40;
const motorBA = 36;
const motorBB = 38;

gpiop.setup(motorAE, gpio.DIR_OUT)
 .then(() => {
     return gpiop.write(motorAE, true)
 }).catch((err) => {
     console.log('Error: ', err.toString())
})
 
 gpiop.setup(motorBE, gpio.DIR_OUT)
 .then(() => {
     return gpiop.write(motorBE, true)
 }).catch((err) => {
     console.log('Error: ', err.toString())
 })
 
state = "";
count = 0;
prev = "";
io.on('connection', function(socket){
	// for motor
  socket.on('message', function(data){
  	
  	socket.broadcast.emit('message', data);
  	if(state != data.message) {
  		state = data.message;
  	} else {
  		count++;
  	}
  	
  	if(count > 10) {
  		console.log(count)
  		if(prev != data.message){
  			move(data.message)
  		}
  		prev = data.message;
  		count = 0;
  	}
  });
  
  // temp and hum
	setInterval(() => {
		io.emit('sensors', read());
	}, 5000);
	
  
	// water level 
	setInterval(() => { 
	  trigger.trigger(10, 1);
	}, 4000);
	
	// Motor
	socket.on('motor', function(data){
		if(data.state == 'change'){
			gpiop.setup(motorPump, gpio.DIR_OUT)
			    .then(() => {
			        return gpiop.write(motorPump, true)
			    }).catch((err) => {
		        console.log('Error: ', err.toString())
		    });
		 }
	 });
});

	
http.listen(3000, function(){
  console.log('listening on *:3000');
});

function move(direction) {

  	
  	if(direction == 'STOP') {
	  	gpiop.setup(motorAA, gpio.DIR_OUT)
			    .then(() => {
			        return gpiop.write(motorAA, false)
			    }).catch((err) => {
	        console.log('Error: ', err.toString())
	    })
	    gpiop.setup(motorAB, gpio.DIR_OUT)
			    .then(() => {
			        return gpiop.write(motorAB, false)
			    }).catch((err) => {
	        console.log('Error: ', err.toString())
	    })
	    
	    gpiop.setup(motorBA, gpio.DIR_OUT)
			    .then(() => {
			        return gpiop.write(motorBA, false)
			    }).catch((err) => {
	        console.log('Error: ', err.toString())
	    })
			gpiop.setup(motorBB, gpio.DIR_OUT)
			    .then(() => {
			        return gpiop.write(motorBB, false)
			    }).catch((err) => {
	        console.log('Error: ', err.toString())
	    })
  	}
  	
	if(direction == 'UP') { // move forward
		  	
		gpiop.setup(motorAA, gpio.DIR_OUT)
		    .then(() => {
		        return gpiop.write(motorAA, true)
		    }).catch((err) => {
		  console.log('Error: ', err.toString())
		 })
		gpiop.setup(motorAB, gpio.DIR_OUT)
		    .then(() => {
		        return gpiop.write(motorAB, false)
		    }).catch((err) => {
		  console.log('Error: ', err.toString())
		 })
		 
		 
	    gpiop.setup(motorBA, gpio.DIR_OUT)
			    .then(() => {
			        return gpiop.write(motorBA, true)
			    }).catch((err) => {
	        console.log('Error: ', err.toString())
	    })
			gpiop.setup(motorBB, gpio.DIR_OUT)
			    .then(() => {
			        return gpiop.write(motorBB, false)
			    }).catch((err) => {
	        console.log('Error: ', err.toString())
	    })
  	}
  	
  	
  	
  	if(direction == 'DOWN') { // move backward
		  	
		gpiop.setup(motorAA, gpio.DIR_OUT)
			    .then(() => {
			        return gpiop.write(motorAA, false)
			    }).catch((err) => {
		     console.log('Error: ', err.toString())
		 })
		gpiop.setup(motorAB, gpio.DIR_OUT)
			    .then(() => {
			        return gpiop.write(motorAB, true)
			    }).catch((err) => {
		     console.log('Error: ', err.toString())
		 })  		 
		 
		 gpiop.setup(motorBA, gpio.DIR_OUT)
			    .then(() => {
			        return gpiop.write(motorBA, false)
			    }).catch((err) => {
	        console.log('Error: ', err.toString())
	    })
			gpiop.setup(motorBB, gpio.DIR_OUT)
			    .then(() => {
			        return gpiop.write(motorBB, true)
			    }).catch((err) => {
	        console.log('Error: ', err.toString())
	    })
  	}
  	
  	if(direction == 'LEFT') { // turn left
  	
  	  	gpiop.setup(motorBA, gpio.DIR_OUT)
			    .then(() => {
			        return gpiop.write(motorBA, true)
			    }).catch((err) => {
	        console.log('Error: ', err.toString())
	    })
			gpiop.setup(motorBB, gpio.DIR_OUT)
			    .then(() => {
			        return gpiop.write(motorBB, false)
			    }).catch((err) => {
	        console.log('Error: ', err.toString())
	    })
	    
		gpiop.setup(motorAA, gpio.DIR_OUT)
			    .then(() => {
			        return gpiop.write(motorAA, false)
			    }).catch((err) => {
		     console.log('Error: ', err.toString())
		 })
		gpiop.setup(motorAB, gpio.DIR_OUT)
			    .then(() => {
			        return gpiop.write(motorAB, false)
			    }).catch((err) => {
		     console.log('Error: ', err.toString())
		 })  
		  	
  	}
  	
  	if(direction == 'RIGHT') { // turn right
  	
  		gpiop.setup(motorBA, gpio.DIR_OUT)
			    .then(() => {
			        return gpiop.write(motorBA, false)
			    }).catch((err) => {
	        console.log('Error: ', err.toString())
	    })
			gpiop.setup(motorBB, gpio.DIR_OUT)
			    .then(() => {
			        return gpiop.write(motorBB, false)
			    }).catch((err) => {
	        console.log('Error: ', err.toString())
	    })
	    
		gpiop.setup(motorAA, gpio.DIR_OUT)
			    .then(() => {
			        return gpiop.write(motorAA, true)
			    }).catch((err) => {
		     console.log('Error: ', err.toString())
		 })
		gpiop.setup(motorAB, gpio.DIR_OUT)
			    .then(() => {
			        return gpiop.write(motorAB, false)
			    }).catch((err) => {
		     console.log('Error: ', err.toString())
		 })  			
  	}
  	
	

}
