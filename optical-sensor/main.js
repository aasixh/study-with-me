/*    
    Copyright (C) Ashish Ranjan
    
    This file is part of Physics Class 2026 - SVIET
    Instructor - Aashish Sharma (SVIET)

    Optical Sensor is free simulation: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 2 of the License, or
    (at your option) any later version.

    Optical Sensor is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Optical Sensor. If not, see <http://www.gnu.org/licenses/>.
*/

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/+esm";

const canvas = document.querySelector("#viewport");
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setClearColor(0x080b10,1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42,1,.1,100);
camera.position.set(0,4.6,12);
camera.lookAt(0,1,0);

scene.add(new THREE.AmbientLight(0xffffff,.72));
const key = new THREE.DirectionalLight(0xffffff,2.0);
key.position.set(-4,7,5); scene.add(key);

const metal = (color,rough=.55,metalness=.25) =>
  new THREE.MeshStandardMaterial({color,roughness:rough,metalness});

function addBox(x,y,z,w,h,d,color){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),metal(color));
  m.position.set(x,y,z); scene.add(m); return m;
}

// Optical bench
addBox(0,-.72,0,15,.35,4.4,0x202731);
addBox(0,-.49,0,13.8,.10,.28,0x667180);

// Source enclosure
addBox(-5,1.1,0,1.65,1.65,1.4,0x303946);
const sourceLens=addBox(-4.1,1.1,.72,.18,.72,.08,0xe7eef8);
const sourceLight=new THREE.PointLight(0xe7eef8,9,6);
sourceLight.position.set(-4.05,1.1,1);scene.add(sourceLight);

// Target
const target=addBox(.6,1.35,0,1.65,2.7,.95,0x596473);
const targetFace=addBox(.6,1.35,.51,1.28,2.25,.035,0x7d8794);

// Detector
addBox(5,1.1,0,1.65,1.65,1.4,0x303946);
const detectorFace=addBox(4.1,1.1,.72,.18,.72,.08,0xe7eef8);
const detectorLight=new THREE.PointLight(0xffffff,1.5,4);
detectorLight.position.set(4.05,1.1,1);scene.add(detectorLight);

// Processing modules
addBox(3.3,-.05,0,1.35,.72,1.15,0x344252);
addBox(5.0,-.05,0,1.35,.72,1.15,0x3c4b5b);
addBox(6.7,-.05,0,1.35,.72,1.15,0x465669);

function makeLabel(text,x,y){
  const c=document.createElement("canvas"); c.width=512;c.height=96;
  const ctx=c.getContext("2d");ctx.fillStyle="#e8eef6";ctx.font="700 25px system-ui";ctx.textAlign="center";ctx.fillText(text,256,58);
  const tex=new THREE.CanvasTexture(c);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
  sp.scale.set(2.25,.42,1);sp.position.set(x,y,.9);scene.add(sp);
}
makeLabel("LIGHT SOURCE",-5,2.4);
makeLabel("TARGET",.6,3.0);
makeLabel("PHOTODETECTOR",5,2.4);
makeLabel("AMPLIFIER",3.3,.55);
makeLabel("ADC",5,.55);
makeLabel("OUTPUT",6.7,.55);

// Photon field
const N=360;
const positions=new Float32Array(N*3);
const velocities=new Float32Array(N);
for(let i=0;i<N;i++){
  positions[i*3]=-4.0;
  positions[i*3+1]=1.1+(Math.random()-.5)*.62;
  positions[i*3+2]=.78+(Math.random()-.5)*.08;
  velocities[i]=.65+Math.random()*.85;
}
const pgeo=new THREE.BufferGeometry();
pgeo.setAttribute("position",new THREE.BufferAttribute(positions,3));
const photonMat=new THREE.PointsMaterial({color:0xf2f6fc,size:.055,transparent:true,opacity:.9});
const photons=new THREE.Points(pgeo,photonMat);scene.add(photons);

// Reflected beam: source -> target -> detector
const beamGeo=new THREE.BufferGeometry();
beamGeo.setAttribute("position",new THREE.Float32BufferAttribute([
  -4,1.1,.82,.1,1.1,.82,.1,1.1,.82,4.05,1.1,.82
],3));
const beam=new THREE.LineSegments(beamGeo,new THREE.LineBasicMaterial({color:0xc5d8ed,transparent:true,opacity:.42}));
scene.add(beam);

// State
let intensity=70,distance=55,gain=4,wavelength=650,paused=false,time=0;
const history=[];

