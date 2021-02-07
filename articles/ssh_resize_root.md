<!--
title: 只通过 ssh 离线调整 root 分区大小
created: 2021-02-08T00:44:42+0800
modified:
- time: 2021-02-08T02:50:11+0800
tags:
- ssh
- nixos
- linux
-->

- 你有一台 NixOS 机器（or whatever），有 root 权限
- 它只有一个 ext4 root 分区（和一个 EFI 分区）
- 你没法物理接触，只能通过 ssh 访问它
- 假设网络连接通畅
- 你想要 (offline) shrink root 分区

> 由于某些原因，咱遇到了这个需求，但由于比较复杂一直没有尝试。
> 等到实际操作时已经可以物理接触那台机器了。
> 不过嘛，最终还是用”最复杂的方式“去完成了这件事，故作本文。

思路很直接：
- ext4 只能 offline shrink ，那就先 umount 它让它 offline 。
- 但是总得有个 root ，于是得用 root on tmpfs 。
- 得在 tmpfs 上执行最后的 resize2fs ，于是得在 tmpfs 上准备 ssh 等环境。

这里最复杂的部分是
“切换到新 root 并把正在运行（访问旧 root）的进程迁移到新 root ，
而不丢失控制权（注意到我们在用 ssh 操作）”。

StackExchange 上有一篇比较具体的“How to”文章，于是就以它为参考来试试看。

> [How to shrink root filesystem without booting a livecd][howto]

# 0. Schedule reboot (optional)

搞事情之前，可以先设一个计划重启。
万一哪里搞炸了，等待超时重启后可以恢复到之前的配置重新来过。
```bash
shutdown -r +1h  # 假设一个小时就可以弄完
```

不过在一切成功弄好之后， `resize2fs` 之前，
记得用 `shutdown -c` 取消掉这个计划，
不然操作被中断了可能就出大事了。

# 1. `configuration.nix`

由于需要把系统环境搬到新的 root ，当然最好是要先精简一下系统，
不紧迫的服务都可以关了，以减小系统闭包大小。

大概只用保留：
- `hardware-configuration.nix`
- `boot`
- `users`
- `networking`, `services.openssh`

然后切到新配置，但不更新 boot 配置
`nixos-rebuild test -I nixos-config=<path/to/simple-config.nix>`

接着再配上 root ssh 证书认证，直接 ssh 登录 root 。
这样可以避免 sudo/su 等 setuid 程序潜在的问题。
（它们在 `/run` ，而我们本身需要移动它）

# 2. Root on tmpfs

我们需要弄个新的 root 来代替旧的才能 umount 旧的。
显然新 root 里得准备足够的环境来跑起 systemd, ssh 等服务，
还得有个能用的 shell 。

对于 NixOS 而言，至少需要在新 root 中准备（复制去）这些路径：
- `/dev`, `/proc`, `/sys`, `/run`
  - 这些都是 mount point，只用留个空，到时候 `mount --move` 即可
- `/etc` ，ssh 等基础服务需要它
- `/root/.ssh` ，别忘了得 ssh 登录 root 的
- `/nix/store` ，只需要准备 `/run/current-system` 和 `/etc/static` 的闭包即可

```bash
mkdir -p /tmp/tmproot
mount -t tmpfs none /tmp/tmproot
mkdir -p /tmp/tmproot/{dev,proc,sys,run,root}
cp -a /etc /tmp/tmproot
cp -a /root/.ssh /tmp/tmproot/root
nix copy --no-check-sigs --to /tmp/tmproot /run/current-system /etc/static
```

# 3. [pivot_root(8) - change the root file system][pivot_root]

关键的一步换根。
然后把 `{dev,proc,sys,run}` 移到新位置，
于是一般通过程序就都能在新 root 上跑了。

注意这里有个坑。
coreutils 的 `mount` 会报 `Assertion 'selfPathSize > 0' failed`，
推测是 `/proc/mounts` 没挂载导致的，
故需要使用更简单的 busybox `mount` 。
（用 `mount` 挂载 `/proc` 需要先挂载 `/proc`，ummmmmm）

