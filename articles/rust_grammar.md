<!--
title: "寻找 Rust Grammar 之路"
created: 2019-07-16T22:49:58+0800
tags:
- rust
- parser
modified:
- time: 2019-06-22T18:50:55+0800
-->

> 因为最近需要（Ummm，等我 pub 了再加链接），所以在找一个具体完善的 Grammar of Rust Language

**TLDR: [The Rust Reference][rust_reference]**

# 官网上的 [Grammar][official_site]

听起来非常正规是吧？结果一看：

![](assets/rust_grammar/fixmes.png)

得了，半半半半成品。连函数语法都是 TODO 。

连给的 Keyword 表似乎都是好早之前的。
`async` `await` `try` 没有不说，
随便试了几个 `alignof` `catch` ，发现并可以当 Identifier 用啊...

# 翻源码找到的 [src/grammar][src_grammar]

看起来像是某个版本的 Grammar ，但不幸的是现在有点落后了，但至少值得参考。

Keyword 表似乎也是好早之前的。
没有 `async`/`await` （现在 stable 已经是保留字了）
不过说明了 [一些 Weak keyword][weak_keyword] ，虽然看起来也不齐...

# [编译器源码 in `libsyntax`][libsyntax]

可以作为一个 **最新 nightly 语法** 的参考。

不过太硬核了。递归下降不好读的...

官方有[相关说明][libsyntax_usage]如何使用 `libsyntax` 。
可惜我是想给它加 Error Recovery ，没法直接复用。

# [wg-grammar][wg_grammar]

经过一番搜索，发现分离出独立 Grammar 在 [RFC1331][rfc1331] 中被提出，
但似乎还是非常 WIP ，[相关 issue][rfc1331_issue] 还开着。

但[从中找到了][issue_comment]这个 [wg-grammar][wg_grammar] 。

看了下还是比较科学的，甚至有了 `try`/`await` （被标注为 unstable ）。
讲道理不认识它用的文法表示法，扩展名是 `.lyg` ，不过至少看起来还是比较轻松的。

当然这个 Repo 也是非常 WIP ，有很多 FIXME ；
不过运算符优先级和一些优先策略其实问题不大，可以通过其他文档辅助解决。

# [The Rust Reference][rust_reference]

在 `wg-grammar` 的 `README` 中被提到，是个很详细的文档。

随意翻了下，似乎挺完善了，各个板块都有文法及对应的解释。

也有不同 edition 的对比。

**那就以它为准了。**

[official_site]: https://doc.rust-lang.org/grammar.html
[src_grammar]: https://github.com/rust-lang/rust/tree/master/src/grammar
[weak_keyword]: https://github.com/rust-lang/rust/blob/2a663555ddf36f6b041445894a8c175cd1bc718c/src/grammar/parser-lalr.y#L1815
[libsyntax]: https://github.com/rust-lang/rust/blob/master/src/libsyntax/parse/parser.rs
[libsyntax_usage]: https://rust-lang.github.io/rustc-guide/the-parser.html
[wg_grammar]: https://github.com/rust-lang-nursery/wg-grammar
[rfc1331]: https://github.com/rust-lang/rfcs/blob/master/text/1331-grammar-is-canonical.md
[rfc1331_issue]: https://github.com/rust-lang/rust/issues/30942
[issue_comment]: https://github.com/rust-lang/rust/issues/30942#issuecomment-452617641
[rust_reference]: https://doc.rust-lang.org/nightly/reference