const $=s=>document.querySelector(s);
function calc(){
  const distanceFactor=Math.max(.16,1-distance/125);
  const wavelengthFactor=.65+Math.max(0,1-Math.abs(wavelength-700)/400)*.35;
  const optical=intensity*distanceFactor*wavelengthFactor;
  const current=optical*.48;
  const amplified=current*gain;
  const adc=Math.min(4095,Math.round(amplified*40));
  const measurement=adc/4095*100;
  return {optical,current,amplified,adc,measurement};
}
function update(){
  const d=calc();
  $("#intensityOut").textContent=`${intensity}%`;
  $("#distanceOut").textContent=`${distance} cm`;
  $("#gainOut").textContent=`${gain}×`;
  $("#waveOut").textContent=`${wavelength} nm`;
  $("#optical").textContent=`${d.optical.toFixed(1)}%`;
  $("#current").textContent=`${d.current.toFixed(1)} µA`;
  $("#amplified").textContent=`${d.amplified.toFixed(1)} µA`;
  $("#adc").textContent=`${d.adc} / 4095`;
  $("#measurement").textContent=`${d.measurement.toFixed(1)}%`;
  const vals=[d.optical,d.current/1.5,d.amplified/3,d.adc/40.95,d.measurement];
  vals.forEach((v,i)=>$(`#bar${i+1}`).style.width=`${Math.max(0,Math.min(100,v))}%`);
  sourceLight.intensity=2+intensity/5;
  detectorLight.intensity=1+d.measurement/20;
  const tx=.6+(distance-55)*.035;
  target.position.x=tx;targetFace.position.x=tx;
  const a=beamGeo.attributes.position.array;
  a[3]=tx-.82;a[9]=tx+.82;a[6]=tx-.82;
  beamGeo.attributes.position.needsUpdate=true;
}
function resize(){
  const r=canvas.getBoundingClientRect();
  renderer.setSize(r.width,r.height,false);
  camera.aspect=r.width/r.height;camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);resize();

["intensity","distance","gain","wavelength"].forEach(id=>{
  $(`#${id}`).addEventListener("input",e=>{
    const v=+e.target.value;
    if(id==="intensity")intensity=v;
    if(id==="distance")distance=v;
    if(id==="gain")gain=v;
    if(id==="wavelength")wavelength=v;
    update();
  });
});
$("#pauseBtn").addEventListener("click",()=>{
  paused=!paused;
  $("#pauseBtn").textContent=paused?"Resume":"Pause";
  $("#simStatus").textContent=paused?"● PAUSED":"● LIVE";
});
$("#resetBtn").addEventListener("click",()=>{
  intensity=70;distance=55;gain=4;wavelength=650;paused=false;
  $("#intensity").value=70;$("#distance").value=55;$("#gain").value=4;$("#wavelength").value=650;
  $("#pauseBtn").textContent="Pause";$("#simStatus").textContent="● LIVE";update();
});

const scope=$("#scope"),ctx=scope.getContext("2d");
function drawScope(signal){
  const w=scope.clientWidth*devicePixelRatio,h=scope.clientHeight*devicePixelRatio;
  if(scope.width!==w||scope.height!==h){scope.width=w;scope.height=h}
  ctx.clearRect(0,0,w,h);
  ctx.strokeStyle="rgba(255,255,255,.07)";ctx.lineWidth=1;
  for(let x=0;x<w;x+=w/10){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}
  for(let y=0;y<h;y+=h/4){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  history.push(signal);if(history.length>220)history.shift();
  ctx.strokeStyle="#dce7f5";ctx.lineWidth=2;ctx.beginPath();
  history.forEach((v,i)=>{const x=i/(Math.max(1,history.length-1))*w;const y=h-(.12+.76*v)*h;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
  ctx.stroke();
}

function animate(){
  requestAnimationFrame(animate);time+=.016;
  const a=pgeo.attributes.position.array;
  const speedScale=Math.max(.15,intensity/70);
  for(let i=0;i<N;i++){
    if(!paused)a[i*3]+=velocities[i]*.026*speedScale;
    if(a[i*3]>.05){a[i*3]=-4.0;a[i*3+1]=1.1+(Math.random()-.5)*.62}
    a[i*3+1]+=Math.sin(time*3+i)*.0007;
  }
  pgeo.attributes.position.needsUpdate=true;
  const d=calc();
  drawScope(Math.min(1,(d.measurement/100)*(.84+.16*Math.sin(time*9))));
  scene.rotation.y=Math.sin(time*.13)*.018;
  renderer.render(scene,camera);
}
update();animate();
