from pathlib import Path
import sys,json,zipfile,shutil
import numpy as np
import trimesh
from trimesh.visual.texture import TextureVisuals
ROOT=Path(__file__).resolve().parent if Path(__file__).resolve().parent.name == 'undangan_ai_joglo_interior_v1' else Path('/mnt/data/undangan_ai_joglo_interior_v1')
src=ROOT/'models/joglo_living_room_complete.glb'
s=trimesh.load(src,force='scene')
keep=[]; groups={}
for node in s.graph.nodes_geometry:
    tf,key=s.graph[node]
    m=s.geometry[key].copy()
    m.apply_transform(tf)
    if ('HS_' in node or 'SPAWN_' in node or 'PHOTO_DISPLAY_MESH' in node or 'FLOOR_WALKABLE' in node):
        keep.append((node,m));continue
    material=getattr(m.visual,'material',None)
    name=material.name if material else 'no-material'
    groups.setdefault(name,[]).append(m)

optimized=trimesh.Scene()
for node,m in keep:
    optimized.add_geometry(m,node_name=node,geom_name=node)
for matname,meshes in groups.items():
    vertices=[]; faces=[]; uv=[];count=0
    for m in meshes:
        vertices.append(m.vertices)
        faces.append(m.faces + count)
        count+=len(m.vertices)
        uv.append(m.visual.uv)
    merged=trimesh.Trimesh(vertices=np.concatenate(vertices),faces=np.concatenate(faces),process=False)
    merged.visual=TextureVisuals(uv=np.concatenate(uv),material=meshes[0].visual.material)
    node='STATIC_BATCH_'+str(matname).replace(' ','_')
    optimized.add_geometry(merged,node_name=node,geom_name=node)
