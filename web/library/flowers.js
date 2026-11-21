define.prop("flowers", (b, o) => {
  b.repeat(5,i=>{const x=Math.sin(i*3)*.55,z=Math.cos(i*3)*.55;b.cylinder({pos:[x,.32,z],scale:[.06,.64,.06],color:"#4d925b"});b.sphere({pos:[x,.66,z],scale:[.3,.22,.3],color:o.color??"#f2a78a"});});
});
