# Tachikoma Interactive Archive

网页当前展示塔奇克马 v20，模型从 Blender 5.2.1 LTS 导出为 glTF 2.0 / GLB，支持自由旋转、步行与轮式姿态对比、开舱内构展示，以及 426 帧巡逻动作预览。本版为上盖增加左右两套连续承载的铰接支撑和固定耳座，为顶部检修盖补全贯通铰链，并通过顶盖轴承轨、U 形轭架和端连杆明确双目组件的连接路径。原有 v19 外形、座舱细节与巡逻动作保持不变。

线上页面：<https://ds63.eu.org/tachikoma-web-viewer/>

## 本地预览

在仓库根目录启动任意静态文件服务器，并以 `docs/` 为站点目录。例如：

```powershell
python -m http.server 4173 --directory docs
```

然后访问 <http://localhost:4173/>。

## 重新导出

项目工作文件位于本地 Blender 工程中；仓库提交浏览器所需的压缩 GLB，不提交历史 `.blend` 文件。重新导出：

```powershell
D:\Blender\blender.exe --background tachikoma_v20_connection_repaired.blend --python scripts\export_web_v20.py
```

网页使用独立的 OPEN 模式展示顶盖、后舱门及双目检修组件展开后的座舱内构；v20 的展开件都具备可追踪到固定壳体的可见连接结构。查看器支持左键/单指环绕、右键/双指平移、滚轮/捏合缩放，以及聚焦画布后的 WASD 前后左右、Q/E 升降、Shift 加速和 Home/RESET 复位。

## 说明

这是非商业同人建模习作。角色及相关知识产权归原权利方所有。网页代码可自由参考；模型文件不授权用于商业用途或二次销售。
