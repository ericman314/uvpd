var config = require('./config/config.json');
let mysql = require('mysql')

/** Create a pool of connections to the MySQL database */
var pool = mysql.createPool({
  connectionLimit: 10,
  host: config.mysql_host,
  user: config.mysql_user,
  password: config.mysql_pass,
  database: 'pinewood'
});

pool.query('SELECT * FROM Results JOIN Events ON Events.EventId = Results.EventId JOIN Cars ON Results.carId = Cars.carId WHERE Events.hidden = 0', (err, rows) => {
  if (err) {
    console.log(err)
    return
  }

  // Calculate each car's average time
  let cars = {}
  for (let i = 0; i < rows.length; i++) {
    let carId = rows[i].carId
    if (!cars[carId]) {
      cars[carId] = { avg: 0, n: 0 }
    }
    if (rows[i].time < 10) {
      cars[carId].avg = (cars[carId].avg * cars[carId].n + rows[i].time) / (cars[carId].n + 1)
      cars[carId].n++
    }

  }

  // For each result, calculate the difference between that result and the car's average time
  for (let i = 0; i < rows.length; i++) {
    let carId = rows[i].carId
    rows[i].timeDiff = rows[i].time - cars[carId].avg
  }

  // For each car, organize the results by lane
  let lanes = ['Blue', 'Yellow', 'Green', 'Red']
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].time < 10) {
      let carId = rows[i].carId
      let lane = lanes[rows[i].lane - 1]
      let r = '1'
      if (cars[carId][lane + r]) {
        r = '2'
      }
      cars[carId][lane + r] = rows[i].timeDiff
    }
  }

  console.log('CarId, Blue1, Yellow1, Green1, Red1, Blue2, Yellow2, Green2, Red2')
  // Output results (one row per car)
  for (let carId in cars) {
    let car = cars[carId]
    console.log(carId, ', ', car.Blue1||'', ', ', car.Yellow1||'', ', ', car.Green1||'', ', ', car.Red1||'', ', ', car.Blue2||'', ', ', car.Yellow2||'', ', ', car.Green2||'', ', ', car.Red2||'')
  }
})