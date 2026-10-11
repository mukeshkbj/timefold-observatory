import { readFile } from 'node:fs/promises';
import { initialStateFor, scenarioFromSeed } from '../../shared/timefold.ts';

const scenario = scenarioFromSeed(7);
const state = process.argv.includes('--restored')
  ? { cell: scenario.socket, fuse: 'protected', gear: 'drive', lens: 'optic', alignment: scenario.bearing, crystal: 'receiver', frequency: scenario.band }
  : initialStateFor(scenario);

async function source(path, pointName = 'Point') {
  return (await readFile(new URL(path, import.meta.url), 'utf8'))
    .replace(/^import .*\r?\n/gm, '')
    .replace(/export default function /g, 'function ')
    .replace(/^export /gm, '')
    .replace(/\bPoint\b/g, pointName);
}
const code = await Promise.all([
  source('../../shared/timefold.ts'), source('../../shared/puzzle.ts'), source('../../shared/presentation.ts'),
  source('../../src/xr/diorama/types.ts'), source('../../src/xr/SceneLabel.tsx', 'LabelPoint'),
  source('../../src/xr/diorama/materials.ts'), (await source('../../src/xr/diorama/particles.tsx')).replace(/require\('\.\.\/\.\.\/\.\.\/assets\//g, "require('./assets/"),
  source('../../src/xr/diorama/parts.tsx'), source('../../src/xr/diorama/EraObservatory.tsx'),
  source('../../src/xr/ObservatoryVisuals.tsx'),
]);
console.log(`import React from 'react';\nimport { Viro3DSceneNavigator, ViroScene, ViroAmbientLight, ViroCamera, ViroBox, ViroMaterials, ViroAnimations, ViroNode, ViroSphere, ViroText, ViroParticleEmitter, ViroOmniLight } from '@reactvision/react-viro';\nconst {useState,useEffect,useRef}=React;\n${code.join('\n')}\nconst scenario = ${JSON.stringify(scenario)};\nconst state = ${JSON.stringify(state)};\nfunction TimeFoldRender() { return <ViroScene><ViroAmbientLight color="#ffffff" intensity={650} /><ViroCamera active position={[0,0.35,2.8]} /><ObservatoryVisuals state={state} scenario={scenario} /></ViroScene>; }\nexport default function TimeFoldRenderApp() { return <Viro3DSceneNavigator initialScene={{scene: TimeFoldRender}} hdrEnabled={false} bloomEnabled={false} style={{width:'100%',height:'100%'}} />; }\n`);
