# TACHIKOMA — 思考的形状

一份可以亲手转动的机械观察档案。网页 v22 以纸白、炭黑与塔奇克马蓝构成展览式界面，用大幅排版、柔和棚灯和留白，把蓝色思考战车放回视觉中心。

**网页版本为 v22，底层模型仍为 v21。** 本次更新重做网页展示与交互，没有改动 GLB 或 Blender 工程。模型从 Blender 5.2.1 LTS 导出为 glTF 2.0 / GLB，保留 v21 的四枚前观察灯承载鞍座，以及 v20 的双侧顶盖支撑、检修盖贯通铰链和中央双目轭架连接结构。

项目线上地址：<https://ds63.eu.org/tachikoma-web-viewer/>。本地修改需部署后才会反映在线上页面。

## 展品与交互

- 四种姿态：步行、轮式、开舱与巡逻。OPEN 展示顶盖、后舱门及双目检修组件展开后的座舱内构；PATROL 提供 426 帧、24 FPS、17.75 秒的完整动作。
- 自由环绕、平移与缩放，配合正面、侧面、背面及透视预设；支持自动环绕和视角复位。
- 日间 / 夜间灯光、线框观察、全屏查看，以及当前视角的 PNG 预览与保存。
- 巡逻动作可暂停和拖动时间轴；支持下载当前选中的 GLB。
- 响应式布局、键盘操作、操作指南，以及减少动态效果偏好；载入失败可重试，3D 启动失败提供早期巡逻录像入口。

鼠标左键 / 单指环绕，右键 / 双指平移，滚轮 / 捏合缩放。聚焦画布后，WASD 前后左右移动，Q/E 升降，Shift 加速，Home 复位。

## 本地预览

无需构建或安装前端依赖。在仓库根目录启动静态文件服务器，以 `docs/` 为站点目录：

```powershell
python -m http.server 4173 --directory docs
```

访问 <http://localhost:4173/>。请通过 HTTP 打开页面，不要直接双击 HTML。

Three.js 固定为 `0.180.0`，必要模块和 Draco 解码器随项目保存在 `docs/vendor/three/`。3D 查看器运行时不依赖外部 CDN；模型、脚本和解码器均由同一站点提供。依赖来源和许可证见 `docs/vendor/three/VENDORED.txt`、Three.js 的 `LICENSE` 与 Draco 目录内的 `LICENSE`。

## 重新导出 v21 模型

项目工作文件位于本地 Blender 工程中；仓库提交浏览器所需的压缩 GLB，不提交历史 `.blend` 文件。以下流程重建和验证模型资产，与网页 v22 的界面更新独立：

```powershell
D:\Blender\blender.exe --background tachikoma_v20_connection_repaired.blend --python scripts\fix_front_lamp_mounts_v21.py
D:\Blender\blender.exe --background tachikoma_v21_optic_mounted.blend --python scripts\validate_front_lamp_mounts_v21.py
D:\Blender\blender.exe --background tachikoma_v21_optic_mounted.blend --python scripts\export_web_v21.py
D:\Blender\blender.exe --background --python scripts\validate_web_glbs_v21.py
```

项目评估、已实施的改进和后续优化顺序见 [PROJECT_REVIEW.md](PROJECT_REVIEW.md)。

## 说明

这是非商业同人建模习作。角色及相关知识产权归原权利方所有。网页代码可自由参考；模型文件不授权用于商业用途或二次销售。第三方依赖适用各自附带的许可证。
