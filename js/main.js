// (c) 2019 Neruthes <https://neruthes.xyz>
// Licensed under GNU AGPL v3

var app = {
    flag: {
        didFinishPageLoadAlreadyInvoked: false
    },
    vars: {
        renderLang: 'en',
        entryId: null,
    },
    envVar: {
        defaultListLength: 10,
        localStorageNamespace: 'thewesttimes.com:',
        magicUuid_01: '56eb206d-f44c-4f62-a589-74fa5d801ad6',
    }
};

app.setTitleComponent = function (input) {
    document.title = `${input} — The West Times`;
    document.querySelector('#og-title').setAttribute('content', document.title);
    document.querySelector('#og-description').setAttribute('content', document.title);
};

app.setScene = function (scene) {
    document.body.setAttribute('data-scene', scene);
};

app.grand404 = function () {
    console.log('app.grand404()');
    app.setTitleComponent('404 Not Found');
    document.querySelector('.cp--main').innerHTML = (`<div class="cp--section-inner cp--scene" style="display: block;">
        <h2 style="text-align: center">404 Not Found</h2>
        <div style="text-align: center; padding: 30px 0;">
            <a href="/" style="
                font-size: 18px;
                font-weight: 400;
                color: #FFF;
                text-decoration: none;
                background: #07F;
                border-radius: 6px;
                display: inline-block;
                padding: 10px 25px;
            ">Homepage</a>
        </div>
    </div>`);
};

app.load = function () {
    if (location.search === '' || location.search.match(/^\?lang=(en|zh)$/)) {
        // Scene: home
        if (location.search === '') {
            location.href = '/?lang='+app.vars.renderLang;
        };
        app.setTitleComponent('Home');
        app.setScene('home');
        app.scene.home.load();
    } else if (location.search === '?about' || location.search.match(/^\?about&lang=(en|zh)$/)) {
        // Scene: about
        if (location.search === '?about') {
            location.href = '/?about&lang='+app.vars.renderLang;
        };
        app.setTitleComponent('About');
        app.setScene('about');
        app.scene.aboutThisSite.load();
    } else if (location.search.indexOf('?authors') === 0) {
        // Scene authors
        if (location.search === '?authors') {
            location.href = '/?authors&lang='+app.vars.renderLang;
        };
        app.setTitleComponent('Authors');
        app.setScene('authors');
        app.scene.authors.load();
    } else if (location.search.indexOf('?author-') === 0) {
        // Scene authorProfile
        app.setScene('authorProfile');
        if (!location.search.match(/\?author-(\d+)/)) {
            app.grand404();
            return 404;
        };
        var authorId_str = location.search.match(/\?author-(\d+)/)[1];
        var authorId = parseInt(authorId_str);
        if (!app.authors[authorId_str] || authorId.toString() !== authorId_str) {
            app.grand404();
            return 404;
        };
        if (!location.search.match(/&lang=(en|zh)/)) {
            location.href = `/?author-${authorId_str}&lang=`+app.vars.renderLang;
        };
        app.scene.authorProfile.load(parseInt(authorId_str));
    } else if (location.search.indexOf('?article-') === 0) {
        // Scene: detail
        if (location.search.match(/^\?article-([0-9]+)/)) {
            // With index
            var match = location.search.match(/^\?article-([0-9]+)/);
            var match_1 = parseInt(match[1]);
            app.setScene('detail');
            if (app.scene.detail.determineIndexValidity(match[1])) {
                // Valid index
                if (app.scene.detail.determineExistence(match_1)) {
                    // Good index
                    if (app.articles[match_1].articleUrl !== '/' + location.search) {
                        location.href = app.articles[match_1].articleUrl;
                    };
                    app.vars.entryId = match_1;
                    app.setTitleComponent(app.articles[match_1].title[app.vars.renderLang]);
                    document.querySelector('#cp--scene-detail--inner').innerHTML = app.scene.detail.render(match_1, 'normal');
                    app.didFinishPageLoad();
                } else {
                    // Does not exist
                    app.setTitleComponent('404 Not Found');
                    document.querySelector('#cp--scene-detail--inner').innerHTML = app.scene.detail.render(match_1, 'error404');
                };
            } else {
                // Invalid index
                app.setTitleComponent('404 Not Found');
                document.querySelector('#cp--scene-detail--inner').innerHTML = app.scene.detail.render(match_1, 'error404');
            };
        } else {
            // Without index
            location.href = '/?lang='+app.vars.renderLang;
        }
    } else {
        location.href = '/?lang='+app.vars.renderLang;
    };
};

