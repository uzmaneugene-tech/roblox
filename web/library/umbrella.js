define.prop("umbrella", (b, o) => {
  b.cylinder({pos:[0,0.84,0],scale:[0.055,1.7,0.055],color:o.color ?? "#58546c"});
  b.cone({pos:[0,1.7,0],scale:[1.6,0.45,1.6],color:"#9780e1"});
});
