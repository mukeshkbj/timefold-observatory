import { readFile } from 'node:fs/promises';
import { buildEraVisuals } from '../../shared/presentation.ts';
import { initialStateFor, scenarioFromSeed } from '../../shared/timefold.ts';

const scenario = scenarioFromSeed(7);
const state = process.argv.includes('--restored')
  ? { cell: scenario.socket, fuse: 'protected', gear: 'drive', lens: 'optic', alignment: scenario.bearing, crystal: 'receiver', frequency: scenario.band }
  : initialStateFor(scenario);
const labelSource = (await readFile(new URL('../../src/xr/SceneLabel.tsx', import.meta.url), 'utf8')).replace(/^import .*\r?\n/gm, '').replace('export default function SceneLabel', 'function SceneLabel');
const visualSource = (await readFile(new URL('../../src/xr/ObservatoryVisuals.tsx', import.meta.url), 'utf8'))
  .replace(/^import .*\r?\n/gm, '').replace('export default function ObservatoryVisuals', 'function ObservatoryVisuals');
const source = `import React from 'react';\nimport { Viro3DSceneNavigator, ViroScene, ViroAmbientLight, ViroCamera, ViroBox, ViroMaterials, ViroNode, ViroSphere, ViroText } from '@reactvision/react-viro';\n${labelSource}\n${visualSource}\nconst layers = ${JSON.stringify(buildEraVisuals(state, scenario))};\nfunction TimeFoldRender() { return <ViroScene><ViroAmbientLight color="#ffffff" intensity={650} /><ViroCamera active position={[0,0.35,2.8]} /><ObservatoryVisuals layers={layers} /></ViroScene>; }\nexport default function TimeFoldRenderApp() { return <Viro3DSceneNavigator initialScene={{scene: TimeFoldRender}} hdrEnabled={false} bloomEnabled={false} style={{width:'100%',height:'100%'}} />; }\n`;
console.log(source);
