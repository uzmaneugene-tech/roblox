define.animation("salute", (rig,t,o)=>{rig.armR.rotation.z=2.4*Math.min(1,t*4);rig.head.rotation.y=.18*Math.sin(t*3);});
