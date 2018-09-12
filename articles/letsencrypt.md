<!--
title: Notes about Let's Encrypt Certbot
created: 2018-09-06T00:10:00+0800
tags:
- note
- letsencrypt
- ssl
- linux
- certbot
-->

> [_Let's Encrypt_](https://letsencrypt.org/) 不过是个免费 SSL 证书签发单位罢了。

> [_Certbot_](https://certbot.eff.org/) 不过是个自动 SSL 证书签发/续命脚本罢了。

# 0. Pre

**有了域名和服务器，当然要搭 HTTPS 啊，怎么能裸奔呢？**

好吧，暑假回来发现服务器的证书过期了，续命失败。

研究发信学校新造的防火墙禁了 ipv6 传入链接，
看来服务器外面进的话跳板免不了了。（sigh）

于是顺便研究下用 DNS Challenge 给证书续命。


# 1. Install

这里是 Ubuntu - nginx 的方案，可以 `apt-get`，
跟着[官网][certbot_install]一步步来即可。

然后你得到了 `sudo certbot`


# 2. HTTP Challenge (WIP)

- 需要一台 *能从外网HTTP访问* 的服务器

> TODO


# 3. DNS Challenge

- 需要一台 *能连外网* 的服务器

这里只有手动方法，自动可能需要域名服务商支持，就挺麻烦了。

```shell
certbot certonly [-d <host_name>] --manual --preferred-challenges dns
```

我就测试了 renew ，不指定域名的话会让你输入；签发新证书流程未测试（TODO）。

按提示在一个域名（应该是指定域名的子域名）设置 TXT 记录，等自己 `dig` 成功后继续即可。

# 4. ...

记得重启 `nginx` 才能生效

# Reference
1. [Certbot Install (Ubuntu - nginx)][certbot_install]
2. https://serverfault.com/questions/750902/how-to-use-lets-encrypt-dns-challenge-validation


[certbot_install]:
    https://certbot.eff.org/lets-encrypt/ubuntuartful-nginx