file=ROOT/'models/joglo_living_room_mobile_optimized.glb'
optimized.export(file)
verify=trimesh.load(file,force='scene')
print('src nodes',len(s.graph.nodes_geometry),'dst nodes',len(verify.graph.nodes_geometry))
print('triangles',sum(len(x.faces) for x in verify.geometry.values()))
print('size kB',file.stat().st_size/1024)
print('preserved interactive nodes',sorted(n for n in verify.graph.nodes_geometry if 'HS_' in n))
config_path=ROOT/'scene-config.json'
config=json.loads(config_path.read_text())
config['asset']='/models/joglo_living_room_mobile_optimized.glb'
config['fullEditingAsset']='/models/joglo_living_room_complete.glb'
config_path.write_text(json.dumps(config,indent=2,ensure_ascii=False))
# edit root reproducible generator script to write in folder, safe when rerun
script=ROOT/'build_joglo_interior.py'
txt=script.read_text()
txt=txt.replace("ROOT=Path(__file__).resolve().parent if Path(__file__).resolve().parent.name == 'undangan_ai_joglo_interior_v1' else Path('/mnt/data/undangan_ai_joglo_interior_v1')","ROOT=Path(__file__).resolve().parent if Path(__file__).resolve().parent.name == 'undangan_ai_joglo_interior_v1' else Path('/mnt/data/undangan_ai_joglo_interior_v1')")
txt=txt.replace("shutil.copy2(__file__,ROOT/'build_joglo_interior.py')","if Path(__file__).resolve() != (ROOT/'build_joglo_interior.py').resolve(): shutil.copy2(__file__,ROOT/'build_joglo_interior.py')")
script.write_text(txt)
(ROOT/'requirements.txt').write_text('numpy>=1.26\ntrimesh>=4.0\nPillow>=10.0\n')
readme=ROOT/'README.md';txt=readme.read_text();txt=txt.replace('- `models/joglo_living_room_complete.glb` — assembled interior', '- `models/joglo_living_room_mobile_optimized.glb` — RECOMMENDED for mobile; batched static geometry, interaction/photo nodes preserved.\n- `models/joglo_living_room_complete.glb` — editable assembled interior')
txt=txt.replace("use `useGLTF('/models/joglo_living_room_complete.glb')`", "use `useGLTF('/models/joglo_living_room_mobile_optimized.glb')`")
txt += '''\n## Draw-call / batching notes\n\nThe editable full model uses ~616 independently named meshes (a high draw-call count for mobile). The optimized model batches static geometry by material and preserves individual `HS_*`, `SPAWN_*`, `PHOTO_DISPLAY_MESH`, and `FLOOR_WALKABLE` meshes. Use the optimized model in the public viewer; use complete/model-per-prop files when editing authored scenes. This is **not** a substitute for mobile profiling.\n\n**Important for previous exterior pack:** That earlier procedural pack was authored with Z-up conventions; this interior pack uses glTF-native **Y-up**. To combine them, rotate/re-export the older exterior asset around X (-90 degrees), check positions, and regenerate the navmesh. Do not assume the two scenes share coordinates without conversion.\n'''
readme.write_text(txt)
# simple integration guide
(ROOT/'docs/r3f-integration.md').write_text('''# R3F integration: Joglo Living Room\n\n```tsx\n'use client';\nimport { useGLTF } from '@react-three/drei';\nimport { useEffect, useMemo } from 'react';\nimport * as THREE from 'three';\n\ntype Props = { onAction: (name: string) => void };\n\nexport function JogloLivingRoom({ onAction }: Props) {\n  const { scene: cachedScene } = useGLTF('/models/joglo_living_room_mobile_optimized.glb');\n  const scene = useMemo(() => cachedScene.clone(true), [cachedScene]);\n\n  useEffect(() => {\n    scene.traverse((obj) => {\n      if (!(obj instanceof THREE.Mesh)) return;\n      if (obj.name.includes('SPAWN_')) { obj.visible = false; return; }\n      if (obj.name.includes('HS_')) {\n        // Keep the hit target in raycast while hiding pixels.\n        obj.visible = true;\n        obj.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0,\n          depthWrite: false, side: THREE.DoubleSide });\n      }\n    });\n    return () => {\n      scene.traverse(obj => {\n        if (obj instanceof THREE.Mesh && obj.name.includes('HS_')) {\n          (obj.material as THREE.Material).dispose();\n        }\n      });\n    };\n  }, [scene]);\n\n  return <primitive object={scene} onClick={(e: any) => {\n    const node = e.object as THREE.Object3D;\n    if (node.name.includes('HS_')) { e.stopPropagation(); onAction(node.name); }\n  }} />;\n}\n\nuseGLTF.preload('/models/joglo_living_room_mobile_optimized.glb');\n```\n\nIn production map the callback name through `scene-config.json`'s action registry, never execute arbitrary action names. Load CMS photos through `TextureLoader` and replace materials on meshes ending in `PHOTO_DISPLAY_MESH` (clone the material first; configure color space and CORS).\n\n**Important:** The completed scene is not a full physics/navigation asset. Test obstacle collision and bake a walkable navmesh before enabling unrestricted avatar movement.\n''')
# update validation including optimized
r=[]
for f in sorted((ROOT/'models').glob('*.glb')):
  sc=trimesh.load(f,force='scene')
  r.append({'file':f.name,'bytes':f.stat().st_size,'nodes':len(sc.graph.nodes_geometry),'triangles':int(sum(len(g.faces) for g in sc.geometry.values())),'extents_m':[round(float(x),2) for x in sc.extents]})
(ROOT/'validation-report.json').write_text(json.dumps(r,indent=2))
zipfile_path=Path('/mnt/data/undangan-ai-joglo-interior-stylized-realistic-v1.zip')
with zipfile.ZipFile(zipfile_path,'w',zipfile.ZIP_DEFLATED,compresslevel=7) as z:
  for f in ROOT.rglob('*'):
    if f.is_file(): z.write(f,arcname=ROOT.name+'/'+str(f.relative_to(ROOT)))
print('ZIP',zipfile_path.stat().st_size,'bytes')
