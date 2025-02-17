import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import * as dat from "dat.gui";
import { degToRad } from "three/src/math/MathUtils.js";

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
camera.position.z = 5;

const earthGroup = new THREE.Group();
//earthGroup.rotation.z = (-23.4 * Math.PI) / 180;
scene.add(earthGroup);
const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 3;
controls.maxDistance = 25;
const loader = new THREE.TextureLoader();
const geometry = new THREE.IcosahedronGeometry(1, 12);
const material = new THREE.MeshBasicMaterial({
  map: loader.load("earthmap1k.jpg"),
});
const earthMesh = new THREE.Mesh(geometry, material);
earthGroup.add(earthMesh);

const axesHelper = new THREE.AxesHelper(10);
//stop helper lines from overlapping
axesHelper.position.y += 0.0005;
scene.add(axesHelper);
const gridHelper = new THREE.GridHelper(200, 100);
scene.add(gridHelper);

const curve = new THREE.EllipseCurve(
  0,
  0, // ax, aY
  2,
  2, // xRadius, yRadius
  0,
  2 * Math.PI, // aStartAngle, aEndAngle
  false, // aClockwise
  0 // aRotation
);

const points = curve.getPoints(50);
const curve_geometry = new THREE.BufferGeometry().setFromPoints(points);
const curve_material = new THREE.LineBasicMaterial({ color: 0xffffff });
// Create the final object to add to the scene
const ellipse = new THREE.Line(curve_geometry, curve_material);
ellipse.rotation.x = Math.PI / 2;
earthGroup.add(ellipse);

const orbit = {
  periapsis: 1,
  apoapsis: 1,
  semiMajorAxis: 2,
  eccentricity: 0,
  inclination: 0,
  longitudeOfTheAcendingNode: 0,
  argumentOfPeriapsis: 0,
  trueAnomaly: 0,
  ellipseResolution: 50,
};

function drawEllipse() {
  console.log("Drawing");
  const linearEccentricity = orbit.semiMajorAxis * orbit.eccentricity;
  const semiMinorAxis = Math.sqrt(
    Math.pow(orbit.semiMajorAxis, 2) - Math.pow(linearEccentricity, 2)
  );

  const points = [];
  for (let i = 0; i < orbit.ellipseResolution; i++) {
    const angle = (i / orbit.ellipseResolution - 1) * Math.PI * 2;
    const px = Math.cos(angle) * orbit.semiMajorAxis;
    const py = Math.sin(angle) * semiMinorAxis;
    points.push(new THREE.Vector2(px, py));
  }
  points.push(new THREE.Vector2(points[0].x, points[0].y));

  const geom = new THREE.BufferGeometry().setFromPoints(points);
  ellipse.geometry = geom;
}

const gui = new dat.GUI();
const orbitFolder = gui.addFolder("Keplerian Elements");
//gui.add(orbit, "periapsis", 1, 4).onChange(() => drawEllipse());
//gui.add(orbit, "apoapsis", 1, 4).onChange(() => drawEllipse());
orbitFolder
  .add(orbit, "semiMajorAxis", 1, 8)
  .name("size: a")
  .onChange(() => drawEllipse());
orbitFolder
  .add(orbit, "eccentricity", 0, 0.99)
  .name("eccentricity: e")
  .step(0.01)
  .onChange(() => drawEllipse());
orbitFolder
  .add(orbit, "inclination", 0, 180)
  .name("inclination: i")
  .onChange((value) => (ellipse.rotation.y = degToRad(value)));
orbitFolder
  .add(orbit, "longitudeOfTheAcendingNode", 0, 360)
  .name("longitudeOfTheAcendingNode: Ω")
  .onChange((value) => (ellipse.rotation.z = degToRad(value)));
orbitFolder
  .add(orbit, "argumentOfPeriapsis", 0, 360)
  .name("argumentOfPeriapsis: ω")
  .onChange((value) => (ellipse.rotation.z = degToRad(value)));
orbitFolder
  .add(orbit, "trueAnomaly", 0, 360)
  .name("trueAnomaly: v")
  .onChange(() => drawEllipse());
gui
  .add(orbit, "ellipseResolution", 5, 50)
  .name("Resolution")
  .step(1)
  .onChange(() => drawEllipse());

function animate() {
  //earthMesh.rotation.y += 0.002;

  renderer.render(scene, camera);
}
