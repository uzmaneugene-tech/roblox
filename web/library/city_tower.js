define.location("city_tower", (w, o) => {
  const floors=o.floors??12;w.ground({texture:"concrete"});w.road([[-40,0,10],[40,0,10]],6);
  w.use("tower",{floors,width:12,depth:10});w.use("helipad",{pos:[-2,floors*3.4+.64,1],scale:.6});
  w.row("tree_oak",{from:[-15,0,6],to:[15,0,6],count:5});w.fog({near:55,far:155});
});
