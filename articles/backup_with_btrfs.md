<!--
title: "使用 Btrfs 进行数据管理与备份"
created: 2021-05-06T01:59:46+0800
tags:
- linux
- btrfs
- backup
-->

# 0. Intro

Btrfs 是个知名的 CoW (Copy-On-Write) 文件系统，其模块维护在主线 Linux 。
它凭借 CoW ，支持一大票特性，也仍有一部分特性不稳定或有性能问题。
可以在 [Btrfs Wiki][btrfs_wiki] 看到各种特性在最新 Linux 中的稳定性情况。

之前看了 Farseerfc 写的一篇[介绍 Btrfs 和 ZFS 底层实现上异同的文章][btrfs_vs_zfs]，感觉 Btrfs 真香，就入坑了。

于是本文主要介绍一下 Btrfs ，它在我个人主力电脑上的使用，以及备份相关操作。

Btrfs 主要吸引我的是这些：
- BTree + Reference links
  要是让我来实现这个，我肯定也这么写。
- Data checksum 
  有助于在第一时间发现错误，尽可能减小损失。
  上次 [EXT4 爆炸事件][ext4-broken]让我觉得，感觉自我检查还是挺重要的
- Subvolume, snapshot, reflink copy 
  非常适合管理比较重要的数据，给误操作提供滚回的机会，同时又非常轻量。
- btrfs send 
  文件系统级别的增量同步
- Transparent compression
  对于代码呀配置呀这种文本文件效果拔群，而且可以以文件或目录为单位单独配置开关。
- 是一个**文件系统**。
  这条是对标 ZFS 这种重量级存储管理系统的。
  ZFS 的使用、配置、内存消耗等，都与一个一般通过文件系统有较大差距，感觉不太适用于个人桌面电脑使用。


# 1. 子卷（Subvolume）管理

在 Btrfs ，子卷类似于一个自动挂载不同文件系统的目录：需要特殊命令创建，有不同的设备号（`st_dev`/`st_rdev`），
禁止跨文件系统的命令不花跨越子卷边界， `mv` 需要先复制再删除等等；
某些情况下又类似于一个普通目录：可以直接 `rm -rf` 删除。

- *子卷是挂载（`mount`）的单位*

  刚格式化好的 Btrfs 文件系统即包含一个空的根子卷，默认即挂载它。
  你可以使用挂载选项 `subvol=` 来指定挂载另一个子卷。

- *子卷是快照的单位，快照是一种创建子卷的方式*

  创建快照是 $(O(1)$) 的，它相当于创建一个新的根节点，引用另一个子卷里的目录，
  等到实际写入的时候再分割分配新的节点。
  由于子卷和快照只是创建方式的区别，下文对这俩名词不做区分，但通常快照指的都是只读子卷。

- *可写子卷和普通目录一样可以被移动或删除*

- *只读子卷相当于只读文件系统*

  它本身可以被改名，但不能被移动到其他目录（小坑）。

- *子卷直接不能简单移动文件，但可以浅复制*

  使用 `cp -a --reflink=always` 来进行浅复制文件。
  它会创建新的文件元数据节点，但仍引用原来的数据块，故是 $(O(1)$) 的。

主要命令在 `btrfs subvolume` 下，可以参考 `man`/`tldr` 或 [Btrfs Wiki][btrfs_wiki]，
常用指令就这么几条：

- `sudo btrfs subvolume list <some-path>`

  列出某个路径所在的 Btrfs 文件系统中整个子卷树的信息。
  由于是列出整个文件系统，显然需要 `sudo`。

- `btrfs subvolume create <dest>`

  创建空子卷，用户权限即可执行。

- `btrfs subvolume snapshot [-r] <source> <dest>`

  给一个子卷创建快照，用户权限即可执行， `-r` 表示创建只读快照。
  只读属性也可后期通过 `btrfs property set <subvol> ro true` 来设置。
  注意上面已经提到，原子卷只在创建快照的这一瞬间被用到，然后两者就基本互相独立了，
  修改删除都不受影响。

- `[sudo] btrfs subvolume delete <subvolume>`

  删除某个子卷。
  这个操作默认需要 `sudo`，除非在整个 Btrfs 文件系统挂载选项上开启 [`user_subvol_rm_allowed`]，
  那么只要操作用户是子卷目录所有者即可删除。
  
  注意：
  1. 可写子卷可以直接通过 `rm -rf` 来递归删除，因为空子卷可以直接使用 `rmdir` 删掉，
     不一定得使用这个命令。
  2. 即使开了上述挂载选项，只读子卷仍然不能被非 root 用户直接删除，你得先设置成可写。
     但 root 用户总是可以直接删掉任意子卷。
  3. 删除子卷可能会导致一堆文件因失去引用而被释放，可能需要一些时间，这个命令并不会等到他们执行完毕，
     除非手动指定 `--commit-each`/`--commit-after`。

由于根子卷比较特殊，是最顶层的子卷，其他子卷挂载它下面形成一个树结构。
个人不建议直接挂根子卷使用，因为如果需要重新组织结构，你会发现没法移动它，显然不能把根移动到其他位置。
（当然也有换根这种操作，但有点过于复杂了）

由于历史原因，我这台台式机仍使用 EXT4 挂根（之后可能打算迁移）。
故最终配置了 Btrfs 文件系统里的子卷 `/@home-oxa` 挂载到 `/home/oxa` 。
之所以挂载到自己家目录而不是 `/home` ，是为了保证家子卷的权限是自己的，简化操作，以及便于给整个家目录打快照。
毕竟把所有人的家放在一起管理挺怪的不是吗？

