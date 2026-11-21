define.building("garage", (b, o) => {
  const floors=o.floors??1, w=o.width??8, d=o.depth??6, c=o.color??"#82939e", h=3.4;
  if(!Number.isInteger(floors)||floors<1||floors>32||!(w>=4&&w<=60&&d>=4&&d<=60))throw Error("floors: 1–32; width/depth: 4–60");
  const box=(pos,scale,color,extra={})=>b.box({pos,scale,color,...extra});
  const glass=o.time==="day"?"#9acbd6":"#ffd48d";
  b.repeat(floors,i=>{const y=i*h, tone=c;
    box([0,y+h/2,0],[w,h,d],tone);box([0,y+.14,0],[w+.24,.28,d+.24],"#536478");
    for(const side of [-1,1]){for(const x of [-.34,0,.34])box([w*x,y+2,side*(d/2+.06)],[w*.21,1.24,.12],glass,{emissive:glass});
      for(const z of [-.26,.26])box([side*(w/2+.05),y+2,z*d],[.12,1.2,d*.24],glass,{emissive:glass});}});
  box([0,1.25,d/2+.19],[1.5,2.5,.23],"#34485a");
  box([0,h*floors+.12,0],[w+.55,.25,d+.55],"#4e606d");
  b.repeat(8,i=>box([0,.22+i*.34,d/2+.31],[w*.78,.31,.17],"#bfc6c7"));
  b.text("GARAGE",{pos:[0,h*floors-.24,d/2+.3],scale:[w*.62,.8,1],color:"#354d61"});
});
