<!--
title: 粗学 DHT ： Kademlia 算法
created: 2019-06-07T23:24:21+0800
tags:
- distributed
- algorithm
-->

> 最近对 P2P 分布式系统比较感兴趣

# 0. Pre

之前在思考“假如每个 IPv6 都随机生成的话，有办法规划低于 $( O(n) )$ 的路由算法吗？”

群里有人提到了 DHT 可以解决，即 [Distributed Hash Table][dht] ，分布式哈希表。

于是正好学习一下。（又好久没写 blog 了）

# 1. DHT? Distributed Hash Table!

字面理解
- 就是一个超大的公共哈希表
- 分布式存储数据
- 支持在任意节点向其插入 KV Pair 或按 K 查 V
- 要求 K 是哈希值
  - 即足够随机，通常随便选个 [密码学哈希函数][chf] 比如 SHA3 即可

# 2. 算法及复杂度

DHT 乍一看需求感觉难以实现，但其实有不少优秀并被广泛使用的算法，
[Wiki][dht] 上就有算法比较表。

为了权衡 Set / Get 时间与每个节点连接数，通常选用时间和连接数都是 $( O(\log n) )$ 的算法，
其中 $( n )$ 是网络总节点数。（最差复杂度）

于是有一个简单的跳表算法 [Chord][chord] ，和常数更优秀且用的更多的 [Kademlia][kademlia] 算法。
（当然还有其他，不太了解了）

**这里只讲后者， Kademlia 算法。**

# 3. 前置定义与维护数据

一些参数（后文细说）
- 每个节点有个全网唯一 Id ，长度为 $( L \text{ bit} )$ ， Hash Key 的长度与此相同。因为 Hash 通常使用 SHA ，所以大概 128/160/256 。
- 桶大小 $( K )$ ，比如 20 。
- 最大单次请求数 $( \alpha )$ ，通常 3 。

首先我们定义两个 $( L \text{ bit} )$ 数字 $( A, B )$ 的 _距离_ 为 $( A \oplus B )$ ，即异或和。
下文所有 _距离_ 均指此。

两个节点的距离定义为它们 Id 的 _距离_。

每个 Key-Value Pair ，存储在 Id _距离_ Key 最近的若干结点上，通常为最近 $( K )$ 个。

每个节点维护 $( L )$ 个桶，每个桶维护不超过 $( K )$ 个 与其他节点的连接，
第 $( i )$ 个桶里的节点均 _距离_ 自己小于 $( 2^i )$ 。
即 $( \text{Id}_{\text{self}} \oplus \text{Id} )$ 至少有 $( L - i )$ 个前导零（有助于实现）。

# 4. Locating Resource: 寻找存储某个 Key 的节点

首先，我们求一下 Key 和自己 Id 的 _距离_ ，通过桶找到 Id _距离_ Key 最近的 $( \alpha )$ 个节点。

向这些节点发送 Key ，让对方回复 对方 Id _距离_ Key 最近的不超过 K 个节点连接信息（ IP 、端口、协议等），
即把对应桶里所有节点返回。

在返回的结点中，找到 _距离_ Key 最近 的 $( \alpha )$ 个结点再次发起请求，重复上述过程。

显然每次至少让 _距离_ 的最高一个 1 bit 变成 0 ，所以最差 $( O(\log n) )$ 轮后，
就找不到更近的了。

按照存储约定，找出上述过程中经过的所有节点中 _距离_ Key 最近的 $( K )$ 个，
它们即负责存储这个 Key-Value Pair 的节点。

# 5. Get / Set

既然已经找到目标节点了，直接向他们发起 查询或存储请求 即可。

考虑到整个网络在变化，通常存储有个过期时间；
并且每隔一段时间需要重新走一遍 #4 的流程找到最新节点重新发情 存储请求。

# 6. 及时更新变化

由于网络不停有新节点加入、旧节点退出，我们需要及时更新桶里的连接。

我们记录桶里每个连接的 **最后响应时间** ，发生任何数据交互时更新它。

在 #4 中，每次我们连接上新的节点时，将其加入对应的桶中。
若已满 $( K )$ 个，则 Ping 桶中最后响应时间 **最旧** 的节点，
**若通则丢弃新节点** ，否则丢弃旧节点并将新节点加入。

即**优先选旧**的，因为：
> 众所周知，那些长时间在线连接的节点未来长时间在线的可能性更大，
> 基于这种静态统计分布的规律，Kademlia 选择把那些长时间在线的节点存入K桶，
> 这一方法增长了未来某一时刻有效节点的数量，同时也提供了更为稳定的网络。
> ……
> 换句话说，新发现的节点只有在老的节点消失后才被使用。
>
> -- [Wikipedia 中文: Kademlia][kademlia_zh]

# 7. Bootstrap: 加入网络

无论如何，你首次连接必须使用预存的节点连接信息，连上至少一个任意节点。

随机生成自己的 Id ，然后走 #4 流程，把自己的 Id 作为 Key 发起查询。

就是 **我查我自己**

稍加思索即可知道这个操作的科学性。

拿到一些节点后，可以再通过查某个桶内的随机 Key 来扩充连上的节点数。

> Wiki 上说桶可以分裂，暂时还没搞懂这是什么操作。

# 8. 整理: 节点间可能的请求

都是 请求-应答 形式，一共四种
- PING -> ()
- FIND_NODE(Key) -> Connection[] 请求 Key _距离_ 最近的所有节点连接信息
- STORE(K, V) -> () 请求存储一个 KV Pair
- FIND_VALUE(K) -> V 请求读取一个 KV Pair ；没有则返回最近的节点链接信息

> 暂时搞不懂为啥 FIND_VALUE 没有的情况还要返回。

哦还有，请求的时候带上自己的 Id ，方便别人更新最后响应时间。

显然的，使用 UDP 连接更加合适。

# Reference

- [Wikipedia: Distributed hash table][dht]
- [Wikipedia: Cryptographic hash function][chf]
- [Wikipedia: Chord][chord]
- [Wikipedia: Kademlia][kademlia]
- [Wikipedia 中文: Kademlia][kademlia_zh]
- [P2P之Kademlia (一)][csdn_blog]
- [易懂分布式 | Kademlia算法][jianshu_blog]

[dht]: https://en.wikipedia.org/wiki/Distributed_hash_table
[chf]: https://en.wikipedia.org/wiki/Cryptographic_hash_function
[chord]: https://en.wikipedia.org/wiki/Chord_(peer-to-peer)
[kademlia]: https://en.wikipedia.org/wiki/Kademlia
[kademlia_zh]: https://zh.wikipedia.org/wiki/Kademlia
[csdn_blog]: https://blog.csdn.net/cz_hyf/article/details/5076988
[jianshu_blog]: https://www.jianshu.com/p/f2c31e632f1d
