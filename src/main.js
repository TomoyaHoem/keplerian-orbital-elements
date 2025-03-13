import * as THREE from "three";
import { initSplineTexture, OrbitControls } from "three/examples/jsm/Addons.js";
import { MeshLine, MeshLineMaterial } from "three.meshline";
import { degToRad } from "three/src/math/MathUtils.js";
import GUI from "lil-gui";
import Stats from "three/examples/jsm/libs/stats.module.js";

//* Statistics

var stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

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
//scene.add(axesHelper);
const gridHelper = new THREE.GridHelper(200, 100);
//stop helper lines from overlapping
gridHelper.position.y -= 0.0005;
//scene.add(gridHelper);

//* Create Earth

const earthGroup = new THREE.Group();
//earthGroup.rotation.z = (-23.4 * Math.PI) / 180;
scene.add(earthGroup);
const geometry = new THREE.IcosahedronGeometry(1, 12);
const material = new THREE.MeshBasicMaterial({
  map: loader.load("earthmap1k.jpg"),
});
const wireGeometry = new THREE.IcosahedronGeometry(1.05, 12).toNonIndexed();
const positionAttribute = wireGeometry.getAttribute("position");
const colors = [];

for (let i = 0; i < positionAttribute.count; i++) {
  colors.push(1, 1, 1); // add for each vertex color data
}
wireGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
const wireMaterial = new THREE.MeshBasicMaterial({
  wireframe: true,
  color: 0x5c5c5c,
  transparent: true,
  opacity: 0.4,
  side: THREE.DoubleSide,
  vertexColors: true,
});
const earthMesh = new THREE.Mesh(geometry, material);
const earthWireframe = new THREE.Mesh(wireGeometry, wireMaterial);
earthGroup.add(earthWireframe);
earthGroup.add(earthMesh);

//* Satellite

const satelliteOptions = {
  speed: 0.001,
};
const satGeom = new THREE.ConeGeometry(0.05, 0.1, 26, 26);
const satMat = new THREE.MeshBasicMaterial({ color: 0xd4af37 });
const satellite = new THREE.Mesh(satGeom, satMat);
let time = 0;
let satellitePosition = new THREE.Vector3(0, 0, 0);

satellite.geometry.rotateX(Math.PI / 2);

//* Satellite Line of Sight

const losMaterial = new THREE.LineBasicMaterial({ color: 0xffbcfd });
const losGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(),
  new THREE.Vector3(),
]);
const satelliteLoS = new THREE.Line(losGeometry, losMaterial);
satellite.add(satelliteLoS);

//* Orbit setup

const orbitGroup = new THREE.Group();
scene.add(orbitGroup);

const curve_material = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.4,
  depthWrite: false,
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

let manualAnomaly = false;
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

orbitGroup.add(orbitPath);
orbitGroup.add(satellite);
orbitGroup.add(ellipse);

orbitGroup.rotation.x = Math.PI / 2;

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

//* Sattelite orbit position calculation

function pointOnOrbit(t) {
  const linearEccentricity = orbit.semiMajorAxis * orbit.eccentricity;
  const semiMinorAxis = Math.sqrt(
    Math.pow(orbit.semiMajorAxis, 2) - Math.pow(linearEccentricity, 2)
  );
  const ellipseCenterX = orbit.centerOfMass.x - linearEccentricity;
  const ellipseCenterY = orbit.centerOfMass.y;

  const meanAnomaly = t * Math.PI * 2;

  const eccentricAnomaly = newtonRhapson(meanAnomaly);

  const px = Math.cos(eccentricAnomaly) * orbit.semiMajorAxis + ellipseCenterX;
  const py = Math.sin(eccentricAnomaly) * semiMinorAxis + ellipseCenterY;

  return new THREE.Vector2(px, py);
}

//* Newton-Rhapson method

function newtonRhapson(meanAnomaly, maxIterations = 100) {
  const h = 0.0001; //step size
  const acceptableError = 0.00000001;
  let guess = meanAnomaly;

  for (let i = 0; i < maxIterations; i++) {
    let y = keplerEquation(guess, meanAnomaly, orbit.eccentricity);
    if (Math.abs(y) < acceptableError) {
      break;
    }
    //approx derivative using finite difference
    let slope =
      (keplerEquation(guess + h, meanAnomaly, orbit.eccentricity) - y) / h;
    let step = y / slope;
    //update next guess to where slope intersects x-axis
    guess -= step;
  }
  return guess;

  //* Kepler's equation: M = E - e * sin(E)

  //E: Eccentic Anomaly, e: eccentricity, M: Mean Anomaly
  function keplerEquation(E, M, e) {
    //Rearrange equation to find the E for which equation will return 0
    return M - E + e * Math.sin(E);
  }
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
  .onChange((value) => setTrueAnomaly(value))
  .onFinishChange(() => endManual());
gui
  .add(orbit, "ellipseResolution", 5, 200)
  .name("Resolution")
  .step(1)
  .onChange(() => drawEllipse());
gui.add(satelliteOptions, "speed", 0, 0.02);

//* True Anomaly

function setTrueAnomaly(value) {
  setSatellitePosition(value / 360);
  manualAnomaly = true;
}

function endManual() {
  time = orbit.trueAnomaly / 360;
  setSatellitePosition(time);
  manualAnomaly = false;
}

function setSatellitePosition(time) {
  satellitePosition = pointOnOrbit(time);
  satellite.position.x = satellitePosition.x;
  satellite.position.y = satellitePosition.y;
}

//* Wireframe intersection
const raycaster = new THREE.Raycaster();

//* Debug line

const debugGeom = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(),
  new THREE.Vector3(),
]);
const debugMaterial = new THREE.LineBasicMaterial({
  color: 0x8b0000,
  transparent: true,
  opacity: 0.5,
});
const debugLine = new THREE.Line(debugGeom, debugMaterial);
scene.add(debugLine);
const posAttrLine = debugLine.geometry.getAttribute("position");
let face = null;
const faceCol = new THREE.Color(Math.random() * 0xffffff);
const meshCol = wireGeometry.getAttribute("color");

//* Animation

function animate() {
  //earthMesh.rotation.y += 0.002;

  stats.begin();
  const worldOrigin = satellite.worldToLocal(new THREE.Vector3(0, 0, 0));
  // losGeometry.attributes.position.setXYZ(1, ...worldOrigin);
  // losGeometry.attributes.position.needsUpdate = true;

  if (!manualAnomaly) {
    time = (time + satelliteOptions.speed) % 1;
    setSatellitePosition(time);
  }
  satellite.lookAt(0, 0, 0);

  const satelliteRayPos = new THREE.Vector3(
    satellite.position.x,
    0,
    satellite.position.y
  );

  raycaster.set(new THREE.Vector3(0, 0, 0), satelliteRayPos.normalize());

  posAttrLine.setX(
    1,
    raycaster.ray.origin.x + raycaster.ray.direction.multiplyScalar(2).x
  );
  posAttrLine.setZ(
    1,
    raycaster.ray.origin.z + raycaster.ray.direction.multiplyScalar(2).z
  );
  posAttrLine.needsUpdate = true;

  const intersects = raycaster.intersectObject(earthWireframe);

  if (intersects.length > 0) {
    face = intersects[0].face;

    meshCol.setXYZ(face.a, faceCol.r, faceCol.g, faceCol.b);
    meshCol.setXYZ(face.b, faceCol.r, faceCol.g, faceCol.b);
    meshCol.setXYZ(face.c, faceCol.r, faceCol.g, faceCol.b);
    meshCol.needsUpdate = true;
  }

  renderer.render(scene, camera);

  stats.end();
}
