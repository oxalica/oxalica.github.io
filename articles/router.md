<!--
title: Notes about Router
created: 2018-09-11T16:35:00+0800
tags:
- note
- network
- linux
-->

> 路由器不过是一台低配 Linux 罢了

# 0. Pre

由于一些原因入了 WR1200JS，折腾上 OpenWRT 后开始玩。

由于对硬件网络不太熟悉，就顺便 学mō习suǒ 一下计算机网络。

以下环境为 OpenWRT 上的 Linux，但别的系统一般都有对应物。


# 1. [Interface][wiki_interface]

> WIKI 上不知道在讲什么鬼。

讲道理应该是译成“接口”的，但总觉得少了什么。

我的理解是，它是 【数据链路层到网络层的抽象本身】这个 Object。
它一般有个 IP 地址，这才是给上层的接口，本机上层应用可以 _作为这个 IP_ 来通信。

它一般绑定一个物理设备（网卡/端口）作为底层。

Interface 是可以随便创建的，一个物理设备也可以绑多个 Interface，
比如同时有 IPv4 和 IPv6 地址，但要分开处理的情况。


# 2. [Bridge][wiki_bridge]

“桥接”、“网桥”，它是 Interface 的一种。

它一般绑定多个物理设备，当转发器（交换机），相当于把多个端口并起来，就像总线。

然后桥自己的 IP 意义当然还是一样啦，本机可以 _作为这个 IP_ 进桥和别的机器通信。

比如路由器默认的 LAN Interface 配成了桥，把各内网口和 WLAN 连一起，
然后桥本身 IP 就是 `192.168.1.1` 啦，控制页面就是 bind 到这上面的。


# 3. WLAN

都 8102 年了，当然要上 5G WIFI 啦。

这里有个坑，
可能是 OpenWRT 的原因， `Channel`（频道） 和 `Width`（带宽）选择余地贼大，
但却是 **_不能_ 随便组合搭配** 的。

选了不对的组合，会导致设备识别不到 WIFI，进而没法改回来，gg，reset 吧

可以参看 [WIKI][wiki_wlan] 来选择，尽量避开已有 WIFI 即可。


# Reference
1. [Wikipedia: Interface][wiki_interface]
1. [Wikipedia: Bridge][wiki_bridge]
1. [Wikipedia: WLAN channels at 5GHz][wiki_wlan]

[wiki_interface]: https://en.wikipedia.org/wiki/Network_interface

[wiki_bridge]: https://en.wikipedia.org/wiki/Bridging_(networking)

[wiki_wlan]: https://en.wikipedia.org/wiki/List_of_WLAN_channels#5_GHz_(802.11a/h/j/n/ac/ax)

