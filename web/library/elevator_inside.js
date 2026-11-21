define.location("elevator_inside", (w, o) => {
  w.ground({texture:"concrete",scale:[.08,1,.08]});
  for(const k of [-1,1])w.box({pos:[k*3.9,2.4,0],scale:[.25,4.8,8],color:"#8395a4"});
  w.box({pos:[0,2.4,-4],scale:[8,4.8,.2],color:"#667e8d"});
  w.use("elevator",{"pos": [0, 0, -3.7]});
  w.text("1  2  3  4",{pos:[2.6,2,-3.78],scale:[1.2,.7,1]});
});
