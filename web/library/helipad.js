define.prop("helipad", (b, o) => {
  b.cylinder({"pos":[0,0.08,0],"scale":[8,0.15,8],"color":o.color ?? "#526376"});
  b.box({"pos":[-1.1,0.18,0],"scale":[0.4,0.06,3],"color":"#f8dda0"});
  b.box({"pos":[1.1,0.18,0],"scale":[0.4,0.06,3],"color":"#f8dda0"});
  b.box({"pos":[0,0.18,0],"scale":[2.2,0.06,0.36],"color":"#f8dda0"});
});