app.xhrget = function (url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = callback;
    xhr.send();
    return xhr;
};

app.databaseBackbone = {
    parseData: function (rawData) {
        var dbJson = JSON.parse(rawData);
        app.articles = dbJson.articles.map(function (entry, index) {
            var tmpObj = entry;
            tmpObj.articleUrl = `/?article-${entry.index}--` + entry.title.en.replace(/[^\w\d]/g, '-').replace(/\-+/g, '-').replace(/[^\d\w-]/g, '').toLowerCase() + `&lang=${app.vars.renderLang}`;
            return tmpObj;
        });
        // Authors
        app.authors = dbJson.authors.map(x => x);
        app.listOfAuthorIdByMostRecentPublishing = [];
        // var recordedAuthors = [];
        var articles = app.articles.slice(0).reverse();
        var mostRecentArticleByAuthor = {};
        var totalArticlesByAuthor = {};
        articles.map(function (entry) {
            entry.authors.map(function (authorId) {
                if (app.listOfAuthorIdByMostRecentPublishing.indexOf(authorId) === -1) { // Not recorded yet
                    app.listOfAuthorIdByMostRecentPublishing.push(authorId);
                    app.authors[authorId].mostRecentArticle = entry.index;
                    app.authors[authorId].totalArticles = 1;
                    totalArticlesByAuthor[authorId] = 1;
                } else { // Already recorded
                    app.authors[authorId].totalArticles += 1;
                };
                if (!app.authors[authorId].articles) {
                    app.authors[authorId].articles = []; // Newest first
                };
                app.authors[authorId].articles.push(entry.index);
            });
        });
        app.authors.map(function (a) {
            if (!a.articles) {
                app.authors[a.i].articles = [];
                app.authors[a.i].mostRecentArticle = -1;
            };
        });
        // Load
        app.load(); // Start page routing
    },
    pickData: function (inputData, matchField, matchValue) {
        if (matchField === undefined || matchValue === '__ALL__') {
            return inputData;
        } else {
            return inputData.filter(x => x[matchField] === matchValue);
        };
    },
    load: function () {
        app.xhrget('/db.json', function (e) {
            app.databaseBackbone.parseData(e.target.responseText);
        });
    }
};

app.scene = {};

