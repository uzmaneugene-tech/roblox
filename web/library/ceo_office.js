define.location("ceo_office", (w, o) => {
  w.ground({texture:"concrete",color:"#b99174"});w.box({pos:[0,3,-7],scale:[19,6,.4],color:"#4b687a"});
  w.repeat(4,i=>w.box({pos:[i*3-4.5,3.4,-6.73],scale:[2.8,3,.1],color:"#98c9d7",emissive:"#997c66"}));
  w.use("desk",{"pos": [0, 0, -2], "scale": 1.4});
  w.use("chair",{"pos": [0, 0, -4]});
  w.use("shelf",{"pos": [-7, 0, -5]});
  w.use("briefcase",{"pos": [1, 2.77, -2]});
  w.use("sofa",{"pos": [6, 0, 1]});
});
