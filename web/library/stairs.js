define.prop("stairs", (b, o) => {
  b.repeat(10,i=>b.box({pos:[0,(i+1)*.13,-i*.42],scale:[2.6,(i+1)*.26,.46],color:o.color??"#869ba9"}));
});