app.scene.home = {
    load: function () {
        document.querySelector('#cp--scene-home--list').innerHTML = app.scene.home.render(
            app.articles,
            undefined,
            undefined,
            app.envVar.defaultListLength,
            function () {
                document.querySelector('#js-List-RemaingItemsCount').innerHTML = app.articles.length-app.envVar.defaultListLength;
            }
        );
        document.querySelector('#cp--scene-home--nav').innerHTML = ({en:'Latest Articles',zh:'最新文章'})[app.vars.renderLang];
        app.didFinishPageLoad();
    },
    renderListItemBig: function (entryIndex) {
        var entry = app.articles[entryIndex];
        return `
            <div class="home--doc-entry home--doc-entry-big" data-entry-big-entry-index="${entry.index}" style="
                opacity: 0;
                transition: opacity 150ms ease;
            ">
                <div class="home--doc-entry-title" style="padding-top: 0;">
                    <a class="ff-serif" href="${entry.articleUrl}" style="
                        font-size: 34px;
                        font-weight: 600;
                        color: #000;
                        display: block;
                    ">
                        <div class="home--doc-entry-cover">
                            <img src="/cover/${entry.index}.png" style="display: block; width: 100%;">
                        </div>
                        <span class="home--doc-entry-title--text" style="display:block; padding-top: 10px;">${entry.title[app.vars.renderLang]}</span>
                    </a>
                </div>
                ${
                    (function () {
                        (new Array(13)).fill(1).map(function (x, i) {
                            setTimeout(function () {
                                document.querySelector('[data-entry-big-entry-index="' + entry.index + '"] .home--doc-entry-title').style.minHeight = (document.querySelector('[data-entry-big-entry-index="' + entry.index + '"] .home--doc-entry-cover').offsetHeight + 10) + 'px';
                            }, Math.pow(2, i));
                        });
                        return '';
                    })()
                }
                <style>
                [data-entry-big-entry-index="${entry.index}"] .home--doc-entry-title {

                }
                </style>
                <div class="home--doc-entry-status">
                    <span class="home--doc-entry-status-date ff-monosapce">${(new Date(entry.dateSubmit)).toISOString().slice(0,10)}&nbsp;</span>
                    <span class="home--doc-entry-status-authors">${
                        (entry.authors.length < 3) ?
                            ( entry.authors.slice(0,2).map(app.subScene.authorLabel.render).join(', ') ) :
                                ( entry.authors.slice(0,1).concat('etc').map(app.subScene.authorLabel.render).join(', ') )
                    }</span>
                </div>
                <div class="home--doc-entry--content-container" style="padding: 10px 0 5px;">
                    <p class="home--doc-entry--content-paragraph ff-serif" id="js--home--doc-entry--content-container-${entry.index}" style="font-size: 16px; padding: 0;">
                        ${(function () {
                            app.xhrget(`/db-en/` + entry.index + '.html', function (e) {
                                document.querySelector('#js--home--doc-entry--content-container-' + entry.index).innerHTML = (e.target.responseText).slice(e.target.responseText.indexOf('<p>')+3, e.target.responseText.indexOf('</p>'));
                            });
                            return 'Loading...'
                        })()}
                    </p>
                </div>
                ${
                    (function (entry) {
                        if (entry.index === app.articles.length - 1) {
                            document.querySelector('#og-image').setAttribute('content', '/cover/' + entry.index + '.png');
                        };
                        return '';
                    })(entry)
                }
            </div>
        `;
    },
    renderListItemSmall: function (entryIndex) {
        var entry = app.articles[entryIndex];
        return `
            <div class="home--doc-entry home--doc-entry-small" style="
            ">
                <div class="home--doc-entry-title">
                    <a class="ff-serif" href="${entry.articleUrl}" style="
                        font-size: 24px;
                        font-weight: 600;
                        color: #000;
                        display: block;
                    ">${entry.title[app.vars.renderLang]}</a>
                </div>
                <div class="home--doc-entry-status">
                    <span class="home--doc-entry-status-date ff-monosapce">${(new Date(entry.dateSubmit)).toISOString().slice(0,10)}&nbsp;</span>
                    <span class="home--doc-entry-status-authors">${
                        (entry.authors.length < 3) ?
                            ( entry.authors.slice(0,2).map(app.subScene.authorLabel.render).join(', ') ) :
                            ( entry.authors.slice(0,1).concat('etc').map(app.subScene.authorLabel.render).join(', ') )
                    }</span>
                </div>
            </div>
        `;
    },
    render: function (list, matchField, matchValue, lengthLimit, callback) {
        var subList = app.databaseBackbone.pickData(list, matchField, matchValue);
        callback ? callback() : '';
        return `
            <div>
                ${
                    subList.slice(0).reverse().slice(0, lengthLimit).map(function (entry, i) {
                        if (i < 2) {
                            return app.scene.home.renderListItemBig(entry.index);
                        } else {
                            return app.scene.home.renderListItemSmall(entry.index);
                        };
                    }).join('')
                }
            </div>
        `;
    }
};

