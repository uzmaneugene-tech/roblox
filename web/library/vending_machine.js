define.prop("vending_machine", (b, o) => {
  b.box({"pos":[0,1.65,0],"scale":[1.95,3.3,1.35],"color":o.color ?? "#6499af"});
  b.box({"pos":[-0.28,2,0.69],"scale":[0.98,1.75,0.09],"color":"#92cedb"});
  b.box({"pos":[0.65,1.8,0.74],"scale":[0.36,0.48,0.09],"color":"#29394b"});
  b.box({"pos":[0,0.5,0.74],"scale":[1.22,0.35,0.1],"color":"#374851"});
  b.text(o.text??"SODA",{pos:[0,3,.73],scale:[1.6,.43,1]});
});
