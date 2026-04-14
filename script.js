// Styling Data
const TYPE_COLORS={normal:'#A8A77A',fire:'#EE8130',water:'#6390F0',electric:'#F7D02C',grass:'#7AC74C',ice:'#96D9D6',fighting:'#C22E28',poison:'#A33EA1',ground:'#E2BF65',flying:'#A98FF3',psychic:'#F95587',bug:'#A6B91A',rock:'#B6A136',ghost:'#735797',dragon:'#6F35FC',dark:'#705848',steel:'#B7B7CE',fairy:'#D685AD'};
const TYPE_TEXT={normal:'#FFFFFF',fire:'#FFFFFF',water:'#FFFFFF',electric:'#2C3E50',grass:'#FFFFFF',ice:'#2C3E50',fighting:'#FFFFFF',poison:'#FFFFFF',ground:'#2C3E50',flying:'#FFFFFF',psychic:'#FFFFFF',bug:'#FFFFFF',rock:'#FFFFFF',ghost:'#FFFFFF',dragon:'#FFFFFF',dark:'#FFFFFF',steel:'#2C3E50',fairy:'#FFFFFF'};

// Game config
const TOTAL=898, ROUNDS=10;
let rounds=[], current=0, score=0, results=[], answered=false;

// Utilities
function randId(exclude=[]){let id;do{id=Math.floor(Math.random()*TOTAL)+1;}while(exclude.includes(id));return id;}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

// API & Data Prep (Untouched Logic)
async function fetchPoke(id){const r=await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);return r.json();}

async function buildRound(mainId, pool) {
  const main = await fetchPoke(mainId);
  const types = main.types.map(t => t.type.name);
  const abilities = main.abilities.map(a => a.ability.name);
  const sprite = main.sprites.front_default || '';
  
  const qType = Math.random() < 0.5 ? 'type' : 'ability';
  let choices = [];
  let imposterVal = '';

  if (qType === 'type') {
    let realTypes = [...types];
    const allTypes = ['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
    const possibleImposters = allTypes.filter(t => !types.includes(t));
    imposterVal = possibleImposters[Math.floor(Math.random() * possibleImposters.length)];

    let realPool = [...realTypes, ...abilities]; 
    let selectedReal = [];
    
    for (let item of realPool) {
      if (selectedReal.length < 3 && !selectedReal.includes(item)) { selectedReal.push(item); }
    }

    choices = shuffle([...selectedReal, imposterVal]);
  } else {
    let realAbilities = [...abilities];
    const poolAbilities = [...new Set(pool.flatMap(p => p.abilities.map(a => a.ability.name)))];
    const possibleImposters = poolAbilities.filter(a => !abilities.includes(a));
    
    imposterVal = possibleImposters.length > 0 ? possibleImposters[Math.floor(Math.random() * possibleImposters.length)] : 'Sturdy'; 

    let realPool = [...realAbilities, ...types];
    let selectedReal = [];

    for (let item of realPool) {
      if (selectedReal.length < 3 && !selectedReal.includes(item)) { selectedReal.push(item); }
    }
    choices = shuffle([...selectedReal, imposterVal]);
  }

  return { main, types, abilities, sprite, qType, correctVal: imposterVal, choices: choices };
}

// Game Flow
async function startGame() {
  document.getElementById('results-screen').style.display = 'none';
  document.getElementById('quiz-area').style.display = 'none';
  document.getElementById('loading-screen').style.display = 'block';
  document.getElementById('progress-bar').style.width = '0%';
  
  rounds = []; current = 0; score = 0; results = []; answered = false;

  const ids=[]; while(ids.length<ROUNDS) ids.push(randId(ids));
  const poolIds=[]; while(poolIds.length<8) poolIds.push(randId([...ids,...poolIds]));
  const pool = await Promise.all(poolIds.map(fetchPoke));
  
  for(let i=0; i<ROUNDS; i++) rounds.push(await buildRound(ids[i], pool));
  
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('quiz-area').style.display = 'block';
  showRound();
}

function showRound() {
  answered = false;
  document.getElementById('poke-card').className = '';
  document.getElementById('feedback-box').style.display = 'none';
  document.getElementById('feedback-box').className = '';
  document.getElementById('continue-btn').style.display = 'none';

  const r = rounds[current];
  document.getElementById('poke-num').textContent = '#' + r.main.id.toString().padStart(3, '0');
  document.getElementById('poke-name').textContent = r.main.name;
  document.getElementById('q-poke-name').textContent = r.main.name.charAt(0).toUpperCase() + r.main.name.slice(1);
  document.getElementById('sprite').src = r.sprite;

  const typeRow = document.getElementById('type-row');
  typeRow.innerHTML = '';
  r.types.forEach(t => {
    const b = document.createElement('span');
    b.className = 'tbadge';
    b.textContent = t;
    b.style.background = TYPE_COLORS[t] || '#A8A77A';
    b.style.color = TYPE_TEXT[t] || '#FFFFFF';
    typeRow.appendChild(b);
  });
  
  document.getElementById('ability-val').textContent = r.abilities.join(', ');

  typeRow.style.visibility = 'hidden';
  document.getElementById('ability-row').style.visibility = 'hidden';

  const choicesEl = document.getElementById('choices');
  choicesEl.innerHTML = '';
  r.choices.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'choice';
    btn.textContent = c;
    btn.onclick = () => pick(c, r);
    choicesEl.appendChild(btn);
  });

  // Update Progress
  document.getElementById('progress-bar').style.width = ((current / ROUNDS) * 100) + '%';
  document.getElementById('round-label').textContent = (current + 1) + ' / ' + ROUNDS;
}

