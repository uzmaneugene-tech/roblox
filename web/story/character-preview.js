import {styleLineup} from './lineup.js';
import { expressions } from './registry.js';

const defaultCharacter = {id:'jin',name:'Jin',outfit:{}};
let models = [defaultCharacter];
let refresh;

export function setPreviewCharacters(characters) {
  models = characters.length ? characters : [defaultCharacter];
  refresh?.();
}

export async function startCharacterPreview() {
  const { createAvatarView } = await import('./avatar-view.js');
  styleLineup();
  const canvas = document.getElementById('story-avatar');
  const view = createAvatarView(canvas);
  const character = document.getElementById('story-character');
  const angle = document.getElementById('story-angle');
  const expression = document.getElementById('story-expression');
  expression.replaceChildren(...expressions.map(value=>new Option(value[0].toUpperCase()+value.slice(1),value)));
  function draw() {
    view.show(models.find(item=>item.id===character.value) ?? models[0],angle.value,expression.value);
    canvas.dataset.ready = 'true';
  }
  refresh = () => {
    const selected = character.value;
    character.replaceChildren(...models.map(item=>new Option(item.name,item.id)));
    if (models.some(item=>item.id===selected)) character.value=selected;
    draw();
  };
  for(const control of [character, angle, expression]) control.addEventListener('change',draw);
  refresh();
}