在家目录下，我创建了个子卷 `storage` 目录用来放所有需要备份管理的重要数据；
然后对某些不能修改数据目录的软件，符号链接之。
最好做到剩下家子卷里只有配置和缓存文件（即丢了不心疼也没损失，只是下次使用稍微费点时间而已的东西）。
由于我使用 NixOS 配合 [`home-manager`] ，统一管理这些符号链接和数据目录路径非常方便。

# 2. 自动快照

我在 `storage` 下创建了个目录专门用来放它的快照，用来给手贱误操作留后路，使用创建时间为快照名方便索引。
目录树大概长这样：

```
- /home/oxa [subvolume]
  `- storage [subvolume]
     `- .snapshot-auto
     `  `- 2021-05-05T00:00:00Z [snapshot]
     `  `- other snapshots...
     `- other data...
```

由于 Btrfs 创建快照是 $(O(1)$) 的，非常轻量，我直接配了 `systemd-timer` 每天自动快照。
不过还是要记得定期或自动清理的过期快照，
因为进行了删除或修改后，原先的数据仍然会因快照而被留存着占用空间，需要删掉快照才能释放。
我目前配置了清理 30 天前的快照，并保留最新的至少 30 个快照（避免一个月没开机结果全清了）。

自动快照和清理脚本参见我的 [NixOS 配置][nixos_config]

# 3. 跨盘备份

我们已经整理好数据，配好子卷和自动快照了。
但他们都在一块 NVME 盘上，万一出什么事，盘坏了或丢了怎么办？

这时我们就需要后备存储进行备份了，可以选择一块廉价的低速 HDD 盘，定期物理备份；
有条件的最好再多来几块，最好在来个异地容灾盘放外地或随身携带（避免[遭到偷窃][lily_theft]）。

然后我们首先在备份盘上格式化好 LUKS （记得设个强密码） 和 Btrfs 文件系统。
按例在根下创建一个子卷来放我们的备份。
由于我们的备份用仓库盘是个 HDD ，我们可以顺势开启透明压缩来尽可能降低写入量：
```bash
btrfs property set <path> compression zstd
```
压缩属性是作为扩展属性（`xattr`）存在元数据上的，而且目录里创建的子目录或文件会自动继承这个属性，这就是我们想要的啦。

首次备份，我们直接使用 `btrfs send`/`btrfs receive` 的简单形式，
把一个快照（需要是只读的）通过管道发送出去，并在另一个文件系统接受。
操作会保留所有能保留的元数据，实际效果和 `rsync` 类似。

```bash
sudo btrfs send <path-to-ro-snapshot> | sudo btrfs receive <path-to-dest>
```

**注意：**
1. `send` 和 `receive` 都需要 `sudo` 。
   前者可能是因为需要访问非当前用户所有的文件，后者需要恢复 `owner`/`group` 信息，
   而且还有个 [Bug 允许创建硬链接到任意文件][btrfs_receive_bugs]。
2. 注意这里的 `<path-to-dest>` 并不是目标快照名，而是放目标快照的目录，
   实际快照会出现 `<path-to-dest>/<name-of-snapshot>` 下。
3. 由于 `btrfs receive` 会[先创建子卷，复现写入，最后标记为只读][btrfs_receive_bugs]，
   在同步过程中不能同时写备份目标的那个临时子卷，不然会造成一些不一致。

# 4. 跨盘*增量*备份

已经同步完第一趟了，过了一段时间，我们对数据进行了一些增删查改，需要更新备份。

使用增量版的 `btrfs send` 即可。

```bash
sudo btrfs send -p <path-to-parent-ro-snapshot> <path-to-ro-snapshot> | sudo btrfs receive <path-to-dest>
```

我们只需要加一个 `-p` 选项指定上次已经同步好的快照（它必须在目标文件系统上已经存在）。
然后 `btrfs send` 会生成一堆增量操作，省略掉并没有变化的数据或元数据，发送给对面 `btrfs receive` 来重现。

# 5. 更多？

注意到 `btrfs send` 是可以输出到文件的，我们也可以把输出的文件加密后丢上网盘来实现云备份，
丢上去增量 `send` 的输出也可以实现增量更新。
虽然听起来有点怪但好像挺可行的，但这样就不能临时抽取其中一个文件来用了，增量更新链长了之后恢复也会变得麻烦。


# Reference

- [Btrfs Wiki][btrfs_wiki]
- [Btrfs vs ZFS 實現 snapshot 的差異][btrfs_vs_zfs]
- [电脑被盗事件 - 依云's Blog][lily_theft]
- [auto-snapshot-storage.nix - oxalica/nixos-config][nixos-config]

[btrfs_wiki]: https://btrfs.wiki.kernel.org/index.php/Status
[btrfs_vs_zfs]: https://farseerfc.me/btrfs-vs-zfs-difference-in-implementing-snapshots.html
[`user_subvol_rm_allowed`]: https://btrfs.wiki.kernel.org/index.php/Manpage/btrfs(5)#MOUNT_OPTIONS
[`home-manager`]: https://github.com/nix-community/home-manager
[lily_theft]: https://blog.lilydjwg.me/2017/6/27/theft-of-my-laptop.209945.html
[btrfs_receive_bugs]: https://btrfs.wiki.kernel.org/index.php/Manpage/btrfs-receive#BUGS
[nixos-config]: https://github.com/oxalica/nixos-config/blob/b2a71b2493859fe71273c2c6a03c3b44b638f780/home/modules/auto-snapshot-storage.nix
[ext4-broken]: ./?article=fix_nixos
