define.prop("money_stack", (b, o) => {
  b.repeat(5,i=>b.box({pos:[0,.09+i*.13,0],scale:[1.4,.12,.72],color:i%2?"#70a985":"#9cc49d"}));
  b.box({"pos":[0,0.39,0],"scale":[0.3,0.81,0.76],"color":o.color ?? "#ead4a1"});
});
