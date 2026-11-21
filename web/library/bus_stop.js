define.prop("bus_stop", (b, o) => {
  b.box({"pos":[-2,2,0],"scale":[0.2,4,0.2],"color":"#486678"});
  b.box({"pos":[2,2,0],"scale":[0.2,4,0.2],"color":"#486678"});
  b.box({"pos":[0,4,0],"scale":[5,0.26,2.2],"color":"#528aa3"});
  b.box({"pos":[0,2,-0.58],"scale":[4,2.7,0.1],"color":"#a1cfd1"});
  b.use("bench");
});
