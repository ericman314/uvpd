var scene = new THREE.Scene()
var renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

var camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = 300

window.addEventListener('resize', onWindowResize, false)

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

var fontLoader = new THREE.FontLoader()
fontLoader.load('fonts/Roboto Slab_Bold.json', fontLoaded)

var textureLoader = new THREE.TextureLoader()

const material = new THREE.MeshBasicMaterial({
  map: textureLoader.load('https://threejsfundamentals.org/threejs/resources/images/wall.jpg'),
})

let groups = []

function fontLoaded(font) {

  var cars, results

  var params = new URLSearchParams(window.location.search)
  if (params.has('event')) {
    var event = params.get('event')
    fetch("/api/v3/carsAndResultsByEventId?eventId=" + event).then(data => data.json()).then(function (data) {
      cars = data.cars
      results = data.results
      console.log(cars)
      console.log(results)

      let x = 0

      for (let car of cars) {

        console.log(car)

        let color = getColor(car)

        var group = new THREE.Group()


        var textGeom = new THREE.TextGeometry(car.nickname, {
          font: font,
          size: 40,
          height: 5,
          curveSegments: 4,
          bevelEnabled: false,
          bevelThickness: 0,
          bevelSize: 0,
          bevelOffset: 0,
          bevelSegments: 10
        })
        textGeom.center()

        var textMat = new THREE.MeshLambertMaterial({ color: color })
        var text = new THREE.Mesh(textGeom, textMat)
        text.position.set(0, -100, 20)
        group.add(text)

        var pictureFrameGeom = new THREE.PlaneGeometry(320, 240)
        var pictureFrameMat = new THREE.MeshBasicMaterial({ map: textureLoader.load('/api/v3/cars/' + car.carId + '.jpg') })
        pictureFrameMat.side = THREE.DoubleSide
        var pictureFrame = new THREE.Mesh(pictureFrameGeom, pictureFrameMat)
        pictureFrame.position.set(0, 40, -20)
        group.add(pictureFrame)

        group.position.set(Math.random() * 1000, Math.random() * 1000, Math.random() * 1000)

        group.setRotationFromEuler(new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2))


        scene.add(group)
        groups.push(group)
      }


    })
  }
}

var light1 = new THREE.DirectionalLight(0xffffff, 1)
light1.position.set(0, 0.5, 1).normalize()
scene.add(light1)

var timingStart = Date.now()

let index = 0

setInterval(() => {
  if (groups.length > 0) {
    index = (index + 1) % groups.length
  }
}, 2000)

function animate() {
  var time = Date.now() - timingStart
  requestAnimationFrame(animate)
  

  // TODO: Calculate group's up vector
  let up = groups[index].up
  console.log(up)
  camera.up = up
  console.log(camera.up)
  camera.lookAt(groups[index].position)


  // camera.position.x = time * 0.05
  // camera.updateProjectionMatrix()

  renderer.render(scene, camera)
}
animate()

function getColor(car) {
  let colorNames = {
    red: 0xff0000,
    orange: 0xff7700,
    yellow: 0xffff00,
    green: 0x00ff00,
    blue: 0x2255ff,
    purple: 0xff00ff,
    violet: 0xcc00cc,
    pink: 0xff7777,
    silver: 0xbbbbbb,
    gold: 0xff9911,
    white: 0xffffff,
    black: 0x777777,
    gray: 0xaaaaaa,
    grey: 0xaaaaaa,
  }

  for (let c in colorNames) {
    if (car.nickname.toLowerCase().includes(c)) {
      return colorNames[c]
    }
  }

  // Return a random color
  let r = 0, g = 0, b = 0
  while (r + g + b < 255) {
    r = Math.round(Math.random() * 255)
    g = Math.round(Math.random() * 255)
    b = Math.round(Math.random() * 255)
  }

  return b + 256 * (g + 256 * r)
}