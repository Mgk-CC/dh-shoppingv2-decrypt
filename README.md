# dh-shoppingv2-decrypt

DH ShoppingV2 解密分析工具是一个完全离线、本地运行的 Node.js 网页工具，用于处理用户自行提供且有权分析的 China Eastern shoppingv2 `req` 或 `res` 密文。

## 离线与隐私

- 服务只监听 `127.0.0.1`，默认地址为 `http://127.0.0.1:3000`。
- 页面不引用 CDN、外部字体、外部脚本、外部图片或远程 CSS。
- 项目不实现真实 shoppingv2 请求、自动抓取、批量请求、批量解密或代理转发。
- 不生成 Cookie、Token、`refer__1036` 或其他会话参数。
- 用户输入、密文、明文和分析结果不会写入 localStorage、IndexedDB、Cookie、服务端磁盘或日志文件。
- 页面刷新后输入与结果会消失。
- 导出文件只在用户主动点击下载按钮时由浏览器生成。

## 环境要求

- Windows 10/11 或其他可运行 Node.js 的本地环境。
- Node.js 18 或更高版本。
- npm 随 Node.js 安装即可，不需要额外依赖。

## WBOX 文件位置

原始 WBOX 文件必须保持在：

```text
vendor/wbsk_Wbox.js
vendor/wbsk_skb.js
```

这两个文件必须原样使用，不要格式化、压缩、重写或替换。项目不会猜测 WBOX 内部 Key，也不会使用 CryptoJS、Node.js crypto 或自写 AES 替代 WBOX。

固定 IV 为：

```js
[
  121, 96, 7, 103,
  57, 95, 61, 124,
  121, 96, 7, 103,
  57, 95, 61, 124
]
```

## 安装与启动

```bash
npm install
npm start
```

本项目没有第三方运行依赖，`npm install` 主要用于生成标准 npm 项目状态。启动后访问：

```text
http://127.0.0.1:3000
```

## 支持的输入格式

支持四种输入：

```text
纯 req Base64 密文
纯 res Base64 密文
{"req":"Base64密文"}
{"res":"Base64密文"}
```

输入会自动清除首尾空白。Base64 内容中只会自动清除空格、Tab、CR、LF，不会删除其他非法字符来强行修复密文。包装 JSON 同时包含 `req` 和 `res` 时会返回明确错误。

## req 与 res 的区别

- `req` 通常是 shoppingv2 请求密文，解密后包含查询航段、查询类型、产品类型、舱等、渠道等信息。
- `res` 通常是 shoppingv2 响应密文，解密后包含航班、票价、最低价等信息。
- 纯 Base64 输入无法从包装层判断 req/res，页面会显示为“纯密文”，再根据解密后的 JSON 结构识别为请求、响应或通用 JSON。

## 输出说明

- 原始 JSON：WBOX 解密并 `JSON.parse` 后得到的完整数据，不做删改。
- 清洗 JSON：递归删除 `null`、空字符串、空数组、空对象后的新对象，保留 `0`、`false` 和字符串 `"undefined"`。
- 分析 JSON：根据 shoppingv2 请求、响应或通用 JSON 结构生成的业务摘要。

## 导出说明

页面支持主动下载：

- `raw.json`：原始 JSON，两空格缩进，UTF-8。
- `clean.json`：清洗 JSON，两空格缩进，UTF-8。
- `analysis.json`：分析 JSON，两空格缩进，UTF-8。
- `flights.csv`：仅当识别为 shoppingv2 响应且存在航班时可用。

`flights.csv` 使用 UTF-8 BOM，适配 Windows Excel。每个票价占一行，逗号、双引号和换行会正确转义；以 `=`, `+`, `-`, `@` 开头的文本会做公式注入防护。

## 常见错误

- `EMPTY_INPUT`：输入为空。
- `AMBIGUOUS_WRAPPER`：包装 JSON 同时包含 `req` 和 `res`。
- `INVALID_WRAPPER`：请求体或包装字段类型不正确。
- `INVALID_BASE64`：Base64 字符集、长度或 padding 不合法。
- `INVALID_BLOCK_LENGTH`：Base64 解码后的密文字节数不是 16 的倍数。
- `PAYLOAD_TOO_LARGE`：输入超过 5 MB。
- `WBOX_INIT_FAILED`：原始 WBOX runtime 初始化失败，检查 vendor 文件是否存在且未被修改。
- `DECRYPT_FAILED`：WBOX 解密失败。
- `INVALID_JSON`：解密成功但明文不是合法 JSON。

## 测试与检查

运行单元测试：

```bash
npm test
```

运行语法检查和测试：

```bash
npm run check
```

解密测试优先使用授权固定向量；若没有可交付的独立固定测试向量，则使用原始 WBOX 做本地加密再解密的 round-trip 测试，并在交付说明中明确区分。

## 限制与非目标

- 不实现真实 shoppingv2 请求。
- 不实现自动抓取、批量请求或批量解密。
- 不绕过验证码、登录、访问控制或风险控制。
- 不加入遥测、统计、日志上传或崩溃报告。
- 不保存用户输入、密文、明文或分析结果。
- 本项目只用于处理用户自行提供且有权分析的数据。
