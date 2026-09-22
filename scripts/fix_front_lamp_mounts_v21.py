"""Attach the four front roof optics to the top hatch for Tachikoma v21.

Run on ``tachikoma_v20_connection_repaired.blend``.  The v18 finish pass hid
the molded faceplates while its replacement lamp tubes stopped below the cap.
This patch adds one substantial molded saddle per side.  Each saddle intersects
both lamp tubes and the top hatch, so the orange optics no longer read as
separate floating cylinders from a low front angle.
"""

from __future__ import annotations

import json
import os

import bpy
import bmesh


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT = os.path.join(ROOT, "tachikoma_v21_optic_mounted.blend")


def apply() -> dict:
    scene = bpy.context.scene
    rig = bpy.data.objects["TACHIKOMA_RIG"]
    top_control = bpy.data.objects["TKM17_CTRL_TopHatch"]

    scene.frame_set(1)
    for prop in (
        "pod_top_hatch",
        "pod_rear_doors",
        "pod_sensor_hatch",
        "pod_sensor_flip",
    ):
        rig[prop] = 0.0
    rig.update_tag()
    bpy.context.view_layer.update()

    old = bpy.data.collections.get("TKM21_FrontOpticMounts")
    if old:
        for obj in list(old.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(old)
    collection = bpy.data.collections.new("TKM21_FrontOpticMounts")
    scene.collection.children.link(collection)

    def parent_keep_world(obj: bpy.types.Object, parent: bpy.types.Object) -> None:
        world = obj.matrix_world.copy()
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
        obj.matrix_basis = world

    def saddle(name: str, side: int, material: bpy.types.Material) -> bpy.types.Object:
        # The X/Z profile is deliberately broad enough to receive the inner and
        # outer tubes together.  Its sloped shoulder disappears into the cap.
        right_profile = [
            (0.56, 4.94),
            (0.98, 4.94),
            (0.98, 5.06),
            (0.90, 5.13),
            (0.64, 5.13),
            (0.56, 5.06),
        ]
        profile = [(x * side, z) for x, z in right_profile]
        if side < 0:
            profile.reverse()
        vertices = [
            (x, y, z)
            for y in (0.85, 1.01)
            for x, z in profile
        ]
        count = len(profile)
        faces = [
            tuple(reversed(range(count))),
            tuple(range(count, count * 2)),
        ]
        for index in range(count):
            following = (index + 1) % count
            faces.append((index, following, count + following, count + index))
        mesh = bpy.data.meshes.new(name + "Mesh")
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        editable = bmesh.new()
        editable.from_mesh(mesh)
        bmesh.ops.recalc_face_normals(editable, faces=list(editable.faces))
        editable.to_mesh(mesh)
        editable.free()
        mesh.materials.append(material)
        obj = bpy.data.objects.new(name, mesh)
        collection.objects.link(obj)
        parent_keep_world(obj, top_control)
        bevel = obj.modifiers.new("Molded shoulder", "BEVEL")
        bevel.width = 0.030
        bevel.segments = 4
        obj["v21_front_optic_mount"] = True
        obj["mount_role"] = "top-hatch saddle"
        return obj

    records = []
    for side in (-1, 1):
        wing = bpy.data.objects[f"TKM16_Pod_FrontLampWing_{side}"]
        wing.hide_render = True
        wing.hide_set(True)

        housing = bpy.data.objects[f"TKM18_FrontLampHousing_{side}_Outer"]
        material = housing.data.materials[0]
        mount = saddle(f"TKM21_FrontOpticSaddle_{side}", side, material)
        records.append(
            {
                "side": side,
                "saddle": mount.name,
                "housings": [
                    f"TKM18_FrontLampHousing_{side}_Outer",
                    f"TKM18_FrontLampHousing_{side}_Inner",
                ],
            }
        )

    top_control["front_optic_mechanism"] = (
        "paired lamp tubes embedded in broad molded saddles attached to top hatch"
    )
    manifest = {
        "version": 21,
        "source": os.path.basename(bpy.data.filepath),
        "mounts": records,
    }
    scene["TKM21_front_optic_manifest"] = json.dumps(manifest)
    scene["TKM21_revision"] = (
        "Front observation lamps physically mounted to roof with visible faceplates and saddles."
    )
    scene.frame_set(2)
    scene.frame_set(1)
    rig.update_tag()
    bpy.context.view_layer.update()
    return manifest


if __name__ == "__main__":
    result = apply()
    bpy.ops.wm.save_as_mainfile(filepath=OUTPUT)
    print("TKM21_FRONT_OPTIC_REPAIR=" + json.dumps(result), flush=True)
