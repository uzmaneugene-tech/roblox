// The CDN is preferred; the identical npm version is served locally if it is offline.
let T;
try{T=await Promise.race([import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Network timeout')),3500))])}catch{T=await import('/three/three.module.js')}
export function monitor(canvas){
  let renderer;
  if(canvas.getContext('webgl2',{antialias:true})){
    renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(270,480,false);
  }
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(50,9/16,.05,2000);
  scene.background=new T.Color(0x202a2a);scene.fog=new T.FogExp2(0x202a2a,.025);
  scene.add(new T.GridHelper(100,100,0x637663,0x3d4843),new T.HemisphereLight(0xffefcb,0x465650,2.2));
  const light=new T.DirectionalLight(0xffdfbb,2);light.position.set(-4,8,5);scene.add(light);
  function box(x,y,z,w,h,d,color){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));mesh.position.set(x,y,z);scene.add(mesh)}
  // A simple block character and pillars give the camera a subject and a sense of depth.
  box(0,2.15,0,1.4,1.4,.8,0x93b960);box(0,3.25,0,.9,.9,.85,0xe3c5a1);
  for(const sign of [-1,1]){box(sign*.38,.73,0,.65,1.45,.65,0x465968);box(sign*.95,2.1,0,.44,1.4,.6,0xc3b291)}
  for(let i=0;i<8;i++)for(const side of [-1,1])box(side*4,2,-i*4,1,4,1,0x50655b);
  // Software preview for mobile browsers or hosted Chromium without a GPU.
  // Project the same Three.js geometry with the same camera and paint back to front.
  function paint(){
    const ctx=canvas.getContext('2d');canvas.width=270;canvas.height=480;
    ctx.fillStyle='#202a2a';ctx.fillRect(0,0,270,480);camera.updateMatrixWorld();scene.updateMatrixWorld();
    const faces=[];
    scene.traverse(obj=>{
      if(!obj.isMesh)return;
      const geom=obj.geometry, pos=geom.attributes.position, idx=geom.index;
      for(let i=0;i<idx.count;i+=3){
        const pts=[0,1,2].map(n=>new T.Vector3().fromBufferAttribute(pos,idx.getX(i+n)).applyMatrix4(obj.matrixWorld).project(camera));
        if(pts.some(p=>p.z<=-1||p.z>=1))continue;
        faces.push({pts,z:pts.reduce((a,p)=>a+p.z,0)/3,color:obj.material.color.clone().multiplyScalar(.65+.07*Math.floor((i%36)/6)).getStyle()});
      }
    });
    for(const {pts,color} of faces.sort((a,b)=>b.z-a.z)){
      ctx.fillStyle=color;ctx.beginPath();pts.forEach((p,i)=>ctx[i?'lineTo':'moveTo']((p.x+1)*135,(1-p.y)*240));ctx.closePath();ctx.fill();
    }
  }
  return shot=>{camera.position.fromArray(shot.position);camera.rotation.set(...shot.rotation.map(T.MathUtils.degToRad),'XYZ');camera.fov=shot.fov;camera.updateProjectionMatrix();renderer?renderer.render(scene,camera):paint()};
}
