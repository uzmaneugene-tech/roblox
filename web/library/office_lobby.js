define.location("office_lobby", (w, o) => {
  w.ground({texture:"concrete",color:"#ced0bf"});w.box({pos:[0,3,-7],scale:[22,6,.4],color:"#769496"});
  w.use("elevator",{"pos": [3, 0, -6.6]});
  w.use("desk",{"pos": [-4, 0, -4]});
  w.use("sofa",{"pos": [-7, 0, 0]});
  w.use("bush",{"pos": [7, 0, -5]});
  w.text("RECEPTION",{pos:[-4,3.6,-6.72],scale:[5,.94,1]});
});
