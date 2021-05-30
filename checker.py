#!/usr/bin/env nix-shell
#!nix-shell -i python3 -p python3Packages.pyyaml
from datetime import datetime, timezone, timedelta
import os
import re
import yaml

INDEX_FILE = './index.yml'
ARTICLE_PATH = './articles'
RE_META = re.compile(r'(?s)^<!--\n(.*?)\n-->')
RE_DATETIME = re.compile(r'(?s)^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)([+\-]\d{4})$')

def transDatetime(o: dict, k: str):
    assert isinstance(o[k], str)
    match = RE_DATETIME.match(o[k])
    assert match is not None, o[k]
    y, m, d, H, M, S, tz = match.groups()
    mul = { '+': 1, '-': -1 }[tz[0]]
    tz = timezone(timedelta(hours = mul * int(tz[1:3]), minutes = mul * int(tz[3:5])))
    tm = datetime(*map(int, (y, m, d, H, M, S)), tzinfo = tz)
    assert tm.timestamp() < datetime.now().timestamp()
    o[k] = tm

def isSorted(xs: list):
    return all(a <= b for a, b in zip(xs, xs[1:]))

def checkMeta(index: dict, articles: dict):
    briefMeta = index['articles']

    assert isinstance(briefMeta, list)
    assert set(m['slug'] for m in briefMeta) == set(articles.keys())

    for m in briefMeta:
        try:
            b = articles[m['slug']]
            assert isinstance(m['slug'], str)
            assert isinstance(m['title'], str)
            transDatetime(m, 'created')
            assert isinstance(m['tags'], list)
            assert all(isinstance(tag, str) for tag in m['tags'])
            assert isinstance(m['preview'], (type(None), str))

            assert m['title'] == b['title']
            transDatetime(b, 'created')
            assert m['created'] == b['created']
            assert m['tags'] == b['tags']

            if 'modified' in b:
                assert isinstance(b['modified'], list)
                for o in b['modified']:
                    assert set(o.keys()) == { 'time' }
                    transDatetime(o, 'time')
                assert isSorted(tuple(o['time'] for o in b['modified'])[::-1])
        except Exception as e:
            print(f'In {m.get("slug", "")}')
            raise e

    assert isSorted(tuple(m['created'] for m in briefMeta)[::-1])

def main():
    with open(INDEX_FILE, 'r') as f:
        index = yaml.load(f, Loader = yaml.FullLoader)

    articles = {}
    for fileName in os.listdir(ARTICLE_PATH):
        if fileName.endswith('.md'):
            path = os.path.join(ARTICLE_PATH, fileName)
            with open(path, 'r') as f:
                content = f.read()
            m = RE_META.match(content)
            articles[fileName[:-3]] = yaml.load(m[1], Loader = yaml.FullLoader)

    checkMeta(index, articles)

if __name__ == '__main__':
    main()
