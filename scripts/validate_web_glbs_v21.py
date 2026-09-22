"""Re-import every v21 web GLB and validate the front optic mount nodes."""

from __future__ import annotations

import json
import os

import bpy
from mathutils.bvhtree import BVHTree


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSET_DIR = os.path.join(ROOT, "docs", "assets")
OUT = os.path.join(ROOT, "audit", "v21_web_glb_validation.json")
FILES = (
    "tachikoma-walk.glb",
    "tachikoma-roll.glb",
    "tachikoma-open.glb",
    "tachikoma-patrol.glb",
)


def geometry(obj: bpy.types.Object):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    vertices = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    polygons = [tuple(polygon.vertices) for polygon in mesh.polygons]
    tree = BVHTree.FromPolygons(vertices, polygons, all_triangles=False)
    evaluated.to_mesh_clear()
    return vertices, tree


def gap(first_name: str, second_name: str) -> float:
    first_vertices, first_tree = geometry(bpy.data.objects[first_name])
    second_vertices, second_tree = geometry(bpy.data.objects[second_name])
    if first_tree.overlap(second_tree):
        return 0.0
    distances = []
    for point in first_vertices:
        found = second_tree.find_nearest(point)
        if found[0] is not None:
            distances.append(found[3])
    for point in second_vertices:
        found = first_tree.find_nearest(point)
        if found[0] is not None:
            distances.append(found[3])
    return min(distances) if distances else float("inf")


failures = []
files = []
for filename in FILES:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    path = os.path.join(ASSET_DIR, filename)
    bpy.ops.import_scene.gltf(filepath=path)
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    record = {
        "file": filename,
        "bytes": os.path.getsize(path),
        "objects": len(bpy.context.scene.objects),
        "sides": [],
    }
    required = ["TKM17_Pod_TopHatch"]
    for side in (-1, 1):
        required.extend(
            [
                f"TKM21_FrontOpticSaddle_{side}",
                f"TKM18_FrontLampHousing_{side}_Outer",
                f"TKM18_FrontLampHousing_{side}_Inner",
            ]
        )
    missing = [name for name in required if name not in bpy.data.objects]
    if missing:
        failures.append(f"{filename} missing nodes: {missing}")
        record["missing"] = missing
        files.append(record)
        continue
    for side in (-1, 1):
        saddle = f"TKM21_FrontOpticSaddle_{side}"
        checks = {
            "saddle_to_top_hatch": gap(saddle, "TKM17_Pod_TopHatch"),
            "outer_housing_to_saddle": gap(
                f"TKM18_FrontLampHousing_{side}_Outer", saddle
            ),
            "inner_housing_to_saddle": gap(
                f"TKM18_FrontLampHousing_{side}_Inner", saddle
            ),
        }
        if any(value > 0.005 for value in checks.values()):
            failures.append(f"{filename} side={side} gaps={checks}")
        obj = bpy.data.objects[saddle]
        record["sides"].append(
            {
                "side": side,
                "visible": not obj.hide_render,
                "vertices": len(obj.data.vertices),
                "materials": [material.name for material in obj.data.materials],
                "checks": checks,
            }
        )
    files.append(record)

report = {
    "status": "PASS" if not failures else "FAIL",
    "files": files,
    "failures": failures,
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as handle:
    json.dump(report, handle, ensure_ascii=False, indent=2)
print("TKM21_WEB_GLB_VALIDATION=" + json.dumps(report), flush=True)
if failures:
    raise RuntimeError("; ".join(failures))
