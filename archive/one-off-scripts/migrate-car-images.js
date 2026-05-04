const fs = require('fs')

carIds = JSON.parse(fs.readFileSync('carIds.json'))

for (const oldId in carIds) {
  const newId = carIds[oldId]
  const oldFile = __dirname + '/cars/old/' + oldId + '.jpg'
  const newFile = __dirname + '/cars/' + newId + '.jpg'
  fs.copyFile(oldFile, newFile, err => {
    if (err) {
      console.log(err)
    }
  })
  console.log(oldFile, newFile)
}
