<!--
title: Log of fixing NixOS
created: 2020-04-04T01:58:18+0800
tags:
- note
- nix
- nixos
-->

> 这起 ext4 爆炸事故发生在 2020-02-25 左右，当时写了一些后坑了，现在补上。

因为未知原因，我的 NixOS 的根文件系统（ext4）炸了，爆了一堆校验错误。
用 `fsck.ext4` 修完后，`/nix/store` 里部分文件受影响，很多程序启动错误了。

这时候需要校验并修复 Nix store 。

## 1. 准备环境

既然已知有文件出问题了，最好还是别直接进系统直接折腾了，考虑到
- 基础程序可能炸了/有问题，非常不便或不可用，比如 systemd 和 vim （
- 错误配置的程序可能导致未预期的行为进而破坏其他数据

我们使用（经典的）系统安装盘 iso 启动作为恢复环境，其中 iso 直接去[官网][nixos_download]下载即可。

**坑**：记得这个 iso 比较特别，需要 `dd` 而不能直接解包到 U 盘

**懒**：以下几乎所有操作都需要 `root` 权限，请务必直接 `sudo su` 以避免麻烦。

## 2. 挂载，联网

```shell
mount /dev/YOUR_ROOT_PARTITION /mnt

# Input your wifi password in stdin
wpa_passphrase YOUR_WIFI_SSID >./wpa.conf

wpa_supplicant -iYOUR_WIFI_INTERFACE_NAME -c./wpa.conf
```

等待连上后 `Ctrl-Alt-F2` 开个新终端测试连接情况。
由于需要 dhcp ，可能 WIFI 连接上后还要等一会儿网才通。

**新终端也别忘了 `sudo su` 。**

## 3. 修复

命令非常自解释：

```shell
nix-store --verify --check-contents --repair --option store /mnt
```

它会检查每个 store path 是否和数据库里存的创建它时的 SHA 是否一致。
若有误，整个 store path 会被删掉重新 realise ，即要么去下载要么本地 build 。

> 文档说这个修复过程不是原子的，最好保证别被中断。

完成后重启从磁盘启动测试系统即可。

## 99. 修不好，弃疗，我要格掉重装

通常到上一步已经结束了，但万一万一 ext4 真的哪里挂了，
今天修完明天又炸，明天修完后天再炸，排除硬盘问题，那只能重新格式化重装系统了……
（太惨了，我就是）

备份好数据就不用说了，注意别忘了备份 `/etc/nixos` 。

然后格盘并重新挂载：

```shell
umount /mnt # 如果之前还挂着的话

mkfs.ext4 /dev/YOUR_ROOT_PARTITION # 当然也可以 btrfs ，不过别忘了 btrfs 上不能放 swapfile （
mount /dev/YOUR_ROOT_PARTITION /mnt

# 因为需要重建引导，别忘了挂上 boot
mkdir /mnt/boot
mount /dev/YOUR_BOOT_PARTITION /mnt/boot
```

> 注意不需要重新运行 `nixos-generate-config` ，它只是扫描硬件分析生成 `hardware-configuration.nix` 的，但它我们都已经备份好了，直接还原就是了。

直接把备份的 `/etc/nixos` 还原到 `/mnt/etc/nixos`，然后跑 rebuild 即可。
这里稍微要注意的是 channel 的配置。

```shell
# 我们需要准备所需 channel 的 nixpkgs 目录
# 可以偷个懒，直接在 iso 环境下加入需要的 channel ，然后在 .def-expr 里引用下载好的目录
nix-channel --add https://nixos.org/channels/nixos-unstable unstable # 我用的是 unstable 
nix-channel --update unstable

# 引用 iso 环境里的 nixpkgs，在 /mnt 里执行 rebuild
nixos-rebuild -I nixpkgs=/root/.nix-defexpr/channels/unstable --root /mnt
```

[nixos_download]: https://nixos.org/nixos/download.html
