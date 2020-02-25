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
        if (location.search === 'about') {
            location.href = '/?about&lang='+app.vars.renderLang;
        };
        app.setTitleComponent('About');
        app.setScene('about');
        app.scene.aboutThisSite.load();
    } else if (location.search.indexOf('?article-') === 0) {
        // Scene: detail
        if (location.search.match(/^\?article-([0-9]+)/)) {
            // With index
            var match = location.search.match(/^\?article-([0-9]+)/);
            app.setScene('detail');
            if (app.scene.detail.determineIndexValidity(match[1])) {
                // Valid index
                if (app.scene.detail.determineExistence(match[1])) {
                    // Good index
                    if (app.db[match[1]].articleUrl !== '/' + location.search) {
                        location.href = app.db[match[1]].articleUrl;
                    };
                    app.vars.entryId = match[1];
                    app.setTitleComponent(app.db[match[1]].title[app.vars.renderLang]);
                    document.querySelector('#cp--scene-detail--inner').innerHTML = app.scene.detail.render(match[1], 'normal');
                    app.didFinishPageLoad();
                } else {
                    // Does not exist
                    app.setTitleComponent('404 Not Found');
                    document.querySelector('#cp--scene-detail--inner').innerHTML = app.scene.detail.render(match[1], 'error404');
                };
            } else {
                // Invalid index
                app.setTitleComponent('404 Not Found');
                document.querySelector('#cp--scene-detail--inner').innerHTML = app.scene.detail.render(match[1], 'error404');
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
        var json = JSON.parse(rawData);
        app.db = json.articles.map(function (entry, index) {
            var tmpObj = entry;
            tmpObj.articleUrl = `/?article-${entry.index}--` + entry.title.en.replace(/[^\w\d]/g, '-').replace(/\-+/g, '-').replace(/[^\d\w-]/g, '').toLowerCase() + `&lang=${app.vars.renderLang}`;
            return tmpObj;
        });
        app.authors = json.authors.map(x => x);
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
            app.db,
            undefined,
            undefined,
            app.envVar.defaultListLength,
            function () {
                document.querySelector('#js-List-RemaingItemsCount').innerHTML = app.db.length-app.envVar.defaultListLength;
            }
        );
        app.didFinishPageLoad();
    },
    renderListItemBig: function (entry) {
        return `
            <div class="home--doc-entry home--doc-entry-big" style="
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
                        ${app.xhrget(`/db-en/` + entry.index + '.html', function (e) {
                            console.log( document.querySelector('#js--home--doc-entry--content-container-' + entry.index).innerHTML = (e.target.responseText).slice(e.target.responseText.indexOf('<p>')+3, e.target.responseText.indexOf('</p>')) )
                        })}
                    </p>
                </div>
                ${
                    (function (entry) {
                        if (entry.index === app.db.length - 1) {
                            document.querySelector('#og-image').setAttribute('content', '/cover/' + entry.index + '.png');
                        };
                        return '';
                    })(entry)
                }
            </div>
        `;
    },
    renderListItemSmall: function (entry) {
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
                    JSON.parse(JSON.stringify(subList)).reverse().slice(0, lengthLimit).map(function (entry, i) {
                        if (i < 1) {
                            return app.scene.home.renderListItemBig(entry);
                        } else {
                            return app.scene.home.renderListItemSmall(entry);
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
        if (app.db[index]) {
            return true;
        } else {
            return false;
        }
    },
    render: function (articleIndex, httpStatus) {
        var entry = app.db[articleIndex];
        var templates = {
            error404: `
                <div>
                    <h2>404 Not Found</h2>
                    <p>Go <a href="/">home</a>. You are drunk.</p>
                </div>
            `,
            normal: `
                <div class="hide-print">
                    <nav class="h2"><a href="/">Home</a> / Article ${entry.index}</nav>
                </div>
                <div class="detail--doc-entry" style="
                    padding: 0 16px 14px;
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
                            padding: 15px 0 0;
                        ">${entry.title[app.vars.renderLang]}</h2>
                    </div>
                    <div class="detail--doc-entry-status">
                        <span class="detail--doc-entry-status-date ff-monosapce">${(new Date(entry.dateSubmit)).toISOString().slice(0,10)}&nbsp;&nbsp;</span>
                        ${entry.authors.map(app.subScene.authorLabel.render).join(', ')}
                    </div>
                    <div class="detail--doc-entry--content-container ff-serif" id="js--detail--doc-entry--content-container-${entry.index}" style="padding: 10px 0;">
                        ${app.xhrget(`/db-en/` + entry.index + '.html', function (e) {
                            document.querySelector('#js--detail--doc-entry--content-container-' + entry.index).innerHTML = e.target.responseText.toString();
                            document.querySelector('#og-image').setAttribute('content', '/cover/' + entry.index + '.png');
                        })}
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
        return ({
            en: `<div class="">
                <nav class="h2">About The West Times</nav>
            </div>
            <section class="" style="padding: 0 16px 0;">
                <p>It is like Onion News?</p>
            </section>`,
            zh: `<div class="">
                <nav class="h2">关于西方时报</nav>
            </div>
            <section class="" style="padding: 0 16px 0;">
                <p>不是洋葱新闻。</p>
            </section>`
        })[app.vars.renderLang];
    }
};

app.subScene = {};

app.subScene.switchLang = {
    render: function (linkTemplate) {
        document.querySelector('#app-subscene-canvas--switchLang').innerHTML = `
            <a href="${linkTemplate.replace('{lang}', 'en')}">English</a>
            <a href="${linkTemplate.replace('{lang}', 'zh')}">简体中文</a>
        `;
    }
};

app.subScene.grandNavbar = {
    render: function () {
        var ll = app.vars.renderLang;
        document.querySelector('#app-subscene-canvas--grandNavbar').innerHTML = `
            <a href="/?lang=${ll}">${({en:'Home',zh:'首页'})[ll]}</a>
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
            return `<span data-author-id="${authorId}" class="authorInfoCard-container"><a class="doc-entry-author-link" style="position: relative;" target="_blank" rel="nofollow" data-author-id="${authorId}" href="//${app.authors[authorId].url}">${app.authors[authorId].name}</a>${app.subScene.authorInfoCard.render(authorId)}</span>`
        } else {
            return `<span>${app.authors[authorId].name}</span>`
        };
    }
};

app.subScene.authorInfoCard = {
    render: function (authorId) {
        return `<aside class="authorInfoCard">
            <div class="authorInfoCard-inner">
                <div style="font-size: 13px; font-weight: 500; color: #666; text-transform: uppercase; margin: 0 0 3px;">
                    About the author
                </div>
                <div style="font-size: 17px; font-weight: 500; color: #000; line-height: 20px; margin: 0 0 7px;">
                    <span>${app.authors[authorId].name}</span>
                    <span style="opacity: 0.5;">#${authorId}</span>
                </div>
                <div style="font-size: 15px; color: #111; line-height: 19px;">
                    ${app.authors[authorId].bio}
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
    if (app.flag.didFinishPageLoadAlreadyInvoked) {
        // Do nothing
    } else {
        console.log('app.didFinishPageLoad: Started');
        // Listen click events
        document.querySelectorAll('[data-eventlisten-click]').forEach(function(node){node.addEventListener('click', app.eventHandlers.click)});
        // Render SubScene: switchLang
        (function () {
            var scene = document.body.getAttribute('data-scene');
            if (scene === 'detail') {
                app.subScene.switchLang.render(app.db[app.vars.entryId].articleUrl+'&lang={lang}');
            } else if (scene === 'about') {
                app.subScene.switchLang.render('/?about&lang={lang}');
            } else {
                // Default: home
                app.subScene.switchLang.render('/?lang={lang}');
            };
        })();
        // Render SubScene: grandNavbar
        (function () {
            app.subScene.grandNavbar.render()
        })();
        // Always use sans-serif for CJK
        (function () {
            if (app.vars.renderLang === 'zh') {
                document.querySelectorAll('.ff-serif').forEach(function (node) {
                    console.log('serif!');
                    console.log(node);
                    node.setAttribute('class', node.getAttribute('class').replace(/ff-serif/g, ''));
                });
            };
        })();
        app.flag.didFinishPageLoadAlreadyInvoked = true;
    };
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
        console.log(urlLangMatch);
        // alert(urlLangMatch[1]);
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
