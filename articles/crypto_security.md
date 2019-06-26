<!--
title: "密码学上需要注意的一些 安全性"
created: 2019-06-26T17:23:03+0800
tags:
- note
- crypto
-->

> 感觉 title 怪怪的，不过也找不到一个更合适的词来概括这些内容

# 1. 防[中间人攻击][mitm]

Expect: `A <-> B`

Actual: `A <->(as B) C (as A)<-> B`

- 使用基于非对称密钥的认证系统，但必须保证公钥分发也不会被 中间人攻击
  - 预设信任者，通过证书链认证
  - 使用共识：分布式链表 (Block chain), 分布式哈希表 (DHT)
- 使用篡改检测（Tamper detection），**较困难，通常不用**
  - 通过量子系统认证，保证不可篡改 （大雾
  - 构造一个超长时间 hash (10s+) 用以认证，通过中间人需要双倍时间来检测 （大雾

# 2. 防[重放攻击][replay]

密文或签名可能被截获，
并在 _现在_ 或 _未来_ 被 **重新发给目标，尝试进行同样的授权操作**。

- 善用 `nonce` ，验证其重复性避免 _现在_ 的攻击
  - 给对方发 `nonce` 请求其签名回复一个 hash 以认证
- 打时间戳，然后签名，避免 _未来_ 的攻击
- 数据传输可使用流加密 (chacha20-poly1305, etc) ，则密钥依赖位置 (offset) ，会话中途的包被重放是无效的。
  - 但创建连接的握手包仍可能被重放，需要用上面几条保障。

# 3. [前向安全性 (Forward security)][fs_wiki]

> 非对称才有这个概念

有人截获了密文，并在 _未来_ 破解了你的 **长期密钥** （身份密钥）。

这应该只影响之后的安全性，但 _过去_ 的密文仍然不可破解。

- 每次使用随机生成的 会话密钥 ，并使用 身份密钥 签名。
  - 会话结束后这个密钥就丢了，这样每个会话必须单独被破解才行
  - 当然不是完美的，但长期密钥更有可能泄露

# 4. 防特征分析

加了密的话，主要就是长度信息了。

- 通常在包末尾塞垃圾信息补齐长度

# Reference

- [Wiki: Man-in-the-middle attack][mitm]
- [Wiki: Replay attack][replay]
- [Wiki: Forward secrecy][fs_wiki]
- [知乎：如何理解前向安全性？和完美前向保密（perfect forward secrecy）区别？][fs_zhihu]


[mitm]: https://en.wikipedia.org/wiki/Man-in-the-middle_attack
[replay]: https://en.wikipedia.org/wiki/Replay_attack
[fs_zhihu]: https://www.zhihu.com/question/45203206
[fs_wiki]: https://en.wikipedia.org/wiki/Forward_secrecy
