/////////////////////////////////////////////////////////////////////////
///// IMPORT
import './main.css'

import * as THREE from 'three'
import Stats from "three/examples/jsm/libs/stats.module";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI, { FunctionController } from 'lil-gui';

const gui = new GUI({width:180});
gui.domElement.id = 'gui';
gui.close();


// AudioContext の作成
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let AudioDataSet = false; // フラグ
let audioElement = null;
let audioSource = null;
let analyser = null;
let duration = 0;

/////////////////////////////////////////////////////////////////////////////////////
window.onload = function(){


const reader = new FileReader();

// mp3ファイルが読み込まれたら
function handleFileSelect(evt){
  const f = evt.srcElement;

  let input = evt.target;
  if (input.files.length == 0) {
    return;
  }

  const file = input.files[0];
  
  if (!file.type.match('audio.*')) {
    alert("音声ファイルを選択してください。");
    return;
  }
  
  reader.onload = () => {
    console.log( reader );
    AudioDataSet = true; // renderLoop用のフラグ

    audioElement = new Audio(reader.result); //データのファイルURLを入れる
    audioElement.crossOrigin = 'anonymous'; // CORS のために必要な場合があります
    audioSource = audioContext.createMediaElementSource(audioElement);
    //
    audioElement.addEventListener("loadeddata", () => {
      duration = Math.floor(audioElement.duration*1000000)/1000;
      document.getElementById("gpu-textB").innerHTML = Math.floor( Math.floor(audioElement.currentTime*1000000)/1000) + " / " + duration;
    });
    //
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 128; // ★ FFT サイズの設定
    // 音声の接続
    audioSource.connect(analyser);
    audioSource.connect(audioContext.destination);
  };

  reader.readAsDataURL(file);
}

const fileInput = document.getElementById('myfile');
fileInput.addEventListener('change', handleFileSelect);


// 排出するデータの数値の更新
let number = document.getElementById("num1").value;

document.getElementById("num1").addEventListener("input", function(event) {
  const value = event.target.value;
  console.log('入力された値:', value);
  number = value;
})

/////////////////////////////////////////////////////////////////////////
///// 
///// THREE.JS
///// 
///// 
/////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////
///// SCENE CREATION

const scene = new THREE.Scene()
scene.background = new THREE.Color('#eee');

/////////////////////////////////////////////////////////////////////////
///// RENDERER CONFIG

let PixelRation = 1; //PixelRatio
PixelRation = Math.min(window.devicePixelRatio, 2.0);
const renderer = new THREE.WebGLRenderer({
  canvas:document.getElementById("MyCanvas"),
  alpha:true,
  antialias: true,
});
renderer.setPixelRatio(PixelRation)
renderer.setSize(window.innerWidth, window.innerHeight) // Make it FullScreen

/////////////////////////////////////////////////////////////////////////
// STATS SET

const stats = new Stats();
stats
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.getElementById("stats").appendChild(stats.dom);
Object.assign(stats.dom.style, {
  'position': 'relative',
  'height': 'max-content',
  'width': 'min-content',
});

/////////////////////////////////////////////////////////////////////////
///// CAMERAS CONFIG

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000)
camera.position.set(0.0, 0.0, 140.0);
scene.add(camera)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enabled = false;
/////////////////////////////////////////////////////////////////////////
///// CREATE HELPER

const axesHelper = new THREE.AxesHelper(10);
axesHelper.position.set(0.0, -5.0, 0);
scene.add(axesHelper);

/////////////////////////////////////////////////////////////////////////
///// LineMesh(FFT)

const initPos = [];
//for (let i = 0; i < analyser.fftSize/2 ; i ++) { // analyser.fftSize/2 = 32
for (let i = 0; i < 128/2 ; i ++) { // ★ FFT サイズに応じて変更
  initPos.push(
    i,0,0
  );
}

const pointsGeometry = new THREE.BufferGeometry();
pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(initPos, 3));

const material = new THREE.MeshBasicMaterial({color: 0xFF0000});
const Line = new THREE.Line( pointsGeometry, material );
Line.position.set(-(128/4),0,0)
scene.add( Line );

/////////////////////////////////////////////////////////////////////////
///// LineMesh (Wave)

const initPosB = [];
//for (let i = 0; i < analyser.fftSize/2 ; i ++) { // analyser.fftSize/2 = 32
for (let i = 0; i < 128/2 ; i ++) {  // ★ FFT サイズに応じて変更
  initPosB.push(
    i,0,0
  );
}