app.scene.detail = {
    determineIndexValidity: function (indexStr) {
        if (parseInt(indexStr).toString() === indexStr) {
            return true;
        } else {
            return false;
        }
    },
    determineExistence: function (index) {
        if (app.articles[index]) {
            return true;
        } else {
            return false;
        }
    },
    renderContributorsLink: function (articleIndex) {
        return `<div>
            <aside style="font-size: 16px; color: #999;padding: 40px 0 70px;">
                The list of contributors of this article is
                <a href="https://github.com/neruthes/TheWestTimes-Website/commits/master/db-${app.vars.renderLang}/${articleIndex}.html" style="color: inherit;">available on GitHub</a>.
            </aside>
        </div>`;
    },
    render: function (articleIndex, httpStatus) {
        var entry = app.articles[articleIndex];
        var templates = {
            error404: `
                <div>
                    <h2>404 Not Found</h2>
                    <p>Go <a href="/">home</a>. You are drunk.</p>
                </div>
            `,
            normal: `
                <div class="" style="max-width: 800px; padding: 0 16px 0; margin: 0 auto;">
                    <div class="hide-print">
                        <nav class="h2"><a href="/?lang=${app.vars.renderLang}">${({en:'Home',zh:'首页'})[app.vars.renderLang]}</a> / ${({en:'Article',zh:'文章'})[app.vars.renderLang]} #${entry.index}</nav>
                    </div>
                    <div class="detail--doc-entry" style="
                        padding: 0 16px 0;
                    ">
                        <div class="detail--doc-entry-cover">
                            <img src="/cover/${entry.index}.png" style="display: block; width: 100%;">
                        </div>
                        <div class="detail--doc-entry-title">
                            <h2 class="ff-serif" style="
                                font-size: 34px;
                                color: #000;
                                text-decoration: none !important;
                                display: block;
                                padding: 30px 0 0;
                            ">${entry.title[app.vars.renderLang]}</h2>
                        </div>
                        <div class="detail--doc-entry-status">
                            <span class="detail--doc-entry-status-date ff-monosapce">${(new Date(entry.dateSubmit)).toISOString().slice(0,10)}&nbsp;&nbsp;</span>
                            ${entry.authors.map(app.subScene.authorLabel.render).join(', ')}
                        </div>
                        <div class="detail--doc-entry--content-container ff-serif" id="js--detail--doc-entry--content-container-${entry.index}" style="padding: 10px 0 0;">
                            ${(function () {
                                app.xhrget(`/db-en/` + entry.index + '.html', function (e) {
                                    document.querySelector('#js--detail--doc-entry--content-container-' + entry.index).innerHTML = e.target.responseText.toString();
                                    document.querySelector('#og-image').setAttribute('content', '/cover/' + entry.index + '.png');
                                });
                                return 'Loading...'
                            })()}
                        </div>
                        <div>
                            ${app.scene.detail.renderContributorsLink(articleIndex)}
                        </div>
                        <div class="ff-sansserif">
                            <h2 style="text-align: center; padding: 40px 0 20px;">${({en:'About the Author'+(entry.authors.length === 1 ? '' : 's'),zh:'关于作者'})[app.vars.renderLang]}</h2>
                            ${entry.authors.map(function (authorId) {
                                return app.scene.authorProfile.renderProfile(authorId) + '<div style="height: 16px;"></div>'
                            }).join('')}
                        </div>
                        <div>
                            ${app.subScene.prevAndNext.render(articleIndex)}
                        </div>
                        <div>
                            <h2 style="text-align: center; padding: 40px 0 20px;">${({en:'Related Articles',zh:'相关文章'})[app.vars.renderLang]}</h2>
                        </div>
                    </div>
                </div>
                <div>
                    <!-- Fluid width -->
                    <div style="font-size: 0px; padding: 0 16px 0;">
                        ${app.subScene.relatedArticles.render(articleIndex)}
                    </div>
                </div>
            `
        };
        return templates[httpStatus];
    }
};

