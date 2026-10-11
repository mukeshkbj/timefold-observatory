import { readFile } from 'node:fs/promises';

async function source(path, pointName = 'Point') {
  return (await readFile(new URL(path, import.meta.url), 'utf8'))
    .replace(/^import .*\r?\n/gm, '')
    .replace(/export default function /g, 'function ')
    .replace(/^export /gm, '')
    .replace(/\bPoint\b/g, pointName);
}
const code = await Promise.all([
  source('../../shared/timefold.ts'), source('../../shared/puzzle.ts'), source('../../shared/debrief.ts'),
  source('../../src/xr/SceneLabel.tsx', 'LabelPoint'), source('../../src/xr/diorama/materials.ts'),
  source('../../src/xr/QuestConsole.tsx', 'ConsolePoint'),
]);
console.log(`import React from 'react';\nimport {Viro3DSceneNavigator,ViroScene,ViroCamera,ViroNode,ViroBox,ViroText,ViroMaterials,ViroAnimations,ViroAmbientLight} from '@reactvision/react-viro';\nconst {useState}=React;\n${code.join('\n')}\nfunction Preview(){const [snap,setSnap]=useState(()=>({session:newPuzzleSession(),busy:false,message:'Preview',keeper:'The keeper watches the workbench.',highlights:[],hintLevel:1,placement:'placed',sfx:null,ripple:null,debriefOpen:false}));const actions={init(){},dispatch(a){setSnap(s=>({...s,session:reducePuzzle(s.session,a)}));},save:async()=>{},ask(){},cycleHint(){setSnap(s=>({...s,hintLevel:s.hintLevel===3?1:s.hintLevel+1}));},newCase(){setSnap(s=>({...s,session:newPuzzleSession(newGame())}));},setPlacement(){},closeDebrief(){setSnap(s=>({...s,debriefOpen:false}));},clearSfx(){}};return <ViroScene><ViroAmbientLight color="#ffffff" intensity={650}/><ViroCamera active position={[0,0,0]} /><QuestConsole snap={snap} actions={actions} onExit={()=>{}}/></ViroScene>;}\nexport default function App(){return <Viro3DSceneNavigator initialScene={{scene:Preview}} style={{width:'100%',height:'100%'}}/>;}\n`);
