# Yuwen Fu — 个人作品集网站

一个纯静态网站（无需服务器、无需安装任何东西），布局参考 Chirpy 风格：
左侧边栏 + 顶部搜索 + 首页作品列表 + Categories / Tags / Archives + 交互式 Résumé + About。
自带 **在线编辑器**，改内容、加作品、传图片都在浏览器里完成，一键发布到 GitHub Pages。

```
index.html   页面框架
styles.css   网站样式
app.js       网站逻辑（路由、渲染、Markdown、视频嵌入）
data.js      ← 所有内容（简历、作品、个人信息）。编辑器会自动改写这个文件
editor.js    编辑器（只有地址带 ?edit 时才加载，访客看不到）
editor.css   编辑器样式
assets/      你上传的图片/短视频（第一次用编辑器上传时自动创建）
```

---

### 正文里怎么放图片和视频

| 想要 | 做法 |
|---|---|
| 图片 / GIF | 工具栏 **🖼 Image** 上传（大图会自动压缩），或直接 **Ctrl+V 粘贴截图** |
| 短视频片段（≤25 MB） | 工具栏 **🎞 Clip** 上传 MP4/WebM |
| YouTube / Vimeo | 工具栏 **▶ Video link**，或把视频链接单独放一行 → 自动变成播放器 |
| 小标题 | `## 标题`（会自动出现在右侧目录） |
| 链接 | `[文字](https://...)` |

长视频建议传 YouTube 再贴链接（GitHub 单个文件不宜太大）。

##本地预览（可选）


## 简历 PDF

Résumé 页面点 **Download PDF** → 打印窗口里选 **另存为 PDF**（A4，一页）。

## 常见问题

- **发布后网站没变？** GitHub Pages 需要约 1 分钟部署，浏览器也可能有缓存，按 Ctrl+F5 刷新。
- **Publish 报 401/403？** token 过期或权限不对，按第二步重新建一个。
- **Publish 报 409？** 仓库是空的，先完成第一步上传文件。
- **想放弃没发布的修改？** Site → **Discard draft**。