app.scene.aboutThisSite = {
    load: function () {
        document.querySelector('#app-subScene-canvas--aboutThisSite').innerHTML = app.scene.aboutThisSite.render();
        app.didFinishPageLoad();
    },
    render: function () {
        return `<div class="">
            <nav class="h2"><a href="?lang=${app.vars.renderLang}">${({en:'Home',zh:'首页'})[app.vars.renderLang]}</a> / ${ ({
                en: 'About The West Times',
                zh: '关于西方时报'
            })[app.vars.renderLang] }</nav>
        </div>
        <section class="" style="padding: 0 16px 0;" id="uuid-46ce3de680484610bcf92cc65a0bb32b">
            ${ (function () {
                app.xhrget(`/html-component/AboutThisSiteSectionContent.${app.vars.renderLang}.html`, function (e) {
                    document.querySelector('#uuid-46ce3de680484610bcf92cc65a0bb32b').innerHTML = e.target.responseText;
                    console.log(e);
                });
                return '<p style="color: #999;">Loading...</p>'
            })() }
        </section>`;
    }
};

app.scene.authors = {
    load: function () {
        document.querySelector('#cp--scene-authors').innerHTML = app.scene.authors.render();
        app.didFinishPageLoad();
    },
    render: function () {
        var html = app.listOfAuthorIdByMostRecentPublishing.map(function (authorId) {
            return app.scene.authors.renderAuthorIem(authorId, 'authors');
        }).join('');
        return `<div>
            <div>
                <nav class="h2"><a href="/?lang=${app.vars.renderLang}">${({en:'Home',zh:'首页'})[app.vars.renderLang]}</a> / ${({en:'Authors',zh:'作者'})[app.vars.renderLang]}</nav>
            </div>
            <div>
                ${html}
            </div>
        </div>`;
    },
    renderAuthorIem: function (authorId, scene) {
        return app.scene.authorProfile.renderProfile(authorId, 'authors') + '<div style="height: 16px;"></div>';
    }
};

app.scene.authorProfile = {
    load: function (authorId) {
        app.vars.authorId = authorId;
        document.querySelector('#cp--scene-authorProfile--profile').innerHTML = `<div>
            <nav class="h2"><a href="/?lang=${app.vars.renderLang}">${({en:'Home',zh:'首页'})[app.vars.renderLang]}</a> / <a href="/?authors&lang=${app.vars.renderLang}">${({en:'Authors',zh:'作者'})[app.vars.renderLang]}</a> / ${({en:'Author',zh:'作者'})[app.vars.renderLang]} #${authorId}</nav>
        </div>` + app.scene.authorProfile.renderProfile(authorId, 'authorProfile');
        document.querySelector('#cp--scene-authorProfile--articles').innerHTML = app.scene.authorProfile.renderArticles(authorId);
        app.didFinishPageLoad();
    },
    renderProfile: function (authorId, scene) {
        var authorObj = app.authors[authorId];
        return `<div>
            <div style="border: 1px solid #000; padding: 16px 15px; margin: 0 0 0px;">
                <div style="padding: 0 0 0;">
                    <div class="cp--scene-authorProfile-avatar">
                        <a href="/?author-${authorObj.i}&lang=${app.vars.renderLang}" style="display: block;">
                            <img src="/img/author-avatars/${authorObj.i}.png">
                        </a>
                    </div>
                    <div class="cp--scene-authorProfile-info">
                        <div>
                            <h2 style="font-size: 30px;">
                                ${ (scene === 'authorProfile') ? '' : ( '<a href="/?author-' + authorObj.i + '&lang=' + app.vars.renderLang + '" style="text-decoration: none;">')}
                                    ${authorObj.name[app.vars.renderLang]}
                                ${ (scene === 'authorProfile') ? '' : '</a>'}
                                <span style="font-weight: 300; color: #999;">&nbsp;&nbsp;#${authorObj.i}</span>
                            </h2>
                        </div>
                        <div style="padding: 10px 0 8px">
                            <p>${authorObj.bio[app.vars.renderLang].split('\n').join('</p><p>')}</p>
                            <p style="padding: 8px 0 18px;">
                                <a class="authorProfile-urlanchor ff-monospace" href="${authorObj.url}">${authorObj.url.replace(/^https?:\/\//, '')}</a>
                            </p>
                            <div style="background: #000; height: 1px; margin: 0 0 18px;"></div>
                            <p>${({en:'Published',zh:'发布了'})[app.vars.renderLang]} ${authorObj.articles.length} ${({en:'articles.',zh:'篇文章。'})[app.vars.renderLang]}</p>
                            <p>
                                ${(function () {
                                    if (authorObj.articles.length > 0) {
                                        return ({en:'Recent article: ',zh:'最新文章：'})[app.vars.renderLang] + '<a style="color: inherit; display: inline-block;" href="/?article-' + authorObj.mostRecentArticle + '">' + app.articles[authorObj.mostRecentArticle].title[app.vars.renderLang] + '</a>'
                                    } else {
                                        return '<span style="visibility: hidden;">____&nbsp;</span>'
                                    }
                                })()}
                            </p>
                        </div>
                    </div>
                    <div style="clear: both;">
                    </div>
                </div>
            </div>
        </div>`;
    },
    renderArticles: function (authorId) {
        var articles = app.authors[authorId].articles;
        var html = `<h2 style="padding: 40px 0 20px;">${({en:'Articles',zh:'文章列表'})[app.vars.renderLang]}</h2>`;
        if (articles.length > 0) {
            html += app.scene.home.renderListItemBig(articles[0]);
        };
        if (articles.length > 1) {
            html += articles.slice(1).map(function (x) { return app.scene.home.renderListItemSmall(x) }).join('');
        };
        html += `<div style="text-align: center; padding: 30px 0 20px;">${articles.length} articles in total.</div>`
        return `<div style="padding: 0px 0 0;">
            ${html}
        </div>`;
    }
};