function pick(chosen, r) {
  if(answered) return;
  answered = true;

  document.getElementById('type-row').style.visibility = 'visible';
  document.getElementById('ability-row').style.visibility = 'visible';

  const isCorrect = (chosen === r.correctVal);
  
  results.push({ name: r.main.name, sprite: r.sprite, correct: isCorrect, chosen, answer: r.correctVal, qType: r.qType });
  if(isCorrect) score++;

  document.getElementById('poke-card').className = isCorrect ? 'correct-card' : 'wrong-card';

  document.querySelectorAll('.choice').forEach(btn => {
    btn.disabled = true;
    const v = btn.textContent;
    if(v === r.correctVal) btn.classList.add('correct');
    else if(v === chosen) btn.classList.add('wrong');
    else btn.classList.add('dim');
  });

  const fb = document.getElementById('feedback-box');
  fb.className = isCorrect ? 'win' : 'lose';
  document.getElementById('feedback-title').textContent = isCorrect ? 'Spot on!' : 'Not quite!';
  document.getElementById('feedback-detail').textContent = isCorrect
    ? `"${r.correctVal}" is the fake ${r.qType} for ${r.main.name}.`
    : `"${chosen}" is real. The imposter was "${r.correctVal}".`;
  fb.style.display = 'block';

  const btn = document.getElementById('continue-btn');
  const isLast = (current === ROUNDS - 1);
  
  if(isLast) {
    btn.className = 'to-results';
    document.getElementById('btn-sprite').style.display = 'none';
    document.getElementById('btn-label').textContent = 'All done!';
    document.getElementById('btn-name').textContent = 'See Results';
    document.getElementById('btn-arrow').textContent = '→';
  } else {
    const next = rounds[current+1];
    btn.className = 'to-next';
    const bsprite = document.getElementById('btn-sprite');
    bsprite.style.display = 'block';
    bsprite.src = next.sprite;
    document.getElementById('btn-label').textContent = 'Next up';
    document.getElementById('btn-name').textContent = next.main.name;
    document.getElementById('btn-arrow').textContent = '→';
  }
  btn.style.display = 'block';
}

function advance() {
  current++;
  if(current >= ROUNDS) { showResults(); return; }
  showRound();
}

function showResults() {
  document.getElementById('quiz-area').style.display = 'none';
  document.getElementById('progress-bar').style.width = '100%';
  document.getElementById('round-label').textContent = '10 / 10';
  
  const pct = Math.round((score / ROUNDS) * 100);
  const lbl = score <= 3 ? 'Keep Practicing!' : score <= 6 ? 'Good Effort!' : score <= 9 ? 'Great Work!' : 'Pokémon Master!';
  
  document.getElementById('results-score').textContent = score + ' / ' + ROUNDS;
  document.getElementById('results-label').textContent = pct + '% — ' + lbl;
  
  const bd = document.getElementById('results-breakdown');
  bd.innerHTML = '';
  
  results.forEach(r => {
    const div = document.createElement('div');
    div.className = 'rb-item';
    const statusClass = r.correct ? 'ok' : 'ng';
    const statusText = r.correct ? 'Correct' : `Wrong (Was ${r.answer})`;
    
    div.innerHTML = `
      <img class="rb-sprite" src="${r.sprite}" alt="${r.name}"/>
      <div class="rb-info">
        <div class="rb-name">${r.name}</div>
        <div class="rb-result ${statusClass}">${statusText}</div>
      </div>
    `;
    bd.appendChild(div);
  });
  
  document.getElementById('results-screen').style.display = 'block';
}

// Boot the game
startGame();