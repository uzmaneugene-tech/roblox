define.prop("escalator", (b, o) => {
  b.repeat(10,i=>b.box({pos:[0,(i+1)*.13,-i*.42],scale:[2.6,(i+1)*.26,.46],color:o.color??"#869ba9"}));
  b.box({"pos":[-1.4,1.9,-1.89],"scale":[0.14,0.24,4.76],"color":"#456571","rot":[0.55,0,0]});
  b.box({"pos":[1.4,1.9,-1.89],"scale":[0.14,0.24,4.76],"color":"#456571","rot":[0.55,0,0]});
});
