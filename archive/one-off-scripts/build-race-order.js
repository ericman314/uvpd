var nl = 4;
var nc = 8;

if(process.argv.length >= 3) {
  nc = process.argv[2];
}

// Generate an initial race schedule, then use Monte Carlo relaxation to optimize it

var sched = [];
var carLanes = [];  // Reverse lookup to speed up energy calc

// sched and carLanes are coordinated such that:
// if sched[i][j] = car, then carLanes[car][j] = i

for(var i=0; i<nc; i++) {
  carLanes[i] = [];
}

for(var i=0; i<nc; i++) {
  sched[i] = [];
  for(var j=0; j<nl; j++) {
    var car = (i+j) % nc;
    sched[i][j] = car;
    carLanes[car][j] = i;
  }
}

var pairings = [];
for(var i=0; i<nc; i++) {
  pairings[i] = [];
  for(var j=0; j<nc; j++) {
    pairings[i][j] = 0;
  }
}



function energy() {
  // Contributions to energy:
  
  // Sum over all cars i:
  //   x is time between consecutive races
  //   Add 1 / x * facCons

  // Sum over all pairings:
  //   x is Count number of times each pair races together
  //   Add x^2 * facPair
  
  let enerCons = 0;

  for(var i=0; i<nc; i++) {
    var lanes = carLanes[i].slice();
    lanes.sort();
    var enerCarCons = 0;
    for(var l=0; l<nl-1; l++) {
      enerCarCons += 1.0 / ((lanes[l+1]-lanes[l]) * (lanes[l+1]-lanes[l]));
    }
    enerCons += enerCarCons;
  }

  
  for(var i=0; i<nc; i++) {
    for(var j=i; j<nc; j++) {
      pairings[i][j] = 0;
    }
  }

  for(var s=0; s<sched.length; s++) {
    for(var i=0; i<nl-1; i++) {
      for(var j=i+1; j<nl; j++) {
        var car0 = sched[s][i];
        var car1 = sched[s][j];
        if(car0 > car1) {
          let temp = car1;
          car1 = car0;
          car0 = temp;
        }
        pairings[car0][car1]++;
      }
    }
  }

  let enerPair = 0;
  for(var i=0; i<nc-1; i++) {
    for(var j=i+1; j<nc; j++) {
      enerPair += pairings[i][j] * pairings[i][j] * pairings[i][j];
    }
  }


  return enerCons * 5 + enerPair;

}

function randomInt(x) {
  return Math.floor(Math.random() * x);
}

var saveSched;
var saveCarLanes;
var bestSched;
var bestCarLanes;

function saveState() {
  saveSched = JSON.stringify(sched);
  saveCarLanes = JSON.stringify(carLanes);
}

function restoreState() {
  sched = JSON.parse(saveSched);
  carLanes = JSON.parse(saveCarLanes);
}

function saveBest() {
  bestSched = JSON.stringify(sched);
  bestCarLanes = JSON.stringify(carLanes);
}

function restoreBest() {
  sched = JSON.parse(bestSched);
  carLanes = JSON.parse(bestCarLanes);
}


function swap() {

  if(Math.random() < 0.5) {
    // Swap entire race

    
    let race0 = randomInt(nc);
    let race1 = randomInt(nc);

    for(var lane=0; lane<nl; lane++) {
      var car0 = sched[race0][lane];
      var car1 = sched[race1][lane];

      // Do the swap
      sched[race0][lane] = car1;
      sched[race1][lane] = car0;
      carLanes[car0][lane] = race1;
      carLanes[car1][lane] = race0;
    }

  }
  else {

    // Choose a random lane and two random races

    let lane = randomInt(nl);
    let race0 = randomInt(nc);
    let race1 = randomInt(nc);

    var car0 = sched[race0][lane];
    var car1 = sched[race1][lane];

    // Do the swap
    sched[race0][lane] = car1;
    sched[race1][lane] = car0;
    carLanes[car0][lane] = race1;
    carLanes[car1][lane] = race0;
  }

}

var energyBefore = 1e100;
var bestEnergy = 1e100;


for(var i=0; i<10000; i++) {
  saveState();
  swap();
  var newEnergy = energy();
  if(newEnergy < energyBefore) {
    energyBefore = newEnergy;
    if(newEnergy < bestEnergy) {
      saveBest();
      bestEnergy = newEnergy;
      console.log(newEnergy);
      console.log(sched);
      console.log(pairings);
      console.log(carLanes);
    }
  }
  else {
    restoreState();
  }
}

// Two moves:
// Swap cars of same lane in two different races
// Swap two races
// These moves ensure that:
// Cars race once on each lane
