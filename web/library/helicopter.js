define.prop("helicopter", (b, o) => {
  b.sphere({"pos":[0,1.7,0],"scale":[2.38,2.24,3.7],"color":o.color ?? "#6499af"});
  b.sphere({"pos":[0,1.88,1.3],"scale":[2,1.57,1.6],"color":"#91c8d4"});
  b.box({"pos":[0,1.82,-2.75],"scale":[0.55,0.61,3.7],"color":o.color ?? "#6499af"});
  b.box({"pos":[0,2.8,-4.15],"scale":[0.21,1.93,0.84],"color":o.color ?? "#6499af"});
  b.box({"pos":[0,3.4,0],"scale":[7.4,0.12,0.29],"color":"#354455"});
  b.box({"pos":[0,3.38,0],"scale":[0.3,0.12,6.4],"color":"#354455"});
  b.box({"pos":[-0.86,0.27,0],"scale":[0.17,0.18,3.2],"color":"#536473"});
  b.box({"pos":[0.86,0.27,0],"scale":[0.17,0.18,3.2],"color":"#536473"});
});