app.subScene = {};

app.subScene.prevAndNext = {
    render: function (articleIndex) {
        // console.log('articleIndex', parseInt(articleIndex));
        var hasNext = true;
        var hasPrev = true;
        if (articleIndex === app.articles.length - 1) {
            hasNext = false;
        };
        if (articleIndex === 0) {
            hasPrev = false;
        };
        var html = '';
        if (hasNext) {
            html += app.subScene.prevAndNext.renderLink(true, articleIndex+1, (hasNext && hasPrev));
        };
        if (hasPrev) {
            html += app.subScene.prevAndNext.renderLink(false, articleIndex-1, (hasNext && hasPrev));
        };
        return html;
    },
    renderLink: function (isForNext, articleIndex, both) {
        var entry = app.articles[articleIndex];
        return `<div class="uuid-346c9534 uuid-346c9535" style="">
            <a href="${app.articles[articleIndex].articleUrl}" style="color: #000; text-decoration: none; border: 1px solid #000; display: block; padding: 16px 15px;">
                <div class="ff-sansserif" style="font-size: 18px; font-weight: 600; text-align: left; padding: 0 0 8px;">
                    ${(isForNext ? {en:'Next Article',zh:'下一篇文章'} : {en:'Previous Article',zh:'上一篇文章'})[app.vars.renderLang]}
                </div>
                <div class="ff-serif" style="font-size: 24px; font-weight: 600;">
                    ${app.articles[articleIndex].title[app.vars.renderLang]}
                </div>
                <div class="home--doc-entry-status" style="padding: 6px 0 0;">
                    <span class="home--doc-entry-status-date ff-monosapce">${(new Date(entry.dateSubmit)).toISOString().slice(0,10)}&nbsp;</span>
                    <span class="home--doc-entry-status-authors">${
                        (entry.authors.length < 3) ?
                            ( entry.authors.slice(0,2).map(authorId=>app.authors[authorId].name[app.vars.renderLang]).join(', ') ) :
                            ( entry.authors.slice(0,1).concat('etc').map(authorId=>app.authors[authorId].name[app.vars.renderLang]).join(', ') )
                    }</span>
                </div>
            </a>
        </div>`;
    }
};

