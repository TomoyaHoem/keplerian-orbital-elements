import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import * as dat from "dat.gui";

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
scene.add(ellipse);

const gui = new dat.GUI();

const orbit = {
  orbit: 3,
};

gui
  .add(orbit, "orbit", 2, 10)
  .onChange((value) => changeRadius(ellipse, value));

function changeRadius(ellipse, value) {
  const curve = new THREE.EllipseCurve(
    0,
    0, // ax, aY
    value,
    2, // xRadius, yRadius
    0,
    2 * Math.PI, // aStartAngle, aEndAngle
    false, // aClockwise
    0 // aRotation
  );

  const points = curve.getPoints(50);
  const curve_geometry = new THREE.BufferGeometry().setFromPoints(points);
  ellipse.geometry = curve_geometry;
}

function animate() {
  //earthMesh.rotation.y += 0.002;

  renderer.render(scene, camera);
}
