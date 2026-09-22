"""Render focused multi-angle review views for the v21 front optic mounts."""

from __future__ import annotations

import os

import bpy
from mathutils import Vector


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "audit", "views_v21_front_optics")
os.makedirs(OUT, exist_ok=True)
scene = bpy.context.scene
rig = bpy.data.objects["TACHIKOMA_RIG"]
scene.frame_set(1)

for obj in scene.objects:
    if obj.name in {"TKM6_Cyclorama", "TKM2_Ground", "TKM11_StudioFloor"} or obj.name.startswith("TKM13_FloorMark"):
        obj.hide_render = True

camera = scene.camera
camera.animation_data_clear()
camera.data.type = "ORTHO"
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1200
scene.render.resolution_y = 900
scene.render.resolution_percentage = int(os.environ.get("V21_RENDER_PERCENT", "75"))
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = False
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"


def aim(obj: bpy.types.Object, point) -> None:
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


for obj in scene.objects:
    if obj.type == "LIGHT":
        obj.hide_render = True
for name, position, energy, size, color in (
    ("Key", (-5, -7, 11), 1800, 5.5, (0.88, 0.95, 1.0)),
    ("Fill", (6, -3, 7), 1200, 4.0, (1.0, 0.93, 0.84)),
    ("Rear", (0, 7, 9), 1500, 5.0, (0.78, 0.90, 1.0)),
):
    data = bpy.data.lights.new("TKM21_Review" + name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    light = bpy.data.objects.new(data.name, data)
    scene.collection.objects.link(light)
    light.location = position
    aim(light, (0.0, 0.9, 5.0))
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.02, 0.04, 0.055, 1.0)
scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.5

views = (
    ("closed_front", 0.0, (0.0, -12.0, 6.1), (0.0, 0.9, 5.0), 3.0),
    ("closed_front_left", 0.0, (-5.5, -10.0, 6.7), (-0.1, 0.9, 5.0), 3.2),
    ("closed_front_right", 0.0, (5.5, -10.0, 6.7), (0.1, 0.9, 5.0), 3.2),
    ("open_front", 1.0, (0.0, -12.0, 6.5), (0.0, 0.9, 5.35), 3.3),
    ("open_front_left_low", 1.0, (-5.4, -10.0, 5.5), (-0.1, 0.9, 5.2), 3.3),
    ("open_front_right_low", 1.0, (5.4, -10.0, 5.5), (0.1, 0.9, 5.2), 3.3),
    ("open_front_left_high", 1.0, (-4.8, -9.0, 8.2), (-0.1, 0.95, 5.3), 3.2),
    ("open_front_right_high", 1.0, (4.8, -9.0, 8.2), (0.1, 0.95, 5.3), 3.2),
)
selected = {item for item in os.environ.get("V21_VIEWS", "").split(",") if item}
for name, opening, position, target, scale in views:
    if selected and name not in selected:
        continue
    for prop in ("pod_top_hatch", "pod_rear_doors", "pod_sensor_hatch", "pod_sensor_flip"):
        rig[prop] = opening
    rig.update_tag()
    scene.frame_set(2)
    scene.frame_set(1)
    bpy.context.view_layer.update()
    camera.location = position
    aim(camera, target)
    camera.data.ortho_scale = scale
    scene.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True)
    print("V21_FRONT_OPTIC_VIEW=" + name, flush=True)