app.subScene.relatedArticles = {
    render: function (articleIndex) {
        // return ''; // When less than 6 articles
        var candidateArticles = [];
        var considerCandidate = function (candidateIndex) {
            if (candidateIndex === undefined) { return 1; }
            if (candidateArticles.indexOf(candidateIndex) !== -1) { return 1; };
            // if (articleIndex === candidateIndex) { return 1; };
            // if (articleIndex + 1 === candidateIndex) { return 1; };
            // if (articleIndex - 1 === candidateIndex) { return 1; };
            candidateArticles.push(candidateIndex);
        };
        app.articles[articleIndex].authors.map(function (authorId) {
            considerCandidate(app.authors[authorId].articles[0]);
            considerCandidate(app.authors[authorId].articles[1]);
        }).slice(0, 2);
        app.listOfAuthorIdByMostRecentPublishing.map(function (authorId) {
            considerCandidate(app.authors[authorId].articles[0]);
            considerCandidate(app.authors[authorId].articles[1]);
            considerCandidate(app.authors[authorId].articles[2]);
        });
        var selectedArticles = candidateArticles.slice(0, 4);
        return selectedArticles.map(function (x, i) {
            return app.subScene.relatedArticles.renderElement(x, i%2);
        }).join('') + '<div style="clear: both;"></div>';
    },
    renderElement: function (articleIndex, evenOdd) {
        var entry = app.articles[articleIndex];
        return `<div class="uuid-346c9535 uuid-346c9566" data-evenodd="${evenOdd}" style="">
            <a href="${app.articles[articleIndex].articleUrl}" style="color: #000; text-decoration: none; border: 1px solid #000; display: block; padding: 16px 15px;">
                <div class="ff-serif" style="font-size: 24px; font-weight: 600;">
                    ${app.articles[articleIndex].title[app.vars.renderLang]}
                </div>
                <div class="home--doc-entry-status" style="padding: 6px 0 0;">
                    <span class="home--doc-entry-status-date ff-monosapce">${(new Date(entry.dateSubmit)).toISOString().slice(0,10)}&nbsp;</span>
                    <span class="home--doc-entry-status-authors" style="font-size: 14px">${
                        (entry.authors.length < 3) ?
                            ( entry.authors.slice(0,2).map(authorId=>app.authors[authorId].name[app.vars.renderLang]).join(', ') ) :
                            ( entry.authors.slice(0,1).concat('etc').map(authorId=>app.authors[authorId].name[app.vars.renderLang]).join(', ') )
                    }</span>
                </div>
            </a>
        </div>`;
    }
};

app.subScene.switchLang = {
    render: function (linkTemplate) {
        document.querySelector('#app-subscene-canvas--switchLang').innerHTML = `
            <a href="${linkTemplate.replace('{lang}', 'en')}">English</a>
            <a href="${linkTemplate.replace('{lang}', 'zh')}">简体中文</a>
        `;
    }
};

app.subScene.grandNavbar = {
    load: function () {
        var ll = app.vars.renderLang;
        document.querySelector('#app-subscene-canvas--grandNavbar').innerHTML = `
            <a href="/?lang=${ll}">${({en:'Home',zh:'首页'})[ll]}</a>
            <a href="/?authors&lang=${ll}">${({en:'Authors',zh:'作者'})[ll]}</a>
            <a href="/?about&lang=${ll}">${({en:'About',zh:'关于'})[ll]}</a>
            <a href="https://github.com/neruthes/TheWestTimes-Forum">${({en:'Forum',zh:'讨论区'})[ll]}</a>
        `;
    }
};

app.subScene.authorLabel = {
    render: function (authorId) {
        if (authorId === 'etc') {
            return `<span>etc</span>`
        }
        if (app.authors[authorId].url) {
            return `<span data-author-id="${authorId}" class="authorInfoCard-container"><a class="doc-entry-author-link" style="position: relative;" rel="nofollow" data-author-id="${authorId}" href="/?author-${authorId}&lang=${app.vars.renderLang}">${app.authors[authorId].name[app.vars.renderLang]}</a>${app.subScene.authorInfoCard.render(app.authors[authorId])}</span>`
        } else {
            return `<span>${app.authors[authorId].name[app.vars.renderLang]}</span>`
        };
    }
};

