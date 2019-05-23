<!--
title: Notes about Let's Encrypt Certbot
created: 2018-09-06T00:10:00+0800
tags:
- note
- letsencrypt
- ssl
- linux
- certbot
modified:
- time: 2019-05-23T18:18:33+0800
-->

> [_Let's Encrypt_](https://letsencrypt.org/) 不过是个免费 SSL 证书签发单位罢了。

> [_Certbot_](https://certbot.eff.org/) 不过是个自动 SSL 证书签发/续命脚本罢了。

# 0. Pre

**有了域名和服务器，当然要搭 HTTPS 啊，怎么能裸奔呢？**

好吧，暑假回来发现服务器的证书过期了，续命失败。

研究发现学校新造的防火墙禁了 ipv6 传入链接，
看来服务器外面进的话跳板免不了了。（sigh）

于是顺便研究下用 DNS Challenge 给证书续命。


# 1. Install

这里是 Ubuntu - nginx 的方案，可以 `apt-get`，
跟着[官网][certbot_install]一步步来即可。

然后你得到了 `sudo certbot`


# 2. HTTP Challenge

- 需要一台 *能从外网HTTP访问* 的服务器

非常简单。

**首先关掉 `nginx`！！**
然后，

```shell
certbot certonly [-d <domain>]
```

按提示选择 `Temporary HTTP Server` （大概叫这个） ，
输入邮箱即可成功（不太明白这是要干啥，不过只用第一次输入）。

基本上秒签。

# 3. DNS Challenge

- 需要一台 *能连外网* 的服务器

这里只有手动方法，自动可能需要域名服务商支持，就挺麻烦了。

```shell
certbot certonly [-d <domain>] --manual --preferred-challenges dns
```

我就测试了 renew ，不指定域名的话会让你输入；签发新证书流程未测试（TODO）。

按提示在一个域名（应该是指定域名的子域名）设置 TXT 记录，等自己 `dig` 成功后继续即可。

# 4. ... About `nginx` configuration

```
ssl_certificate      /etc/letsencrypt/live/<domain>/<fullchain.pem | cert.pem>;
ssl_certificate_key  /etc/letsencrypt/live/<domain>/privkey.pem;

listen 443 ssl default_server;
listen [::]:443 ssl default_server;
```

注意到只给 `cert.pem` 的话， `curl` / `wget` 会因为[默认根证书不认识 Let's Encrypt CA][ca_error]，
导致证书认证失败。
不过最新版 Chrome / Firefox 可以认证，没任何问题。

可以视情况指定 `fullchain.pem` 使用全证书链，这样 `curl` / `wget` 可以正常工作。

（直觉上会有一些流量/效率损失？不管了不管了）

哦对了，还有 80 -> 443 的重定向。让主服务器只开 443 ，然后再个这个即可：

```
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name <domain>;

    location / {
        rewrite ^(.*)$ https://$server_name$1;
    }
}
```

# Reference
1. [Certbot Install (Ubuntu - nginx)][certbot_install]
2. https://serverfault.com/questions/750902/how-to-use-lets-encrypt-dns-challenge-validation
3. [ISSUE: Let's Encrypt CA not included in Ubuntu's CA bundle][ca_error]


[certbot_install]:
    https://certbot.eff.org/lets-encrypt/ubuntuartful-nginx

[ca_error]:
    https://github.com/certbot/certbot/issues/2026
