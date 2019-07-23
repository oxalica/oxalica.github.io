<!--
title: "0.1 + 0.2 = ?"
created: 2019-07-24T00:32:11+0800
tags:
- float
- meaningless
-->

> [dram][dram]: 我就是想知道为什么浮点误差大家都有，但是 0.1 + 0.2 永远是 JavaScript

首先显然按照 [IEEE 754][ieee] ，浮点运算结果肯定都是一致的，
所以主要就是默认“浮点转字符串算法”的区别。

只测了下我写过（记的起来）的语言，以下字典序

| &nbsp;        | &nbsp;                           | &nbsp;                |
| -             | -                                | -                     |
| awk           | `BEGIN { print 0.1 + 0.2 }`      | `0.3`                 |
| C++           | `std::cout << 0.1 + 0.2;`        | `0.3`                 |
| C/C++         | `printf("%f", 0.1 + 0.2);`       | `0.300000`            |
| Haskell       | `print (0.1 + 0.2)`              | `0.30000000000000004` |
| Idris         | `print (0.1 + 0.2)`              | `0.30000000000000004` |
| Java          | `System.out.println(0.1 + 0.2);` | `0.30000000000000004` |
| Javascript    | `console.log(0.1 + 0.2)`         | `0.30000000000000004` |
| Lua           | `print(0.1 + 0.2)`               | `0.3`                 |
| Nix expr lang | `0.1 + 0.2`                      | `0.3`                 |
| Nix expr lang | `toString (0.1 + 0.2)`           | `"0.300000"`          |
| PHP           | `echo 0.1 + 0.2`                 | `0.3`                 |
| Python(3)     | `print(0.1 + 0.2)`               | `0.30000000000000004` |
| Rust          | `println!("{}", 0.1 + 0.2);`     | `0.30000000000000004` |
| Sqlite        | `select 0.1 + 0.2;`              | `0.3`                 |
| Zsh           | `echo $((0.1 + 0.2))`            | `0.30000000000000004` |

# Reference:

- [Wiki: IEEE 754][ieee]

[dram]: https://github.com/dramforever/
[ieee]: https://en.wikipedia.org/wiki/IEEE_754