```bash
mount --make-rprivate /
mkdir /tmp/tmproot/oldroot
pivot_root /tmp/tmproot /tmp/tmproot/oldroot
# 最后再移 `/run` ，因为我们调用的 busybox 自己就在里面
for i in dev proc sys run; do /oldroot/run/current-system/sw/bin/busybox mount --move /oldroot/$i /$i; done
```

# 4. 在新 root 上重启服务

首先重启最重要的 sshd 。

```bash
mkdir -p /var/empty # sshd 需要这个，不知道是干啥的
systemctl restart sshd.service
```

先确认新的 sshd 可以连接后，再切换到新连接。
这样 shell 和 sshd 就跑在新 root 上了。

然后，**首先**重启 systemd 自己，然后重启其他服务。

> [SE 那个回答][how_to]的顺序是先重启服务再重启 systemd 自己，
> 这导致了 PAM 等一些 systemd 自己管理的东西还是会引用旧 root ，
> 最后还是要再次重启或停掉个别服务。
> 在这里浪费了一个下午的时间。

```bash
systemctl daemon-reexec
systemctl restart '*.service' '*.socket'
```

然后用 `fuser -vm /oldroot` 检查，可以发现只有一项 `kernel` 了。
如果有其他的话就再手动 kill 一下。

# 5. umount

上述操作无误的话，就可以成功卸载掉旧 root 了。

```bash
umount -R /oldroot
```

# 6. Do anything you want! ... or can you?

再次确认下 `mount` ，确实没有任何硬盘分区啦！
来开始干活：
```shell
# resize2fs /dev/sda2 199G # 别抄，这是咱的盘

resize2fs 1.45.6 (20-Mar-2020)
resize2fs: Device or resource busy while trying to open /dev/sda2
Couldn't find valid filesystem superblock.
```

WTF??? 不是明明所有盘都被 `umount` 了吗？怎么还是 busy 。
咱也没 `mount -l` 呀。

看了下[StackExchange 回答][howto]下也有同样遇到这个问题的人，
但似乎并未得到解决。
于是又花了一个晚上找原因……

# 7. Check all [Mount Namespaces][mount_ns]

Linux 很早就引入了 Mount Namespace 的概念。
它使得每个进程看见的 `mount` 可以局限在自己的 namespace 中，
而不一定全局一致。

> 实际上 [#3](#3-pivot_root-8-change-the-root-file-system) 的
> `mount --make-rprivate` 就是在调整 Shared subtree ，
> 可惜当时没仔细去查相关内容。

这里可以通过 `/proc/<pid>/mounts` 查看某个进程所看到的 `mount` 。
于是再检查一下是谁在偷偷占着盘：

```bash
grep sda /proc/*/mounts
```

看到了几个服务对 `/dev/sda1` 的引用，
遂再次重启之，直到 `grep` 也显示空。
由于此时 `/oldroot` 已经被卸了，它们没法再重新访问。

> 对，这里只看到了对 EFI sda1 (`/oldroot/boot` 但这个路径已经没了) 的引用，
> 而非旧 root sda2 (`/oldroot`) 本身。
> 虽然是两个分区，但大概是因为挂在了旧 root 的挂载点的里面，
> 所以还是影响到了 sda2 的独占访问？

最后再次 `resize2fs` ，成功啦！
任务完成！

# References

- [How to shrink root filesystem without booting a livecd - StackExchange][howto]
- [pivot_root(8) - Linux manual page][pivot_root]
- [mount_namespaces(7) - Linux manual page][mount_ns]
- [systemctl(1) — Linux manual page][systemctl]

[howto]: https://unix.stackexchange.com/questions/226872/how-to-shrink-root-filesystem-without-booting-a-livecd
[pivot_root]: https://man7.org/linux/man-pages/man8/pivot_root.8.html
[mount_ns]: https://www.man7.org/linux/man-pages/man7/mount_namespaces.7.html
[systemctl]: https://man7.org/linux/man-pages/man1/systemctl.1.html
