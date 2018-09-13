$(function () {
  const templates = {
    main: $('#templ-main').text(),
    article: $('#templ-article').text(),
    tagList: $('#templ-tag-list').text(),
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
        return marked(inner);
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
    fetchText({
      url: './articles/' + encodeURI(slug) + '.md',
      success: function (rawData) {
        data.titleLink = false;
        const ret = parseArticleFile(slug, rawData);
        if (typeof ret === 'string')
          data.error = ret;
        else
          data.articles = [ret];
      },
      error: function () {
        data.error = 'Article Not Found'
      },
      complete: rerender,
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
    fetchText({
      url: './index.yml',
      success: function (rawData) {
        try {
          data.index = jsyaml.load(rawData);
        } catch (e) {
          data.error = 'Invalid Index Format: ' + e;
          rerender();
          return;
        }
        cb();
      },
      error: function (xhr, errorType, error) {
        data.error = 'Loading Index Failed: ' + errorType + '; ' + error;
        rerender();
      },
    });
  }

  function parseArticleFile (slug, rawData) {
    const ret = /^\s*<!--([\s\S]*?)-->/.exec(rawData);
    if (ret === null)
      return 'Article Meta Not Found';
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
    $('#main > .container').html(rendered);
    $('#main > .container .article-content').forEach(function (e) {
      renderMathInElement(e, {
        delimiters: [
          { left: '$(', right: ')$', display: false },
          { left: '$[', right: ']$', display: true },
        ],
      });
    });
  }

  function fetchText (options) {
    $.ajax({
      method: 'GET',
      url: options.url,
      mimeType: 'text/plain',
      dataType: 'text',
      cache: false,
      success: options.success,
      error: options.error,
      complete: options.complete,
    });
  }

  function getQueryParam (name) {
    const re = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    const ret = re.exec(location.search);
    if (!ret) return null;
    if (!ret[2]) return '';
    return decodeURIComponent(ret[2]);
  }
});
