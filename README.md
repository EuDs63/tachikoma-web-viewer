# Tachikoma Interactive Archive

网页当前展示塔奇克马 v19，模型从 Blender 5.2.1 LTS 导出为 glTF 2.0 / GLB，支持自由旋转、步行与轮式姿态对比、开舱内构展示，以及 426 帧巡逻动作预览。本版继续修正四髋、腿座与站姿比例，重绑并重新生成巡逻动作；同时细化胸托、操纵杆、检修盖凸筋、后门锁条和头壳细节。操作说明见 [OPENABLE_V19_GUIDE.md](OPENABLE_V19_GUIDE.md)。

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
D:\Blender\blender.exe --background tachikoma_v19_fidelity_refined.blend --python scripts\export_web_v19.py
```

网页使用独立的 OPEN 模式展示顶盖、后舱门及双目检修组件展开后的座舱内构。

## 说明

这是非商业同人建模习作。角色及相关知识产权归原权利方所有。网页代码可自由参考；模型文件不授权用于商业用途或二次销售。
