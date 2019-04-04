<!--
title: "Linux 上该死的 文件创建时间/btime/crtime"
created: 2019-04-05T03:15:25+0800
tags:
- c
- linux
- unix
- fs
- todo
-->

# 0. Pre

```rust
Err(Custom { kind: Other, error: StringError("creation time is not available on this platform currently") })
```

```text
$ stat a
  File: a
  Size: 8               Blocks: 8          IO Block: 4096   regular file
Device: 10304h/66308d   Inode: 5539622     Links: 1
Access: (0644/-rw-r--r--)  Uid: ( 1000/     oxa)   Gid: ( 1000/     oxa)
Access: 2019-04-05 03:11:44.957769917 +0800
Modify: 2019-04-05 03:11:33.415664402 +0800
Change: 2019-04-05 03:11:33.415664402 +0800
 Birth: -
```

不支持个鬼咯，老娘用的如此高端文件系统 ext4 连 _文件创建时间_ 都没有的吗？

**其实当然是有的啦**

# 1. Linux 上的文件时间元数据

系统调用是 [`stat`][stat] ，根据结构体来看包含这几个：
- `atime` 最后访问时间（感觉这玩意儿费 SSD ？）
- `mtime` 最后修改（数据）时间
- `ctime` 最后修改（元数据，权限、父目录等）时间，通常数据修改也会导致这个被更新

竟然真没有“创建时间”。

上面用了命令 `stat` 可以看到确实有我们需要的 `Birth` 域，但显示为空。

（据说 `stat` 命令就是用 `stat` 调用实现的，那凭空显示这个纯粹坑人？？）

# 2. ext4 上的时间元数据

我们使用 Stackoverflow 大法，找到了
[Ref 2][so1]

呵！ `sudo debugfs` ！ 吓死了

非常幸运它并没有搞坏我的 fs ，而且确实有东西出来

> ext4 ：有的有的！您把邮箱留下，我回头发你。（逃

# 3. 用户态呢

根据 [Ref 2][so1] 的另一个回答，知道了 [`statx`][statx] 这个东西，除了上面三个时间外，还返回了 `stx_btime` ，这个就是我们千辛万苦要找的 “文件创建时间” 啦。

可以看到
> statx() was added to Linux in kernel 4.11; library support was added
       in glibc 2.28.

可见算是一个挺新的 syscall 。
好吧也不新了，[2017.4][linux-4.11] 。

立刻写了个 C 测试，很不幸没链接成功，不知道是不是 libc 版本问题。
对这种基础库的链接完全不熟悉，也不会调。（求教）

---

经过一番查找我们发现了一个 [DEMO][statx_example] 直接 syscall 来发起系统调用,太硬核了。
代码挺简单，直接看就好。

效果是这样：
```
$ ./statx a
statx(a) = 0
results=fff
  Size: 8               Blocks: 8          IO Block: 4096    regular file
Device: 103:04          Inode: 5539622     Links: 1
Access: (0644/-rw-r--r--)  Uid:  1000   Gid:  1000
Access: 2019-04-05 03:11:44.957769917+0800
Modify: 2019-04-05 03:11:33.415664402+0800
Change: 2019-04-05 03:11:33.415664402+0800
 Birth: 2019-04-05 03:11:10.023450053+0800
Attributes: 0000000000000000 (........ ........ ........ ........ ........ ........ ....-... .---.-..)
```

测试一下就知道结果是正确的，然后就是包装的事情了。

# 4. Rust?

Orz 了

- `std::fs::Metadata::created()` 就是最上面那个效果
- 搜了一圈并没有发现相关的 crate
- [`libc`](https://crates.io/crates/libc) 并没有 `statx` 及相关 struct
- 结论就是大概我们只能硬核 [`syscall()`](https://crates.io/crates/libc) ？

由于 `stat` 并不返回 birth time ，估计 `std` 直接实现成在 Linux 上钦定不可用了。 这个我可能得再具体看下源码。

奇怪的是 [issue](https://github.com/rust-lang/rust/issues) 从来没有提到过相关问题，大家都没这个需求？

或者我在想是不是可以搞个封装再发个包啥的...？

**TODO**

# Reference
- [stat, fstat, lstat - get file status][stat]
- [statx - get file status (extended)][statx]
- [Is there a way to know the creation time of a file in ubuntu?][so1]
- [Linux 4.11][linux-4.11]
- [statx example][statx_example]

[stat]: https://linux.die.net/man/2/stat
[statx]: http://man7.org/linux/man-pages/man2/statx.2.html
[so1]: https://stackoverflow.com/questions/3813541/is-there-a-way-to-know-the-creation-time-of-a-file-in-ubuntu
[linux-4.11]: https://kernelnewbies.org/Linux_4.11
[statx_example]: https://github.com/torvalds/linux/blob/master/samples/statx/test-statx.c



