<!--
title: "Notes about scp & rsync"
created: 2019-09-29T02:17:40+0800
tags:
- note
- linux
- cli
modified:
- time: 2020-05-23T04:06:08+0800
-->

> 没啥，就是复制文件而已...

# scp

> 在 `openssh` 包里提供。

```bash
$ scp [-Cr] <source_files...> ssh_server:remote_path
$ scp [-Cr] ssh_server:remote_path... <local_target>
```

where
- `-C` 传输压缩 (gzip)
- `-r` 递归复制目录树

# rsync

> 在 `rsync` 包里提供。（废话）

```bash
$ rsync [opts...] <source_files...> ssh_server:remote_path
$ rsync [opts...] ssh_server:remote_path... <local_target>
```

无脑版本：`rsync -avz <source> <dest>`

注意 `<source>` 后有带不带 `/` 的区别（而 `<dest>` 没区别）：
- `rsync -r a b` -> 得到 `a/b/...`
- `rsync -r a/ b` -> 得到 `b/...`

详细参数：
- `-a` 归档/备份模式，原模原样复制。**不知道选啥就选它！**保留：
  - 目录（就是递归复制， `-r`）
  - 权限，组和用户 ID
  - 文件时间（**这对下次增量 rsync 很重要**）
  - 符号链接
  - 特殊文件（块设备、管道等等）
- `-v` 显示复制的每个**文件**（但单个文件没有进度，这个见下）
- `-c` 使用 checksum 比较文件，可能可以减少复制量（默认是大小&修改时间）
- `-r` 递归复制目录树
- `-z` 传输压缩，没说算法
- `--progress` 显示*单个文件*传输的进度
- `--delete` 源没有而目标目录有的，把目标目录的文件删掉（用于同步）
- `--exclude=<glob>` 无视某些文件，比如 `.git` ，可以指定多个 （和 `--delete` 共用时也不会删除这些东西）
- `--partial` 传输到一半中断的别删了
- `--append` 如有上次传输一半的文件，继续传输而不是重传
- `--append-verify` 同上，但先检查已有部分是不是对的

# 此外...

- **如果使用 ssh 连接目标，则需要 ssh 在 PATH 里！**在配 systemd service 的时候尤其需要注意。
- 传大文件用 `scp` 不小心断了，可以用 `rsync --append-verify` 断点续传
- 实时同步可以用 inotify 配合 rsync ，我写了个脚本 [watch-run][watch-run] 可以方便地

  ```bash
  watch-run -t 1 . --immediate --exclude .git -- \
    rsync -vcr --delete . remote:~/some_dir --exclude=.git
  ```

[watch-run]: https://github.com/oxalica/watch-run
