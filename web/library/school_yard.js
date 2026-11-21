define.location("school_yard", (w, o) => {
  w.ground({texture:"grass"});w.path([[-16,0,5],[16,0,5]],2.4);
  w.use("school",{"pos": [0, 0, -12]});
  w.use("bus",{"pos": [12, 0, 3]});
  w.row("bench",{from:[-9,0,0],to:[6,0,0],count:4});w.row("tree_pine",{from:[-16,0,-9],to:[-16,0,9],count:4});
});
