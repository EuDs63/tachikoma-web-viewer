# Tachikoma v19 · 继续还原

打开 [tachikoma_v19_fidelity_refined.blend](tachikoma_v19_fidelity_refined.blend)。本轮修改了髋关节位置、站立脚位和腿部连接，重新生成巡逻动作；胸托、操纵杆、检修盖凸筋、后门锁条及头壳细节同步修复。v18 原文件保留。

[图文分部检查报告](audit/V19_REVIEW.html)包含参考、v18 和 v19 的对照图，以及动作验证结果。

直接播放开盖动画：打开 [v19 开盖演示工程](tachikoma_v19_opening_demo.blend)，按空格即可播放 10 秒的顶盖升起、双门展开、双目翻出及关闭过程，并有上方机位展示探头。[开盖视频](renders/tachikoma_v19_opening.mp4)也已单独导出；演示工程保留原巡逻 Action。

## 操作

时间轴按空格播放新的巡逻动作。需要调整速度、步幅或转弯，在 Text Editor 运行 `RUN_LOCOMOTION_CONTROLS.py`，再使用侧栏 Tachikoma 控件生成动作。动作生成器读取本版新的脚位和骨长。

选择 `TACHIKOMA_RIG`，在 Object Properties → Custom Properties 调整开舱：

| 属性 | 0 | 1 |
|---|---|---|
| `pod_top_hatch` | 大顶盖关闭 | 大顶盖升起 |
| `pod_rear_doors` | 双门关闭 | 双门展开 |
| `pod_sensor_hatch` | 小检修盖关闭 | 小检修盖翻开 |
| `pod_sensor_flip` | 双目留在盖下 | 随小盖翻出，默认值 |
| `head_service_insert` | 侧口胶囊收回 | 胶囊连端盖抽出 |

均支持 0–1 中间值及关键帧。查看空座舱，将大顶盖和双门开度设为 1。

## 复现

在项目目录运行：

```powershell
D:/Blender/blender.exe --background tachikoma_v18_reference_repaired.blend --python-exit-code 1 --python scripts/build_reviewed_v19.py
D:/Blender/blender.exe --background tachikoma_v19_fidelity_refined.blend --python-exit-code 1 --python scripts/validate_review_v19.py
D:/Blender/blender.exe --background tachikoma_v19_fidelity_refined.blend --python-exit-code 1 --python scripts/render_review_v19.py
```

轮胎尺寸和金属袖箍截面保持，腿壳按新骨长变换。新增外扩楔形步行趾及真实端槽，袖箍和腿肩孔有浅凹孔壁。静态头壳开孔和浅凹缝已经应用到网格；保留源码与旧版以便修改重建。