app.subScene.authorInfoCard = {
    render: function (authorObj) {
        return `<aside class="authorInfoCard">
            <div class="authorInfoCard-inner">
                <div class="authorInfoCard-avatar" style="height: 100%; padding: 0 1px 0 0;">
                    <img src="/img/author-avatars/${authorObj.i}.png">
                </div>
                <div class="authorInfoCard-info">
                    <div style="font-size: 24px; font-weight: 500; color: #000; line-height: 20px; margin: 0 0 7px;">
                        <span>${authorObj.name[app.vars.renderLang]}</span>
                    </div>
                    <div style="font-size: 16px; color: #111; line-height: 19px; margin: 0 0 5px;">
                        ${authorObj.bio[app.vars.renderLang].replace(/\n/g, ({en:' ',zh:''})[app.vars.renderLang])}
                    </div>
                    <div style="font-size: 16px; color: #05C; line-height: 19px;">
                        <a href="authorObj.url">${authorObj.url.replace(/^https?\:\/\//, '')}</a>
                    </div>
                </div>
                <div style="clear: both;">
                </div>
            </div>
        </aside>`;
    }
};

app.eventHandlers = {
    click: function (e) {

    }
};

app.didFinishPageLoad = function () {
    if (app.flag.didFinishPageLoadAlreadyInvoked) { // Do nothing
        return 1
    };
    app.flag.didFinishPageLoadAlreadyInvoked = true;
    setTimeout(function () { document.querySelectorAll('.home--doc-entry').forEach(function (node) { node.style.opacity = 1; }); }, 50);
    setTimeout(function () { document.body.style.opacity = '1'; }, 50);
    console.log('app.didFinishPageLoad: Started');
    // Listen click events
    document.querySelectorAll('[data-eventlisten-click]').forEach(function(node){node.addEventListener('click', app.eventHandlers.click)});
    // Render SubScene: switchLang
    (function () {
        var scene = document.body.getAttribute('data-scene');
        if (scene === 'detail') {
            app.subScene.switchLang.render('' + app.articles[app.vars.entryId].articleUrl.replace(/=\w{2}$/, '={lang}'));
        } else if (scene === 'about') {
            app.subScene.switchLang.render('/?about&lang={lang}');
        } else if (scene === 'authors') {
            app.subScene.switchLang.render('/?authors&lang={lang}');
        } else if (scene === 'authorProfile') {
            app.subScene.switchLang.render(`/?author-${app.vars.authorId}&lang={lang}`);
        } else {
            // Default: home
            app.subScene.switchLang.render('/?lang={lang}');
        };
    })();

    (function () { // Render SubScene: grandNavbar
        app.subScene.grandNavbar.load();
    })();

    (function () { // Always use sans-serif for CJK
        if (app.vars.renderLang === 'zh') {
            document.querySelectorAll('.ff-serif').forEach(function (node) {
                node.setAttribute('class', node.getAttribute('class').replace(/ff-serif/g, ''));
            });
        };
    })();
};

app.boot = function () {
    // Event Listeners

    // Load data
    app.databaseBackbone.load();
};

app.start = function () {
    // Determine language
    (function () {
        var tmpLang = 'en';
        window.urlLangMatch = location.search.match(/[?&]lang=(en|zh)$/);
        if (localStorage[app.envVar.localStorageNamespace+'cached-lang']) {
            // Get cache
            tmpLang = localStorage[app.envVar.localStorageNamespace+'cached-lang']
        }
        if (urlLangMatch !== null && urlLangMatch.length >= 2) {
            // Manually determine
            localStorage[app.envVar.localStorageNamespace+'cached-lang'] = urlLangMatch[1];
            tmpLang = urlLangMatch[1];
        };
        // Finally
        app.vars.renderLang = tmpLang;
        // Save to cache
        localStorage[app.envVar.localStorageNamespace+'cached-lang'] = app.vars.renderLang;
    })();

    // Boot
    app.boot();
};

window.addEventListener('load', app.start);
