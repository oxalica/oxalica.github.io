<!--
title: 初尝 SQLite
created: 2019-04-04T01:05:13+0800
tags:
- note
- sql
- sqlite
-->

> 之前的 Banner 感觉太装 X 了... 而且容易让人过度简化，所以这次没有。

# 0. Pre

因为长期写算法题，只关心计算而不关心存储，对数据库相关甚是不了解。
存储数据的话就是打开文件覆写 JSON （ Python 真好用， [`serde_json`](https://crates.io/crates/serde_json) 真好用），
重要点就 Write-Rename ，反正咱不关心效率是吧。

然后最近在写[拿来同步 OneDrive 的东西](https://github.com/oxalica/onedrive-sync)，
需要记录远端和本地的目录树状态，以及各种 Metadata ，又需要动态维护，显然不能再 json 一把梭了（

这种嵌入式数据库当然是 SQLite 啦。

# 1. [SQLite][official]

好像没啥好说的
- 开源
- 轻量
- 通常嵌入，提供 C ABI ，基本都是作为 lib
- 有 [Rust binding](https://crates.io/crates/rusqlite)，其他 ORM 也都有继承
- 流行，在轻量级领域基本是唯一选择。经常见到：
  - QQ message storage
  - Firefox bookmark storage

[加密组件](https://www.hwaci.com/sw/sqlite/see.html)是收费的，
不过咱暂时也没这需求。

# 2. SQL in SQLite

> 我竟然有一定的 SQL 基础，想想最早大概是因为早期参与的一个 Python 项目（抱歉，private repo ）用过一些。
>
> 重新复习了下，看了所谓的“高级”操作，其实都挺好学的。

和其他数据库系统差不多， SQLite 的 SQL 语法基本是标准的子集，
当然可能因为它 lite ，也确实少了一些东西，但基础操作基本完全无障碍。

这个不是教程，不教 SQL ，就只记下一些标准不完全一样的地方，以及一些坑。

**官网文档直接给出 [Syntax Graph](https://sqlite.org/lang_select.html) ，超级易懂，赞**

## a. 类型

半动态弱类型，分存储类，但底层存储类型是自适应的。
这个，虽然我喜欢纯静态的，但感觉这样也挺不错，就是不用纠结 int32 vs. int64 了（

存储类：
- `NULL`
- `INTEGER`
- `REAL`
- `TEXT`
- `BLOB`

好，很齐。

- 没有 `TIMESTAMP` 等日期时间相关，但相关函数，支持以下形式的参数：
  - `TEXT` 字符串大法好
  - `INTEGER` UNIX 时间戳大法好
  - `REAL` 浮点时间戳美滋滋
- 没有 `BOOL`
  - 行吧，整数 `0/1`

至于弱类型，有个叫 [Type Affinity](https://sqlite.org/datatype3.html#type_affinity) 的东西，
根据列自动 Cast。

不喜欢，不过确保类型匹配似乎就不需要管这些了。

## b. Trigger

- 只支持 `FOR EACH ROW`
- 一次只能 watch 下列三个**之一** ，妈耶，写了很多重复代码
  - `DELETE ON table`
  - `INSERT ON table`
  - `UPDATE OF col1, col2, ... ON table`
- 默认不开递归触发。感觉有道理，又好像怪怪的，怕不是兼容性所需。选项下见 `PRAGMA` 。

## c. Foreign Key

- 气死我了，竟然默认不开检查。选项下见 `PRAGMA` 。
- 支持直接 `REFERENCE table` 而不指定目标列，自动选用当前同样列名。
  （我们老师 SQLite 玩家，同学用 MySQL，就踩了这个坑）

## d. **不支持** `RETURNING`

获取新插入的自增 id 值的话，有个函数 [`last_insert_rowid`](https://sqlite.org/c3ref/last_insert_rowid.html)，
Binding 也支持它，或者直接 `SELECT last_insert_rowid();` 也行。

总感觉 `INSERT & RETURNING` 应该 Atomic 比较好，但人家的写锁粒度贼大，实际上并不会遇到打断的问题。

## e. 不支持 `UPDATE ... FROM`

用到才知道，不开心。

改写成用子查询的话可能损失效率，需要注意，可以试试用下面这个。

## f. 支持 `INSERT OR REPLACE` / `REPLACE`

还行，不过相当于先 Optional `DELETE` 后 `INSERT`，而非 Optional `UPDATE`。

所以作为上面 (e) 的 walkaround 的话，需要注意手动 merge 两张表的各列。

# 3. [`PRAGMA`s](https://sqlite.org/pragma.html)

列几个我觉得常用的。

不存的即时选项：
- [`foreign_keys`](https://sqlite.org/pragma.html#pragma_foreign_keys)
  竟然默认不开，赶紧开上， **坑**
- [`defer_foreign_keys`](https://sqlite.org/pragma.html#pragma_defer_foreign_keys)
  效率
- [`case_sensitive_like`](https://sqlite.org/pragma.html#pragma_case_sensitive_like)
  默认 `LIKE` 大小写不敏感？不知道标准怎么样，当然这个视情况开 **坑**
- [`recursive_triggers`](https://sqlite.org/pragma.html#pragma_recursive_triggers)
  默认不会递归，试了才发现。

存进文件的选项：
- [`application_id`](https://sqlite.org/pragma.html#pragma_application_id)
  自定义 magic number ， i32 ，会被放进文件头中间
- [`user_version`](https://sqlite.org/pragma.html#pragma_user_version)
  自定义 version number ， i32
- [`synchronous`](https://sqlite.org/pragma.html#pragma_synchronous)
  效率 vs. 可靠性

# 4. 性能相关

据说 Transaction Commit 速度很慢（文件 IO），甚至可能到 0.1s 量级，

大量顶层 `INSERT` 的话会因自动开临时 Transaction 导致极慢。（好像也不会这么写吧）

当然手动开个大 Transaction 就好了，也可以改相关的 sync 选项。


# 5. 多线程/多连接/并行/并发

首先，它当然是线程安全的。
加 Open option 可以切换单连接/多连接模式。

不幸的是，它因为 Lite ，只有**全局锁**。

幸运的是锁是 **RW Lock** ，可以多读或一写。

又不幸的是我们用默认参数**多连接乱玩是可能死锁的**，
详见 Ref 2 。
Ref 给出的建议是让每个 Transaction with Write 以 `IMMEDIATE` 方式开始。

当然如果全是写没啥读的话，也可以立刻弃疗，外部上 Mutex 变成单线程。（把锁从里面移到外面）

# Reference

- [官网文档][official]
- [sqlite3 多线程和锁 ，优化插入速度及性能优化](https://www.cnblogs.com/huozhong/p/5973938.html)

[official]: https://sqlite.org/
