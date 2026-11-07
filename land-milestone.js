// Persistent, player-owned Land exploration for the playable-Lands milestone.
function installLandMilestone(api){
 'use strict';
 const {playerBy,esc,showToast,render}=api;
 const getSession=api.getSession;
 const saveQuietly=()=>{try{localStorage.setItem('sburb-session-save-v1',JSON.stringify(getSession()))}catch(_){}};
 const makeLocations=land=>{
  const names=[land.consorts.settlement,'The Ribbon Path','Wayfinder Archive',...land.landmarks,'Supply Cache',`${land.environment} Relay`];
  const unique=[];names.forEach(name=>{if(!unique.includes(name))unique.push(name)});
  const ids=unique.map((_,i)=>`place-${i}`),indexOfName=name=>unique.indexOf(name);
  const locs=unique.map((name,i)=>({id:ids[i],name,description:'',environment:'',connections:[],npcIds:[],objects:[]}));
  const connect=(a,b)=>{if(a>=0&&b>=0&&!locs[a].connections.includes(ids[b]))locs[a].connections.push(ids[b]);if(a>=0&&b>=0&&!locs[b].connections.includes(ids[a]))locs[b].connections.push(ids[a])};
  const settlement=0,path=indexOfName('The Ribbon Path'),archive=indexOfName('Wayfinder Archive'),firstLandmark=indexOfName(land.landmarks[0]),cache=indexOfName('Supply Cache'),source=indexOfName(`${land.environment} Relay`);
  connect(settlement,path);connect(settlement,archive);connect(path,firstLandmark);connect(firstLandmark,cache);connect(firstLandmark,source);
  land.landmarks.forEach((_,i)=>{if(i>0)connect(indexOfName(land.landmarks[i-1]),indexOfName(land.landmarks[i]))});
  locs.forEach((loc,i)=>{loc.environment=i===settlement?'settlement':i===path?'route':i===archive?'archive':i===cache?'supply site':i===source?'crisis site':i>=firstLandmark&&i<cache?'landmark':land.environment;});
  const npcIds=(land.consorts.npcs||[]).map(n=>n.name);
  locs[settlement].npcIds=npcIds.slice(0,1);locs[archive].npcIds=npcIds.slice(1,2);locs[path].npcIds=npcIds.slice(2,3);
  const objects=[
   {id:'notice',at:settlement,name:'The settlement notice board',description:`Woven markers and handwritten notes document how ${land.consorts.customs}. A fresh warning mentions: ${land.problem}.`,kind:'inspect'},
   {id:'tracks',at:path,name:'Scored stones beside the path',description:`Repeated drag marks lead toward ${land.landmarks[0]}; tiny ribbons mark the safest way through ${land.environment}.`,kind:'investigate'},
   {id:'inscription',at:archive,name:'The route ledger',description:`An old route ledger records the settlement's customs and the cause of the current trouble: ${land.cause}.`,kind:'inspect'},
   {id:'mechanism',at:firstLandmark,name:'A weatherworn mechanism',description:`Its failed fittings match the disturbance described by the Consorts. The machine is entangled with ${land.cause}.`,kind:'investigate'},
   {id:'cache',at:cache,name:'A sealed component case',description:'A single, intact relay component rests inside, protected from the local weather.',kind:'collect'},
   {id:'relay',at:source,name:'The damaged relay',description:`The relay is the immediate source of trouble: ${land.problem}. Its failure is consistent with ${land.cause}.`,kind:'repair'}
  ];
  locs.forEach(loc=>{loc.description=loc.id===ids[settlement]?`${land.consorts.description} Their settlement sits where ${land.geography}`:loc.id===ids[path]?`A traversable route through ${land.environment} and ${land.secondaryEnvironment}. ${land.geography}`:loc.id===ids[archive]?`A quiet record room maintained by the ${land.consorts.species}; local knowledge is kept alongside route maps.`:loc.id===ids[cache]?'A tucked-away storehouse near the notable landmark, stocked for emergencies.':loc.id===ids[source]?`A hazardous but accessible site connected to the Land's central problem. ${land.cause}.`: `A notable feature of ${land.name}, shaped by ${land.environment} and ${land.secondaryEnvironment}.`;loc.objects=objects.filter(o=>o.at===ids.indexOf(loc.id)).map(({at,...o})=>o)});
  return locs;
 };
 function initializeLandData(s){
  if(!s||!Array.isArray(s.lands))return;
  if(!s.landSelectedId||!s.players.some(p=>p.id===s.landSelectedId))s.landSelectedId=s.entryOrder?.[0]||s.players[0]?.id;
  s.lands.forEach(land=>{
   if(!Array.isArray(land.locations)||!land.locations.length)land.locations=makeLocations(land);
   const exp=land.exploration&&typeof land.exploration==='object'?land.exploration:{};
   const first=land.locations.find(x=>x.environment==='settlement')||land.locations[0];
   Object.assign(exp,{currentLocationId:exp.currentLocationId||first?.id||null,knownLocationIds:Array.isArray(exp.knownLocationIds)?exp.knownLocationIds:['place-0','place-1','place-2'].filter(id=>land.locations.some(x=>x.id===id)),completedObjectives:Array.isArray(exp.completedObjectives)?exp.completedObjectives:[],discoveries:Array.isArray(exp.discoveries)?exp.discoveries:[],conversations:exp.conversations&&typeof exp.conversations==='object'?exp.conversations:{},changes:exp.changes&&typeof exp.changes==='object'?exp.changes:{},items:Array.isArray(exp.items)?exp.items:[],problemKnown:!!exp.problemKnown,clueFound:!!exp.clueFound,questResolved:!!exp.questResolved});
   if(!land.locations.some(x=>x.id===exp.currentLocationId))exp.currentLocationId=first?.id||land.locations[0]?.id;
   if(!exp.knownLocationIds.length&&first)exp.knownLocationIds.push(first.id);
   land.exploration=exp;
  });
 }
 const ownerLand=id=>getSession().lands.find(l=>l.ownerId===id);
 const locBy=(land,id)=>land.locations.find(x=>x.id===id);
 const markObjective=(exp,text)=>{if(!exp.completedObjectives.includes(text))exp.completedObjectives.push(text)};
 const discover=(exp,id,text)=>{if(!exp.knownLocationIds.includes(id))exp.knownLocationIds.push(id);if(text&&!exp.discoveries.some(x=>x.id===`location:${id}`))exp.discoveries.push({id:`location:${id}`,text,at:exp.currentLocationId})};
 const completeProblemLearning=(land,exp)=>{exp.problemKnown=true;markObjective(exp,'Learn what is disrupting the Land and why.');const landmark=land.locations.find(x=>x.name===land.landmarks[0]);if(landmark)discover(exp,landmark.id,`A route to ${landmark.name} was shared by the Consorts.`)};
 function action(id,kind,value){
  const s=getSession(),p=playerBy(s.landSelectedId),land=p&&ownerLand(p.id),exp=land?.exploration;
  if(!p||!land||!exp)return false;
  const entered=!!s.entryState?.[p.id]?.entered;
  const fail=text=>{showToast(text);return true};
  if(!entered)return fail(`${p.name} must enter the Medium before exploring their Land.`);
  if(kind==='travel'){
   const here=locBy(land,exp.currentLocationId),dest=locBy(land,value);
   if(!here||!dest||!here.connections.includes(dest.id)||!exp.knownLocationIds.includes(dest.id))return fail('That destination is not a known, connected route from here.');
   exp.currentLocationId=dest.id;exp.discoveries.push({id:`arrival:${dest.id}:${getSession().gameClock?.minutes||0}`,text:`Arrived at ${dest.name}.`,at:dest.id});saveQuietly();render();showToast(`Arrived at ${dest.name}.`);return true;
  }
  if(kind==='object'){
   const here=locBy(land,exp.currentLocationId),obj=here?.objects.find(x=>x.id===value);
   if(!obj)return fail('That object is not present at the current location.');
   if(id==='inspect'||id==='investigate'){
    const key=`object:${here.id}:${obj.id}`;if(!exp.discoveries.some(x=>x.id===key))exp.discoveries.push({id:key,text:`${obj.name}: ${obj.description}`,at:here.id});
    if(obj.id==='notice'||obj.id==='relay'){completeProblemLearning(land,exp)}
    if(obj.id==='inscription')completeProblemLearning(land,exp);
    if(obj.id==='mechanism'){
     if(!exp.problemKnown)return fail('The mechanism is unfamiliar. Ask a Consort what problem the Land is facing first.');
     exp.clueFound=true;markObjective(exp,'Investigate the landmark and trace the problem to its source.');
     const cache=land.locations.find(x=>x.name==='Supply Cache'),source=land.locations.find(x=>x.name===`${land.environment} Relay`);
     if(cache)discover(exp,cache.id,'A Consort points out a supply cache near the landmark.');if(source)discover(exp,source.id,`The mechanism's route leads toward the ${source.name}.`);
    }
    if(obj.id==='tracks'){const archive=land.locations.find(x=>x.name==='Wayfinder Archive');if(archive)discover(exp,archive.id,'The scored stones point toward an old route archive.')}
    saveQuietly();render();showToast(exp.discoveries.some(x=>x.id===`object:${here.id}:${obj.id}`)?`Investigated ${obj.name}. A discovery was recorded.`:`Nothing new is revealed.`);return true;
   }
   if(id==='collect'){
    if(obj.id!=='cache'||!exp.clueFound)return fail('The sealed case is not yet located. Investigate the landmark and learn what the settlement needs.');
    if(exp.items.some(x=>x.id==='relay-component'))return fail('The unique relay component has already been collected.');
    exp.items.push({id:'relay-component',name:'Resonant relay component',description:`A salvageable fitting for the mechanism tied to ${land.cause}.`,obtainedAt:here.name,obtainedLocationId:here.id,usedAt:null});
    markObjective(exp,'Recover the missing component from the supply cache.');saveQuietly();render();showToast('Collected the unique Resonant relay component.');return true;
   }
   if(id==='repair'){
    const item=exp.items.find(x=>x.id==='relay-component');
    if(exp.questResolved)return fail('The relay has already been restored; the settlement is benefiting from the repair.');
    if(!exp.problemKnown||!exp.clueFound||!item)return fail('The relay needs the Consorts’ account, the landmark clue, and a recovered component.');
    item.usedAt=here.name;exp.changes.relayRestored=true;exp.questResolved=true;
    markObjective(exp,'Restore the damaged relay and ease the Land’s central problem.');
    exp.discoveries.push({id:'quest-resolved',text:`The relay is restored. ${land.consorts.species} in ${land.consorts.settlement} report that ${land.problem} has eased.`,at:here.id});
    saveQuietly();render();showToast('The relay is repaired. The Land’s central problem has eased.');return true;
   }
  }
  if(kind==='talk'){
   const here=locBy(land,exp.currentLocationId),npc=land.consorts.npcs.find(x=>x.name===id);
   if(!here||!npc||!here.npcIds.includes(npc.name))return fail('That Consort is not here.');
   exp.conversations[npc.name]=exp.conversations[npc.name]||{};const history=exp.conversations[npc.name],topic=value;
   let response='';
   if(topic==='settlement')response=history.settlement?`“You know our custom now: ${land.consorts.customs} We keep it because the routes are never entirely safe.”`:`“We are ${land.consorts.species}, and ${land.consorts.settlement} survives by looking after travelers. ${land.consorts.customs}”`;
   if(topic==='problem'){
    if(history.problem)response=`“The trouble is still ${land.problem}. We believe ${land.cause}; the landmark may show what the old mechanism was meant to do.”`;
    else response=`“${land.problem}. We think it began because ${land.cause}. ${npc.knowledge}. Please look at ${land.landmarks[0]}.”`;
    history.problem=true;completeProblemLearning(land,exp);
   }
   if(topic==='routes'){
    const path=land.locations.find(x=>x.name==='The Ribbon Path'),landmark=land.locations.find(x=>x.name===land.landmarks[0]);
    if(path)discover(exp,path.id,'The settlement route keeper marked the Ribbon Path on your map.');if(landmark&&exp.problemKnown)discover(exp,landmark.id,`A route keeper described the way to ${landmark.name}.`);
    response=history.routes?`“The safe route is the same one I marked. Follow the ribbons through ${land.environment}.`:`“Follow the ribbon markers through ${land.environment}. They lead to the old route and, beyond it, ${land.landmarks[0]}.`;
    history.routes=true;
   }
   if(topic==='help')response=exp.questResolved?`“You already helped us. Since the repair, ${land.problem} has eased. We will remember this.”`:!exp.problemKnown?`“I can use the help, but first hear what is wrong: ${land.problem}. We believe ${land.cause}.”`:`“The landmark mechanism and a missing fitting are our best lead. The ${land.environment} Relay is where the damage is felt most.”`;
   if(topic==='npc')response=`“${npc.knowledge}. ${npc.style ? `I try to be ${npc.style}.` : ''} Ask the ${land.consorts.npcs.find(x=>x!==npc)?.role||'others'} what they have seen.”`;
   history[topic]=(history[topic]||0)+1;saveQuietly();render();showToast(`${npc.name}: ${response}`);return true;
  }
  return false;
 }
 function explorationHtml(){
  const s=getSession();if(!s?.players?.length)return '';
  const p=playerBy(s.landSelectedId)||playerBy(s.entryOrder?.[0])||s.players[0],land=ownerLand(p.id),exp=land?.exploration;
  if(!land||!exp)return '';
  const entered=!!s.entryState?.[p.id]?.entered,here=locBy(land,exp.currentLocationId),known=exp.knownLocationIds.map(id=>locBy(land,id)).filter(Boolean);
  const currentRoutes=(here?.connections||[]).map(id=>locBy(land,id)).filter(x=>x&&exp.knownLocationIds.includes(x.id));
  const actionButton=(action,label,obj='')=>`<button class="action-button" data-land-action="${action}" ${obj?`data-land-${action==='travel'?'destination':'object'}="${esc(obj)}"`:''}>${label}</button>`;
  const objective=exp.questResolved?'Central problem eased; your Land’s relay is restored.':!exp.problemKnown?'Speak with a Consort or inspect the settlement notice board to learn what is wrong.':!exp.clueFound?'Follow the route to a landmark and investigate its mechanism.':!exp.items.some(x=>x.id==='relay-component')?'Find the marked Supply Cache and recover its unique component.':'Travel to the relay and repair it.';
  return `<section class="land-explorer panel"><div class="panel-title"><span>LAND EXPLORATION</span><em>${entered?'PLAYER LAND · PERSISTENT':'ENTRY REQUIRED'}</em></div><div class="land-explorer-toolbar"><label>PLAYER / LAND<select data-land-player>${s.players.map(x=>`<option value="${esc(x.id)}" ${x.id===p.id?'selected':''}>${esc(x.name)} · ${esc(x.title)}</option>`).join('')}</select></label><div class="land-explorer-identity"><b>${esc(land.name)}</b><span>${esc(land.environment)} · ${esc(land.secondaryEnvironment)}</span></div></div>${!entered?`<div class="land-locked"><b>${esc(p.name)} has not entered the Medium.</b><p>Complete their entry sequence first. Land exploration becomes available only after successful entry.</p></div>`:`<div class="land-explorer-grid"><div class="land-map-panel"><div class="eyebrow">KNOWN ROUTES · ${known.length} LOCATIONS</div><div class="land-map-nodes">${known.map(loc=>`<button class="land-map-node ${loc.id===here?.id?'current':''}" ${loc.id===here?.id?'disabled':''} data-land-action="travel" data-land-destination="${esc(loc.id)}"><b>${esc(loc.name)}</b><small>${esc(loc.environment)}</small></button>`).join('')}</div><p class="note">Only discovered routes connected to your current location can be traveled.</p></div><div class="land-current panel"><div class="eyebrow">CURRENT LOCATION · ${esc(here?.environment||'UNKNOWN')}</div><h3>${esc(here?.name||'Unknown location')}</h3><p>${esc(here?.description||'No description available.')}</p><div class="land-route-actions">${currentRoutes.length?currentRoutes.map(loc=>actionButton('travel',`Travel → ${esc(loc.name)}`,loc.id)).join(''):'<span class="note">No known connected routes. Talk to a Consort or inspect local clues to reveal a route.</span>'}</div></div></div><div class="land-objectives panel"><div><div class="eyebrow">LAND PROBLEM · ${exp.questResolved?'RESOLVED':'ACTIVE'}</div><b>${esc(land.problem)}</b><p>${esc(land.quest.main)}</p><small>NEXT: ${esc(objective)}</small></div><div class="land-objective-status"><span>DISCOVERIES</span><b>${exp.discoveries.length}</b><span>ITEMS</span><b>${exp.items.length}</b></div></div><div class="land-interactions-grid"><section class="panel land-interaction"><div class="panel-title"><span>LOCAL CONSORTS</span><em>${here?.npcIds.length||0} HERE</em></div>${(here?.npcIds||[]).map(name=>{const npc=land.consorts.npcs.find(x=>x.name===name);return npc?`<div class="land-npc"><b>${esc(npc.name)}</b><small>${esc(npc.role)} · ${esc(npc.style)}</small><div class="land-action-row">${[['problem','Ask about the problem'],['routes','Ask for routes'],['settlement','Ask about the settlement'],['help','Offer help'],['npc','Ask what they know']].map(([topic,label])=>`<button class="small-action" data-land-action="talk" data-land-npc="${esc(npc.name)}" data-land-topic="${topic}">${label}</button>`).join('')}</div></div>`:''}).join('')||'<p class="note">No Consorts are present here.</p>'}</section><section class="panel land-interaction"><div class="panel-title"><span>ENVIRONMENTAL INTERACTIONS</span><em>${here?.objects.length||0} OBJECTS</em></div>${(here?.objects||[]).map(obj=>`<div class="land-object"><b>${esc(obj.name)}</b><p>${esc(obj.description)}</p><div class="land-action-row">${obj.kind==='collect'?actionButton('collect',exp.items.some(x=>x.id==='relay-component')?'Collected · unique item':'Collect unique component',obj.id):obj.kind==='repair'?actionButton('repair',exp.questResolved?'Relay restored':'Repair the relay',obj.id):actionButton(obj.kind==='investigate'?'investigate':'inspect',exp.discoveries.some(x=>x.id===`object:${here.id}:${obj.id}`)?'Examine again':'Examine',obj.id)}</div></div>`).join('')||'<p class="note">Nothing notable is available to interact with here.</p>'}</section></div><div class="panel land-journal"><div class="panel-title"><span>PLAYER JOURNAL</span><em>${exp.completedObjectives.length} OBJECTIVES · ${exp.discoveries.length} RECORDS</em></div><div class="land-journal-columns"><div><b>OBJECTIVES COMPLETED</b>${exp.completedObjectives.length?`<ul>${exp.completedObjectives.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p class="note">No objectives completed yet.</p>'}</div><div><b>DISCOVERIES & WORLD CHANGES</b>${[...exp.discoveries.map(x=>x.text),...(exp.changes.relayRestored?['Persistent change: the relay is operating again.']:[])].length?`<ul>${[...exp.discoveries.map(x=>x.text),...(exp.changes.relayRestored?['Persistent change: the relay is operating again.']:[])].map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p class="note">Your discoveries will be recorded here.</p>'}</div><div><b>UNIQUE ITEMS</b>${exp.items.length?`<ul>${exp.items.map(x=>`<li>${esc(x.name)}${x.usedAt?` · used at ${esc(x.usedAt)}`:''}</li>`).join('')}</ul>`:'<p class="note">No unique items collected.</p>'}</div></div></div></div>`}</section>`;
 }
 function handleClick(e){
  const button=e.target.closest('[data-land-action]');if(!button)return false;
  const actionName=button.dataset.landAction;
  if(actionName==='travel')return action(button.dataset.landDestination,'travel',button.dataset.landDestination);
  if(actionName==='talk')return action(button.dataset.landNpc,'talk',button.dataset.landTopic);
  return action(actionName,'object',button.dataset.landObject);
 }
 function handleChange(e){if(!e.target.matches('[data-land-player]'))return false;const s=getSession();s.landSelectedId=e.target.value;saveQuietly();render();return true}
 return {initializeLandData,explorationHtml,handleClick,handleChange};
 }
