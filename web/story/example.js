export const example = `story({ title: "The Summer Party Game", aspect: "9:16", fps: 30 });
const jin = character("Jin");
const kai = character("Kai", {outfit:{shirt:"#357971"}});

scene("Summer Party Game", { location: "basketball_court", time: "dusk", duration: 27 }, s => {
  s.place(kai, [-4, .1, 1]);
  s.place(jin, [0, 0.1, 3]);
  s.prop("bench", [4, 0.1, 7.3], { color: "#c58f68" });

  s.do(0, jin, "idle");
  s.cam(0, "wide", { target: jin, from: [8, 9, 24], look: [0, 3.1, 0] });
  s.narrate(.1, "Summer arrived right on time", { speed: 1 });

  s.do(2.25, jin, "wave");
  s.cam(2.55, "close_up", { target: jin, ease: .62 });
  s.say(2.9, jin, "Hello everyone", { speed: .88 });

  s.do(5.1, jin, "walk_to", [4, 0.1, 3]);
  s.cam(5.08, "tracking", { target: jin, side: "left", ease: .75 });
  s.narrate(5.65, "Jin crosses the court", { speed: 1.45 });

  s.do(8.36, jin, "turn_to", 0);
  s.do(8.95, jin, "jump");
  s.cam(8.95, "low_angle", { target: jin, ease: .65 });
  s.say(9.03, jin, "Up we go", { speed: 1.7 });

  s.do(11, jin, "shout");
  s.cam(10.6, "medium", { target: jin, from: [5.4, 4.8, 18], look: [4, 3.25, 3], cut: true });
  s.say(11.22, jin, "GAME TIME!", { speed: 1.43 });
  s.do(13, jin, "emote", "shocked");

  s.do(15, jin, "shoot_ball", [13.31, 6.67, 0]);
  s.cam(14.8, "over_shoulder", { target: jin, from: [-7, 7.2, 13], look: [8.4, 4.9, 1.5], cut: true });
  s.narrate(15.55, "Nothing but net", { speed: 1.6 });
  s.do(17.4, jin, "celebrate");
  s.do(19.75, jin, "fall");

  s.cam(21.6, "static", { from: [9.3, 4.5, 17.0], look: [4, 2.45, 7.4], cut: true });
  s.do(21.65, jin, "run_to", [4, 0.1, 7.3]);
  s.do(24.3, jin, "sit");
  s.cam(23,"two_shot",{targets:[jin,kai]});
  s.cam(24,"group",{targets:[jin,kai]});
  s.cam(25,"orbit",{target:jin});
  s.cam(26,"crane_up",{target:jin});
  s.say(24.7, jin, "A well earned rest", { speed: 1.5 });
});`;
