<!--
title: Notes about Docker
created: 2018-09-13T21:38:57+0800
modified:
- time: 2018-09-29T02:41:53+0800
tags:
- note
- docker
- cli
-->

> Docker 大概就是一个轻量 VM 罢了。

# 0.

之前一直在 WSL 上，换上真正的 Ubuntu 后要重搭 php 环境。
然后开发环境搭建的文档早就死了，反正还是要重新慢慢试有哪些依赖，
就顺便看下 Docker 怎么玩。

所以这里的只有 Ubuntu 的食用方式。

# 1. [Install][install]

需要装的是 `docker-ce`，可以 `apt-get`，按[官方文档][install]一步步来即可。

然后你就得到了可执行的 `sudo docker`。 （笑

- 以下省略 `sudo` （（


# 2. [Command][command]

```
docker run
    [--name <container_name>]
    [-i -t | -d]
    [-p <host_port>[:<container_port>] | -P]
    [-v <host_dir>:<container_dir>]
    <image_name>
    [command] [args...]
```
  - `-i` 交互模式； `-t` 创建虚拟 tty
  - `-d` 在后台跑
  - `-P` 把所有端口 **随机** 开到宿主端口上
  - `-v` 挂载进去（默认 rw ）

---

- `docker exec [-i -t | -d] <container_name> <container_file_path>`
- `docker start [-i] <container_name>`

- `docker images`
- `docker pull <image_name>`
  - 下载
- `docker build <dir> -t <new_image_name>`
  - 构建 `<dir>/Dockerfile` ，保存镜像名为 `<new_image_name>`.
  - 一定要假装 `-t` 是必选
- `docker tag <exist_image_name> <new_name>`
  - 补名字/取别名。
- `docker rmi <image_name>`
- `docker ps [-a] [-q] [-l]`
  - 查看当前在运行的 container
  - `-a` 也显示已经死了的
  - `-q` 只输出 id ，方便丢给其他命令
  - `-l` 只输出最后（最新）的
- `docker kill [-s <signal=KILL>] <container_name...>`
- `docker stop [-t <wait_secend=10>] <container_name...>`
  - 结束，等，还不死再杀
- `docker attach <container_name>`
- `docker logs <container_name>`
- `docker port <container_name>`
  - 显示容器的端口映射

# 3. [Dockerfile][dockerfile]

- `FROM <image_name>`
  - 从某个 image 开始，一般放首行
- `RUN <sh_cmd...>`
  - 一般以步骤为单位去 RUN ，同一步骤很多命令行可以 `&&` 起来
- `ADD <host_file_path> <container_file_path>`
  - 复制进去
- `EXPOSE <container_port...>`
- `VOLUME <container_dir_path...>`
  - 设置挂载目录，以便外面 `-v` 挂进去
- `ENTRYPOINT <sh_cmd...>`
  - 设置启动入口命令，不指定启动命令直接 `run` 会启动这个

# 4. Issue

- 开了端口，却还是 `Connection reset`
  - 内部监听的问题，需要监听 `0.0.0.0`/`::` 而非 `localhost`/`127.0.0.1`/`::1`

# References
1. [官方 Ubuntu 安装文档][install]
2. [官方 Dockerfile 文档][dockerfile]
3. https://yeasy.gitbooks.io/docker_practice/content/image/
4. https://stackoverflow.com/questions/42319634/docker-connection-reset-by-peer

[install]:
    https://docs.docker.com/install/linux/docker-ce/ubuntu/

[command]:
    https://docs.docker.com/engine/reference/run/

[dockerfile]:
    https://docs.docker.com/engine/reference/builder/

