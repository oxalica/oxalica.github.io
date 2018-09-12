<!--
title: Notes about Markdown
created: 2018-09-06T00:53:00+0800
tags:
- note
- markdown
-->

> _Markdown_ 不过是个极简文本排版语言罢了。

# 0. Pre

虽然经常写 Markdown ，但鉴于总是有突发奇怪需求 <del>忘了</del>，所以记一下注意点好了。


# 1. Standard

- [Common mark 严格标准][common_mark]


# 2. Some of rules

- H1: `#`/下划线`===`
- H2: `##`/下划线`---`
  - 没有更多 h3 h4 h5 h6 了
- URL: `[text](href)`
- Image: `![alt](src)`
  - 上两个均可通过把小括号变成 **中括号** 来使用 Reference，如 `[text][1]`
- Reference: `[1]: url`
  - 似乎没说可以给 `:` 后换行
- UL: `*`/`-`
- HR: `---`/`***` 前一行是空行，然后也不用超过三个字符
- CODE 没有语言标记 （辣鸡！）

# 3. ...

- Comment
  - `[//] # balabala` 前一行空行
  - `<!-- balabala -->` 真正的暴力


## Reference
1. [common_mark][common_mark]
2. https://stackoverflow.com/questions/4823468/comments-in-markdown

[common_mark]: https://commonmark.org/help/
