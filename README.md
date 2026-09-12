# Tachikoma Interactive Archive

塔奇克马 v16 的静态交互展示页。模型从 Blender 5.2.1 LTS 导出为 glTF 2.0 / GLB，支持自由旋转、步行与轮式姿态对比，以及 430 帧巡逻动作预览。

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
D:\Blender\blender.exe --background tachikoma_v16_reference_reviewed.blend --python scripts\export_web_v16.py
```

## 说明

这是非商业同人建模习作。角色及相关知识产权归原权利方所有。网页代码可自由参考；模型文件不授权用于商业用途或二次销售。