const pointsGeometryB = new THREE.BufferGeometry();
pointsGeometryB.setAttribute('position', new THREE.Float32BufferAttribute(initPos, 3));

const materialB = new THREE.MeshBasicMaterial({color: 0x0000FF});
const LineB = new THREE.Line( pointsGeometryB, materialB );
LineB.position.set(-(128/4),-25,0);
scene.add( LineB );


/////////////////////////////////////////////////////////////////////////
//// RENDER LOOP FUNCTION

const musicTextB = document.getElementById("gpu-textB")

let cnt = 0;
let JsonData = [];

function renderLoop() {
    stats.begin();//STATS計測

    //
    // データの生成
    //

    if(AudioDataSet){ 

    if(cnt%number == 0){ // default = 10

      if (!audioElement.paused) {
        // データの収集
        const bufferLength = analyser.frequencyBinCount;
        //
        const dataArray = new Uint8Array(bufferLength);
        const dataArrayB = new Uint8Array(bufferLength);
        //★
        analyser.getByteFrequencyData(dataArray); // FFTの抽出
        analyser.getByteTimeDomainData(dataArrayB); // 波形/オシロスコープの抽出
    
        console.log("" + Math.floor( Math.floor(audioElement.currentTime*1000000)/1000));
        musicTextB.innerHTML = Math.floor( Math.floor(audioElement.currentTime*1000000)/1000) + " / " + duration;

        let FFTArray =[];
        let WAVArray =[];
        let timeArry = {}; // 連想配列
        //let waveArry = {}; // 連想配列

        timeArry['t'] =Math.floor( Math.floor(audioElement.currentTime*1000000)/1000);

        for(var i = 0; i < bufferLength; i++) {

          initPos[3*i+1] = dataArray[i] / 255 * 25; // fft
          initPosB[3*i+1] = dataArrayB[i] / 255 * 25; //wave

          //console.log(dataArray[i] / 128);
          FFTArray.push( Math.round(( dataArray[i] *0.00392157 ) * 1000 ) / 1000 ); //fft
          WAVArray.push( Math.round(( dataArrayB[i] *0.00392157 ) * 1000 ) / 1000 ); //wave

          // 波形データ 0 ~ 255が格納されている。 // (i * 44100 / 2048)Hzの波形データ 0 ~ 255が格納されている。
        }
        // F = FFT
        timeArry['F'] = FFTArray;
        timeArry['W'] = WAVArray;
        //
        JsonData.push(timeArry)
        
        //Meshの更新
        pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(initPos, 3));
        pointsGeometryB.setAttribute('position', new THREE.Float32BufferAttribute(initPosB, 3));
      }

    }
    }

    renderer.render(scene, camera) // render the scene using the camera

    cnt ++;

    requestAnimationFrame(renderLoop) //loop the render function
    stats.end();//stats計測 END
}

renderLoop() //start rendering


/////////////////////////////////////////////////////////////////////////
///// MAKE EXPERIENCE FULL SCREEN

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  //
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0))
  renderer.setSize(window.innerWidth, window.innerHeight) // make it full screen  
})

/////////////////////////////////////////////////////////////////////////
///// HTML Button

document.getElementById("Play-Btn").addEventListener("click", () => function(){ 
  // MP3 ファイルの再生
  audioContext.resume().then(() => {
    audioElement.play();
    // データの初期化
    JsonData = [];
  });

}());

document.getElementById("Stop-Btn").addEventListener("click", () => function(){ 
  // MP3 ファイルの停止
  audioContext.resume().then(() => {
    audioElement.pause();
    audioElement.currentTime = 0;
  });

}());


document.getElementById("Json").addEventListener("click", () => function(){ 
  // Jsonデータの排出
  const jsonData = JSON.stringify(JsonData);
  
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'data.json';
  a.click();
  
  URL.revokeObjectURL(url);
}());


/////////////////////////////////////////////////////////////////////////
///// lil-gui

const params = {						  
  myVisibleBoolean1: true,
  myVisibleBoolean2: false,
};
	
gui.add( params, 'myVisibleBoolean1').name('helper').listen()
.listen().onChange( function( value ) { 
  if( value == true ){
    axesHelper.visible = value;
  }else{
    axesHelper.visible = value;
  }
});
gui.add( params, 'myVisibleBoolean2').name('camera_control').listen()
.listen().onChange( function( value ) { 
  if( value == true ){
    controls.enabled = value;
  }else{
    controls.enabled = value;
  }
});




};