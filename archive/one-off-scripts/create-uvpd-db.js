var mysql = require('mysql');
var config = require('./config/config.json');

var pool  = mysql.createPool({
  connectionLimit : 10,
  host            : config.mysql_host,
  user            : config.mysql_user,
  password        : config.mysql_pass,
  database        : 'uvpd'
});

var createEvents = `
CREATE TABLE IF NOT EXISTS Events (
  eventId INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  eventName TEXT NOT NULL,
  eventDate DATETIME NOT NULL,
  multiplier INT NOT NULL,
  code TEXT,
  shortUrl TEXT,
  longUrl TEXT
)`;

var createCars = `
CREATE TABLE IF NOT EXISTS Cars (
  carId INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  eventId INT NOT NULL,
  carName TEXT NOT NULL,
  weight DECIMAL(9,6),
  den TEXT
)`;

var createResults = `
CREATE TABLE IF NOT EXISTS Results (
  resultId INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  carId INT NOT NULL,
  lane TINYINT NOT NULL,
  time DECIMAL(9,6) NOT NULL,
  resultDate DATETIME NOT NULL,
  place TINYINT
)`;

// time: ###.######
// weight: ###.######

pool.query(createEvents, console.error);
pool.query(createCars, console.error);
pool.query(createResults, console.error);

setTimeout(() => {
  pool.end();
}, 1000);