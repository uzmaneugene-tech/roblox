define.location("rooftop", (w, o) => {
  w.ground({texture:"concrete",scale:[.34,1,.28]});
  w.use("rooftop_pool",{"pos": [-6, 0, 1]});
  w.use("helipad",{"pos": [7, 0, -2]});
  w.use("bench",{"pos": [0, 0, 6]});
  w.use("stairs",{"pos": [9, 0, 7]});
  w.row("fence_metal",{from:[-14,0,-13],to:[14,0,-13],count:8});
});
