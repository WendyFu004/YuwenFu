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

## 一、第一次上线（只需做一次，约 5 分钟）

1. 注册 GitHub：https://github.com/signup
2. 新建仓库：https://github.com/new
   - 名字必须是 **`你的用户名.github.io`**
   - 选 **Public** → Create repository
3. 在新仓库页面点 **uploading an existing file**，把这些文件拖进去：
   `index.html` `styles.css` `app.js` `data.js` `editor.js` `editor.css` `README.md`
   （不要上传 `.claude` 文件夹）→ **Commit changes**
4. 仓库 **Settings → Pages**：Source 选 **Deploy from a branch**，Branch 选 **main / (root)** → Save
5. 1–2 分钟后打开 `https://你的用户名.github.io` ✅

## 二、连接编辑器（只需做一次）

1. 创建一个访问令牌（token）：https://github.com/settings/personal-access-tokens/new
   - Token name：随便，比如 `site-editor`
   - Expiration：建议选 1 年（到期后再建一个即可）
   - Repository access：**Only select repositories** → 选你的 `用户名.github.io`
   - Permissions → Repository permissions → **Contents：Read and write**
   - Generate token，复制以 `github_pat_` 开头的那串
2. 打开 `https://你的用户名.github.io/?edit`
3. 编辑器里点 **Publish settings**，填用户名、仓库名、粘贴 token → **Save & test connection**

> token 只保存在你这台电脑的浏览器里，不会被发布到网站上。不要把它发给别人。
> 换电脑/换浏览器时，重新做第 2、3 步即可。

## 三、日常编辑（以后都这样）

1. 打开 `https://你的用户名.github.io/?edit`（或在网站上按 **Ctrl + Shift + E**）
2. 右侧编辑面板：
   - **Posts**：作品/文章。New post 新建；可设封面、分类、标签、置顶；正文用 Markdown
   - **Profile**：头像、名字、联系方式、社交链接、About 页面
   - **Résumé**：工作经历、项目、教育、技能、奖项（同时更新网页简历和 PDF）
   - **Site**：网站标题、页脚；备份下载 `data.js`
3. 左边页面会**实时预览**你的修改；修改自动保存为草稿（关掉浏览器也不会丢）
4. 点右上角 **Publish** → 大约 1 分钟后线上网站更新

### 正文里怎么放图片和视频

| 想要 | 做法 |
|---|---|
| 图片 / GIF | 工具栏 **🖼 Image** 上传（大图会自动压缩），或直接 **Ctrl+V 粘贴截图** |
| 短视频片段（≤25 MB） | 工具栏 **🎞 Clip** 上传 MP4/WebM |
| YouTube / Vimeo | 工具栏 **▶ Video link**，或把视频链接单独放一行 → 自动变成播放器 |
| 小标题 | `## 标题`（会自动出现在右侧目录） |
| 链接 | `[文字](https://...)` |

长视频建议传 YouTube 再贴链接（GitHub 单个文件不宜太大）。

## 四、本地预览（可选）

直接双击 `index.html` 就能看。本地也能用编辑器：地址栏末尾加 `?edit`，
改完可以 Publish（连了 GitHub 的话），或在 **Site → Download data.js** 下载后手动上传。

## 五、简历 PDF

Résumé 页面点 **Download PDF** → 打印窗口里选 **另存为 PDF**（A4，一页）。

## 常见问题

- **发布后网站没变？** GitHub Pages 需要约 1 分钟部署，浏览器也可能有缓存，按 Ctrl+F5 刷新。
- **Publish 报 401/403？** token 过期或权限不对，按第二步重新建一个。
- **Publish 报 409？** 仓库是空的，先完成第一步上传文件。
- **想放弃没发布的修改？** Site → **Discard draft**。
