import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { MeshLine, MeshLineMaterial } from "three.meshline";
import { degToRad } from "three/src/math/MathUtils.js";
import GUI from "lil-gui";

//* Setup Scene, Camera and Renderer

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);
// move camera so objects in origin visible
camera.position.z = 5;

//* Controls and Loader setup
const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 2;
controls.maxDistance = 25;
const loader = new THREE.TextureLoader();

//* Helper setup

const axesHelper = new THREE.AxesHelper(10);
scene.add(axesHelper);
const gridHelper = new THREE.GridHelper(200, 100);
//stop helper lines from overlapping
gridHelper.position.y -= 0.0005;
scene.add(gridHelper);

//* Create Earth

const earthGroup = new THREE.Group();
//earthGroup.rotation.z = (-23.4 * Math.PI) / 180;
scene.add(earthGroup);
const geometry = new THREE.IcosahedronGeometry(1, 12);
const material = new THREE.MeshBasicMaterial({
  map: loader.load("earthmap1k.jpg"),
});
const earthMesh = new THREE.Mesh(geometry, material);
earthGroup.add(earthMesh);

//* Orbit setup

const orbitGroup = new THREE.Group();
scene.add(orbitGroup);

const curve_material = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.4,
});
// Create the final object to add to the scene
const ellipse = new THREE.Mesh(new THREE.ShapeGeometry(), curve_material);
const orbitPathMaterial = new MeshLineMaterial({
  color: 0xccccff,
  lineWidth: 0.02,
  opacity: 0.8,
});
const orbitLine = new MeshLine();
const orbitPath = new THREE.Mesh(orbitLine, orbitPathMaterial);

const orbit = {
  centerOfMass: new THREE.Vector2(0, 0),
  periapsis: 2,
  apoapsis: 2,
  semiMajorAxis: 2,
  eccentricity: 0,
  inclination: 0,
  longitudeOfTheAcendingNode: 0,
  argumentOfPeriapsis: 0,
  trueAnomaly: 0,
  ellipseResolution: 50,
};

ellipse.add(orbitPath);
ellipse.rotation.x = Math.PI / 2;
orbitGroup.add(ellipse);

drawEllipse();

//* Orbit interaction

function drawEllipse() {
  //orbit.semiMajorAxis = (orbit.apoapsis + orbit.periapsis) / 2;
  const linearEccentricity = orbit.semiMajorAxis * orbit.eccentricity;
  orbit.eccentricity = linearEccentricity / orbit.semiMajorAxis;
  const semiMinorAxis = Math.sqrt(
    Math.pow(orbit.semiMajorAxis, 2) - Math.pow(linearEccentricity, 2)
  );
  const ellipseCenterX = orbit.centerOfMass.x - linearEccentricity;
  const ellipseCenterY = orbit.centerOfMass.y;

  const shape = new THREE.Shape();
  const points = [];
  for (let i = 0; i < orbit.ellipseResolution; i++) {
    const angle = (i / orbit.ellipseResolution - 1) * Math.PI * 2;
    const px = Math.cos(angle) * orbit.semiMajorAxis + ellipseCenterX;
    const py = Math.sin(angle) * semiMinorAxis + ellipseCenterY;
    points.push(new THREE.Vector3(px, py, 0));
    if (i === 0) {
      shape.moveTo(px, py);
    } else {
      shape.lineTo(px, py);
    }
  }
  points.push(new THREE.Vector3(points[0].x, points[0].y, 0));

  const geom = new THREE.ShapeGeometry(shape);
  ellipse.geometry = geom;
  const line_geom = new THREE.BufferGeometry().setFromPoints(points);
  orbitLine.setGeometry(line_geom);
  orbitPath.geometry = orbitLine;
}

//* GUI

const gui = new GUI();
const orbitFolder = gui.addFolder("Keplerian Elements");
orbitFolder
  .add(orbit, "semiMajorAxis", 1, 8)
  .name("a")
  .onChange(() => drawEllipse());
orbitFolder
  .add(orbit, "eccentricity", 0, 0.99)
  .name("e")
  .step(0.01)
  .onChange(() => drawEllipse());
orbitFolder
  .add(orbit, "inclination", 0, 180)
  .name("i")
  .onChange((value) => (ellipse.rotation.y = degToRad(value)));
orbitFolder
  .add(orbit, "longitudeOfTheAcendingNode", 0, 360)
  .name("Ω")
  .onChange((value) => (orbitGroup.rotation.y = degToRad(value)));
orbitFolder
  .add(orbit, "argumentOfPeriapsis", 0, 360)
  .name("ω")
  .onChange((value) => (ellipse.rotation.z = -degToRad(value)));
orbitFolder
  .add(orbit, "trueAnomaly", 0, 360)
  .name("θ")
  .onChange(() => drawEllipse());
gui
  .add(orbit, "ellipseResolution", 5, 200)
  .name("Resolution")
  .step(1)
  .onChange(() => drawEllipse());

//* Animation

function animate() {
  //earthMesh.rotation.y += 0.002;

  renderer.render(scene, camera);
}
