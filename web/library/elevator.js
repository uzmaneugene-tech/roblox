define.prop("elevator", (b, o) => {
  b.box({"pos":[-1.68,2.2,0],"scale":[0.3,4.4,0.65],"color":"#627789"});
  b.box({"pos":[1.68,2.2,0],"scale":[0.3,4.4,0.65],"color":"#627789"});
  b.box({"pos":[0,4.36,0],"scale":[3.65,0.45,0.69],"color":"#627789"});
  b.box({pos:[-0.77,2.05,0],scale:[1.49,4,.25],slide:[-1.39,0,0],color:"#afc3cd"});
  b.box({pos:[0.77,2.05,0],scale:[1.49,4,.25],slide:[1.39,0,0],color:"#afc3cd"});
  b.text(String(o.floor??1),{pos:[0,4.4,.37],scale:[1.05,.43,1],color:"#40586e"});
});
