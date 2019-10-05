<!--
title: "Notes about scp & rsync"
created: 2019-09-29T02:17:40+0800
tags:
- note
- linux
- cli
-->

> 没啥，就是复制文件而已...

# scp

```bash
$ scp [-Cr] <source_files...> ssh_server:remote_path
$ scp [-Cr] ssh_server:remote_path... <local_target>
```

where
- `-C` 传输压缩 (gzip)
- `-r` 递归复制目录树

# rsync

```bash
$ rsync [opts...] <source_files...> ssh_server:remote_path
$ rsync [opts...] ssh_server:remote_path... <local_target>
```

where
- `-v` 显示复制的每个文件（单位是文件）
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

- 传大文件用 `scp` 不小心断了，可以用 `rsync --append-verify` 断点续传
- 实时同步可以用 inotify 配合 rsync ，我写了个脚本 [watch-run][watch-run] 可以方便地

  ```bash
  watch-run -t 1 . --immediate --exclude .git -- \
    rsync -vcr --delete . remote:~/some_dir --exclude=.git
  ```

[watch-run]: https://github.com/oxalica/watch-run
