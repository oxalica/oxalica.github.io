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

  function appSingleArticle (articleName) {
    fetchText({
      url: './articles/' + articleName + '.md',
      success: function (rawData) {
        const ret = parseArticleFile(rawData);
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

  function appSearch (tags, search) {
    data.error = 'Searching is not implemented yet'
    rerender();
  }

  function appIndex () {
    fetchText({
      url: './index.yml',
      success: function (rawData) {
        try {
          data.index = jsyaml.load(rawData);
          data.articles = data.index.articles;
        } catch (e) {
          data.error = 'Invalid Index Format: ' + e;
        }
      },
      error: function (xhr, errorType, error) {
        data.error = 'Loading Index Failed: ' + errorType + '; ' + error;
      },
      complete: rerender,
    });
  }

  function parseArticleFile (rawData) {
    const ret = /^\s*<!--([\s\S]*?)-->/.exec(rawData);
    if (ret === null)
      return 'Article Meta Not Found';
    try {
      const meta = jsyaml.load(ret[1]);
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
      console.log(e);
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
    return decodeURIComponent(ret[2].replace(/\+/g, ' '));
  }
});
