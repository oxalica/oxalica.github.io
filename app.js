window.addEventListener('load', function () {
  const templates = {
    main: document.querySelector('#templ-main').innerText,
    article: document.querySelector('#templ-article').innerText,
    tagList: document.querySelector('#templ-tag-list').innerText,
  };
  const data = {
    index: null,
    error: null,
    articles: null,
    archiveMode: false,
    titleLink: true,
    fmtLocalDate: function () {
      return function (templ, render) {
        const inner = render(templ).trim();
        return new Date(inner).toLocaleDateString();
      };
    },
    fmtMarkdown: function () {
      return function (templ, render) {
        const inner = render(templ).trim();
        const renderer = new marked.Renderer();
        renderer.link = function (href, title, text) {
          return '<a href="' + href
            + (title !== null ? '" title="' + title : '')
            + '" target="_blank">'
            + text
            + '</a>'
        };
        return marked(inner, { renderer: renderer });
      };
    },
    fmtUrlComponent: function () {
      return function (templ, render) {
        return encodeURIComponent(render(templ));
      }
    },
  };
  window._data = data;

  runApp();

  function runApp () {
    const articleName = getQueryParam('article');
    const tags = getQueryParam('tags');
    const search = getQueryParam('search');
    if (articleName !== null)
      appSingleArticle(articleName);
    else if(tags || search)
      appSearch(tags, search);
    else
      appIndex();
  }

  function appSingleArticle (slug) {
    fetchText('./articles/' + encodeURI(slug) + '.md', function (err, rawData) {
      if (err !== null)
        data.error = 'Article Not Found';
      else {
        data.titleLink = false;
        const ret = parseArticleFile(slug, rawData);
        if (typeof ret === 'string')
          data.error = ret;
        else
          data.articles = [ret];
      }

      rerender();
    });
  }

  function appSearch (targetTag, search) {
    fetchIndex(function () {
      data.archiveMode = true;
      data.articles = data.index.articles.filter(function (article) {
        return article.tags.some(function (tag) {
          return tag === targetTag;
        });
      });
      rerender();
    });
  }

  function appIndex () {
    fetchIndex(function () {
      data.articles = data.index.articles;
      rerender();
    });
  }

  function fetchIndex (cb) {
    fetchText('./index.yml', function (err, rawData) {
      if (err !== null) {
        data.error = 'Loading Index Failed: ' + err;
        rerender();
      } else {
        try {
          data.index = jsyaml.load(rawData);
          cb();
        } catch (e) {
          data.error = 'Invalid Index Format: ' + e;
          rerender();
        }
      }
    });
  }

  function parseArticleFile (slug, rawData) {
    const ret = /^\s*<!--([\s\S]*?)-->/.exec(rawData);
    if (ret === null)
      return 'Article Not Found';
    try {
      const meta = jsyaml.load(ret[1]);
      meta.slug = slug;
      meta.content = rawData;
      return meta;
    } catch (e) {
      return 'Invalid Article Meta Format: ' + e;
    }
  }

  function rerender () {
    const rendered = Mustache.render(templates.main, data, templates);
    document.querySelector('#main > .container').innerHTML = rendered;
    document.querySelectorAll('#main > .container .article-content').forEach(function (el) {
      renderMathInElement(el, {
        delimiters: [
          { left: '$(', right: ')$', display: false },
          { left: '$[', right: ']$', display: true },
        ],
      });
    });
  }

  function fetchText (url, cb) {
    const xhr = new XMLHttpRequest()
    xhr.addEventListener('load', function () {
      if (xhr.status === 200)
        cb(null, xhr.response)
      else
        cb(new Error('Error response: ' + xhr.status.toString()))
    })
    xhr.addEventListener('error', function () {
      cb(new Error('Connection error: ' + xhr.statusText))
    })
    xhr.open('GET', url)
    xhr.responseType = 'text'
    xhr.send()
  }

  function getQueryParam (name) {
    const re = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    const ret = re.exec(location.search);
    if (!ret) return null;
    if (!ret[2]) return '';
    return decodeURIComponent(ret[2]);
  }
});
