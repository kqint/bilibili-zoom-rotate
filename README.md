# B站视频缩放旋转脚本

Bilibili网页端脚本，提供视频缩放、旋转、拖拽移动和视频状态记忆功能。
代码由AI生成。

<img src="./assets/功能演示.png" width="300" />


## 功能

- **视频缩放**：支持 50%-350% 缩放范围，通过滑块精确控制、`Alt + 滚轮` 快速缩放，或点击快捷按钮

- **视频旋转**：支持 0-359 度旋转，提供 0°/90°/180°/270° 快捷按钮和微调滑块

- **独立重置**：缩放和旋转滑块旁边各有重置按钮 ↺，可单独重置缩放或旋转

- **拖拽移动**：按住 `Alt键 + 鼠标左键` 可拖拽移动视频位置

- **还原屏幕**：当视频被缩放、旋转或移动时，播放器中央显示还原按钮，一键恢复默认状态

- **视频状态记忆**：自动记住每个视频的缩放/旋转/位置设置（非全局默认配置），再次打开同一视频（包括同一视频的不同分P）时自动恢复状态

  视频状态存储在浏览器 localStorage 中，键名格式为 nbs_videoState_<视频BV号>。你可以在浏览器 DevTools → Application → Local Storage 中查看。开关状态存储在 nbs_memoryEnabled。

- **快捷键更改**：可在`shortcutConfig`中更改快捷键

## 安装方法

先安装浏览器扩展：[Tampermonkey](https://www.tampermonkey.net/)、[Violentmonkey](https://violentmonkey.github.io/) 或 [脚本猫](https://docs.scriptcat.org/)

#### 方式一：从脚本猫（ScriptCat）一键安装

1. 在浏览器中打开链接：[B站视频缩放、旋转 - 脚本猫](https://scriptcat.org/zh-CN/script-show-page/6120)
2. 点击页面上的 **"安装脚本"** 按钮。
3. 脚本管理器会弹出确认窗口，点击 **"安装"** 即可。

#### 方式二：从 GreasyFork 一键安装

1. 在浏览器中打开链接：[B站视频缩放、旋转](https://greasyfork.org/zh-CN/scripts/573748-b%E7%AB%99%E8%A7%86%E9%A2%91%E7%BC%A9%E6%94%BE-%E6%97%8B%E8%BD%AC)
2. 点击页面上的 **“安装此脚本”** 绿色按钮。
3. 脚本管理器会弹出新窗口，点击 **“安装”** 即可。

#### 方式三：手动复制脚本内容安装

1. 在 [bilibili-zoom-rotate.js](https://github.com/kqint/bilibili-zoom-rotate/blob/main/bilibili-zoom-rotate.js) 中复制完整代码
2. 点击浏览器右上角的脚本管理器图标（Tampermonkey 或 Violentmonkey）。
3. 选择 **“添加新脚本”**（或“新建用户脚本”）。
4. 删除编辑器中默认的所有代码，**完整粘贴** 刚刚的代码。
5. 按 `Ctrl+S` (Windows/Linux) 或 `Cmd+S` (Mac) 保存。
6. 保存后，脚本即会生效。

## 问题反馈与建议

欢迎通过 GitHub Issues 提交您的问题、建议或Bug报告。  
👉 [点击此处进入 Issues 页面](https://github.com/kqint/bilibili-zoom-rotate/issues)

## 许可证

[MIT](LICENSE)。

## 致谢与参考

本脚本的开发受到了以下优秀项目的启发，并参考了其实现思路：

- [**bili-cured-my-neck-pain**](https://github.com/heyManNice/bili-cured-my-neck-pain)  作者：[**heyManNice**](https://github.com/heyManNice)
- [**B站网页端视频缩放、旋转、拖拽脚本**](https://www.bilibili.com/opus/1078276575030411266) 作者：[**浮云里的浮云**](https://space.bilibili.com/1531643081)


> 如果觉得有用，请点亮 ⭐ Star 支持一下～
[![Star on GitHub](https://img.shields.io/github/stars/kqint/bilibili-zoom-rotate?style=social)](https://github.com/kqint/bilibili-zoom-rotate)