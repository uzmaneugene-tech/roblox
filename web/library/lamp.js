define.prop("lamp", (b, o) => {
  b.cylinder({"pos":[0,2.4,0],"scale":[0.23,4.8,0.23],"color":o.color ?? "#465763"});
  b.box({"pos":[0,4.8,0],"scale":[0.92,0.77,0.92],"color":o.time === "day" ? "#a7cfdb" : "#ffc980"});
  b.light("#ffca82",o.time==="night"?8:4,10,{pos:[0,4.5,0]});
});
