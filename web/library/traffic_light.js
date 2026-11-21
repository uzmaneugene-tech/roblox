define.prop("traffic_light", (b, o) => {
  b.box({"pos":[0,2,0],"scale":[0.22,4,0.22],"color":o.color ?? "#475769"});
  b.box({"pos":[0,4,0],"scale":[0.94,2.1,0.55],"color":"#324053"});
  b.sphere({"pos":[0,4.65,0.32],"scale":[0.4,0.4,0.14],"color":"#e7615f"});
  b.sphere({"pos":[0,4.04,0.32],"scale":[0.4,0.4,0.14],"color":"#ffc56b"});
  b.sphere({"pos":[0,3.4300000000000006,0.32],"scale":[0.4,0.4,0.14],"color":"#60c188"});
});
