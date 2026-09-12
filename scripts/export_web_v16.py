"""Export the reviewed Tachikoma model into browser-friendly GLB assets.

Run with Blender in background mode while opening
``tachikoma_v16_reference_reviewed.blend``.
"""

from __future__ import annotations

import json
import os

import bpy


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSET_DIR = os.path.join(ROOT, "docs", "assets")
EXCLUDED_PREFIXES = ("TKM13_FloorMark",)
EXCLUDED_NAMES = {"TKM11_StudioFloor"}


def is_model_object(obj: bpy.types.Object) -> bool:
    if obj.type not in {"MESH", "CURVE", "ARMATURE"}:
        return False
    if obj.name in EXCLUDED_NAMES or obj.name.startswith(EXCLUDED_PREFIXES):
        return False
    return not obj.hide_render


def select_model(frame: int) -> list[bpy.types.Object]:
    scene = bpy.context.scene
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    for obj in scene.objects:
        obj.select_set(False)
    selected = []
    for obj in scene.objects:
        if is_model_object(obj):
            obj.hide_set(False)
            obj.select_set(True)
            selected.append(obj)
    rig = bpy.data.objects.get("TACHIKOMA_RIG")
    if rig and rig not in selected:
        rig.hide_set(False)
        rig.select_set(True)
        selected.append(rig)
    if rig:
        bpy.context.view_layer.objects.active = rig
    return selected


def make_export_data_single_user() -> int:
    """Avoid shared-mesh clones that break model-viewer's primitive mapping."""
    copies = 0
    for obj in bpy.context.scene.objects:
        if obj.type in {"MESH", "CURVE"} and obj.data and obj.data.users > 1:
            obj.data = obj.data.copy()
            copies += 1
    return copies


def export_glb(filename: str, frame: int, animations: bool) -> dict:
    selected = select_model(frame)
    path = os.path.join(ASSET_DIR, filename)
    result = bpy.ops.export_scene.gltf(
        filepath=path,
        check_existing=False,
        export_format="GLB",
        use_selection=True,
        use_active_scene=True,
        export_animations=animations,
        export_animation_mode="SCENE",
        export_anim_scene_split_object=False,
        export_nla_strips=False,
        export_frame_range=True,
        export_force_sampling=True,
        export_optimize_animation_size=True,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_materials="EXPORT",
        export_yup=True,
        export_apply=False,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
    )
    if "FINISHED" not in result:
        raise RuntimeError(f"Export failed for {filename}: {result}")
    return {
        "file": filename,
        "frame": frame,
        "animations": animations,
        "objects": len(selected),
        "bytes": os.path.getsize(path),
    }


os.makedirs(ASSET_DIR, exist_ok=True)
single_user_copies = make_export_data_single_user()
exports = [
    export_glb("tachikoma-patrol.glb", frame=1, animations=True),
    export_glb("tachikoma-walk.glb", frame=96, animations=False),
    export_glb("tachikoma-roll.glb", frame=330, animations=False),
]

report_path = os.path.join(ROOT, "audit", "web_export_v16.json")
with open(report_path, "w", encoding="utf-8") as handle:
    json.dump(
        {
            "source": bpy.data.filepath,
            "blender": bpy.app.version_string,
            "scene_frames": [bpy.context.scene.frame_start, bpy.context.scene.frame_end],
            "fps": bpy.context.scene.render.fps / bpy.context.scene.render.fps_base,
            "single_user_copies": single_user_copies,
            "exports": exports,
        },
        handle,
        ensure_ascii=False,
        indent=2,
    )
print("WEB_EXPORT=" + json.dumps(exports))
