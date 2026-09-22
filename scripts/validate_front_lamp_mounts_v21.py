"""Validate the complete front-optic load paths in Tachikoma v21."""

from __future__ import annotations

import json
import os

import bpy
from mathutils.bvhtree import BVHTree


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "audit", "v21_front_optic_validation.json")
scene = bpy.context.scene
rig = bpy.data.objects["TACHIKOMA_RIG"]
depsgraph = bpy.context.evaluated_depsgraph_get()


def evaluated_geometry(obj: bpy.types.Object):
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    vertices = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    polygons = [tuple(polygon.vertices) for polygon in mesh.polygons]
    tree = BVHTree.FromPolygons(vertices, polygons, all_triangles=False)
    evaluated.to_mesh_clear()
    return vertices, tree


def gap(first_name: str, second_name: str) -> float:
    first_vertices, first_tree = evaluated_geometry(bpy.data.objects[first_name])
    second_vertices, second_tree = evaluated_geometry(bpy.data.objects[second_name])
    if first_tree.overlap(second_tree):
        return 0.0
    distances = []
    for point in first_vertices:
        nearest = second_tree.find_nearest(point)
        if nearest[0] is not None:
            distances.append(nearest[3])
    for point in second_vertices:
        nearest = first_tree.find_nearest(point)
        if nearest[0] is not None:
            distances.append(nearest[3])
    return min(distances) if distances else float("inf")


limit = 0.005
failures = []
states = []
maximum = 0.0
for opening in (0.0, 0.25, 0.5, 0.75, 1.0):
    rig["pod_top_hatch"] = opening
    rig["pod_sensor_hatch"] = opening
    rig["pod_sensor_flip"] = 1.0
    rig.update_tag()
    scene.frame_set(2)
    scene.frame_set(1)
    bpy.context.view_layer.update()
    state = {"opening": opening, "sides": []}
    for side in (-1, 1):
        mount = f"TKM21_FrontOpticSaddle_{side}"
        checks = {
            "saddle_to_top_hatch": gap(mount, "TKM17_Pod_TopHatch"),
        }
        for label in ("Outer", "Inner"):
            housing = f"TKM18_FrontLampHousing_{side}_{label}"
            rim = f"TKM16_Pod_FrontLamp_{side}_{label}_Rim"
            lens = f"TKM16_Pod_FrontLamp_{side}_{label}"
            checks[f"{label.lower()}_housing_to_saddle"] = gap(housing, mount)
            checks[f"{label.lower()}_housing_to_rim"] = gap(housing, rim)
            checks[f"{label.lower()}_rim_to_lens"] = gap(rim, lens)
        maximum = max(maximum, *checks.values())
        for name, value in checks.items():
            if value > limit:
                failures.append(f"opening={opening} side={side} {name} gap={value}")
        state["sides"].append(
            {
                "side": side,
                "visible": not bpy.data.objects[mount].hide_render,
                "checks": checks,
            }
        )
    states.append(state)

# Rear lamp housings already touch the cap; retain that as a regression check.
rear = {}
for side in (-1, 1):
    for label in ("Outer", "Inner"):
        housing = f"TKM18_RearLampHousing_{side}_{label}"
        value = gap(housing, "TKM17_Pod_TopHatch")
        rear[f"{side}_{label}"] = value
        if value > limit:
            failures.append(f"rear {side} {label} housing_to_top gap={value}")

manifest = json.loads(scene["TKM21_front_optic_manifest"])
report = {
    "source": os.path.basename(bpy.data.filepath),
    "status": "PASS" if not failures else "FAIL",
    "limit": limit,
    "maximum_front_path_gap": maximum,
    "states": states,
    "rear_housing_to_top": rear,
    "manifest": manifest,
    "failures": failures,
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as handle:
    json.dump(report, handle, ensure_ascii=False, indent=2)
print("TKM21_FRONT_OPTIC_VALIDATION=" + json.dumps(report), flush=True)
if failures:
    raise RuntimeError("; ".join(failures))
