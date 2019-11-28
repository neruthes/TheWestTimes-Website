// (c) 2019 Neruthes <https://neruthes.xyz>
// Licensed under GNU AGPL v3

var app = {
    flag: {
        didFinishPageLoad: false
    },
    envVar: {
        defaultListLength: 10,
        magicUuid_01: '56eb206d-f44c-4f62-a589-74fa5d801ad6'
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
    if (location.search === '') {
        // scene: home
        app.setTitleComponent('Home');
        app.setScene('home');
        app.scene.home.load();
    } else if (location.search === '?about') {
        // scene: about
        app.setTitleComponent('About');
        app.setScene('about');
    } else if (location.search.indexOf('?article-') === 0) {
        // scene: detail
        if (location.search.match(/^\?article-([0-9]+)/)) {
            // With index
            var match = location.search.match(/^\?article-([0-9]+)/);
            app.setScene('detail');
            if (app.scene.detail.determineIndexValidity(match[1])) {
                // Valid index
                if (app.scene.detail.determineExistence(match[1])) {
                    // Good index
                    if (app.db[match[1]].articleUrl !== '/' + location.search) {
                        location.href = app.db[match[1]].articleUrl
                    }
                    app.setTitleComponent(app.db[match[1]].localeTitle.en);
                    document.querySelector('#cp--scene-detail--inner').innerHTML = app.scene.detail.render(match[1], 'normal');
                } else {
                    // Does not exist
                    app.setTitleComponent('404 Not Found');
                    document.querySelector('#cp--scene-detail--inner').innerHTML = app.scene.detail.render(match[1], 'error404');
                }
            } else {
                // Invalid index
                app.setTitleComponent('404 Not Found');
                document.querySelector('#cp--scene-detail--inner').innerHTML = app.scene.detail.render(match[1], 'error404');
            };
        } else {
            // Without index
            location.replace('https://thewesttimes.com/');
        }
    } else {
        location.replace('https://thewesttimes.com/');
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
        var newData = rawData.trim().split('\n').map(function (lineStr) {
            var lineData = lineStr.split('||');
            var entry = {
                articleUrl: `/?article-${lineData[0]}--` + lineData[3].replace(/\s/g, '-').replace(/[^\d\w-]/g, '').toLowerCase(),
                index: parseInt(lineData[0]),
                dateSubmit: parseInt(lineData[1]),
                authors: lineData[2].split(',,'),
                title: lineData[3],
                localeTitle: {
                    en: lineData[3],
                    zh: lineData[4]
                }
            };
            console.log(entry.articleUrl);
            return entry;
        });
        app.db = newData;
        // console.log(app.db);
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
        app.xhrget('/db.txt', function (e) {
            app.databaseBackbone.parseData(e.target.responseText);
        });
    }
}

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
                app.didFinishPageLoad();
            }
        );
    },
    renderAuthor: function (author) {
        if (author.match(/^([^|]+?)\|(\w+)\:(.+?)$/)) {
            var regexMatchResult = author.match(/^([^|]+?)\|(\w+)\:(.+?)$/)
            var templates = {
                pgp: `<a class="doc-entry-author-link" target="_blank" rel="nofollow" href="https://pgp.to/#0x${regexMatchResult[3]}">${regexMatchResult[1]}</a>`,
                url: `<a class="doc-entry-author-link" target="_blank" rel="nofollow" href="//${regexMatchResult[3]}">${regexMatchResult[1]}</a>`,
                email: `<a class="doc-entry-author-link" target="_blank" rel="nofollow" href="mailto:${regexMatchResult[3]}">${regexMatchResult[1]}</a>`,
                github: `<a class="doc-entry-author-link" target="_blank" rel="nofollow" href="https://github.com/${regexMatchResult[3]}">${regexMatchResult[1]}</a>`
            };
            return templates[regexMatchResult[2]];
        } else {
            return `<span>${author}</span>`;
        };
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
                        <span class="home--doc-entry-title--text" style="display:block; padding-top: 10px;">${entry.title}</span>
                    </a>
                </div>
                <div class="home--doc-entry-status">
                    <span class="home--doc-entry-status-date ff-monosapce">${(new Date(entry.dateSubmit)).toISOString().slice(0,10)}&nbsp;</span>
                    <span class="home--doc-entry-status-authors">${
                        (entry.authors.length < 3) ?
                            ( entry.authors.slice(0,2).map(app.scene.home.renderAuthor).join(', ') ) :
                            ( entry.authors.slice(0,1).concat('etc').map(app.scene.home.renderAuthor).join(', ') )
                    }</span>
                </div>
                <div class="home--doc-entry--content-container" style="padding: 10px 0 5px;">
                    <p class="home--doc-entry--content-paragraph ff-serif" id="js--home--doc-entry--content-container-${entry.index}" style="font-size: 16px; padding: 0;">
                        ${app.xhrget('/db/' + entry.index + '.html', function (e) {
                            console.log( document.querySelector('#js--home--doc-entry--content-container-' + entry.index).innerHTML = (e.target.responseText).slice(e.target.responseText.indexOf('<p>')+3, e.target.responseText.indexOf('</p>')) )
                        })}
                    </p>
                </div>
                ${
                    (function (entry) {
                        if (entry.index === app.db.length - 1) {
                            document.querySelector('#og-image').setAttribute('content', '/cover/' + entry.index + '.png');
                        };
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
                        font-size: 20px;
                        font-weight: 600;
                        color: #000;
                        display: block;
                    ">${entry.title}</a>
                </div>
                <div class="home--doc-entry-status">
                    <span class="home--doc-entry-status-date ff-monosapce">${(new Date(entry.dateSubmit)).toISOString().slice(0,10)}&nbsp;</span>
                    <span class="home--doc-entry-status-authors">${
                        (entry.authors.length < 3) ?
                            ( entry.authors.slice(0,2).map(app.scene.home.renderAuthor).join(', ') ) :
                            ( entry.authors.slice(0,1).concat('etc').map(app.scene.home.renderAuthor).join(', ') )
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
                        if (i < 5) {
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
                        <h2 class="ff-serif" href="${entry.articleUrl}" target="_blank" rel="nofollow" style="
                            font-size: 34px;
                            color: #000;
                            text-decoratoin: none !important;
                            display: block;
                            padding: 15px 0 0;
                        ">${entry.title}</h2>
                    </div>
                    <div class="detail--doc-entry-status">
                        ${(new Date(entry.dateSubmit)).toISOString().slice(0,10)}&nbsp;&nbsp;
                        ${entry.authors.map(app.scene.home.renderAuthor).join(', ')}
                    </div>
                    <div class="detail--doc-entry--content-container ff-serif" id="js--detail--doc-entry--content-container-${entry.index}" style="padding: 10px 0;">
                        ${app.xhrget('/db/' + entry.index + '.html', function (e) {
                            document.querySelector('#js--detail--doc-entry--content-container-' + entry.index).innerHTML = e.target.responseText.toString();
                            document.querySelector('#og-image').setAttribute('content', '/cover/' + entry.index + '.png');
                        })}
                    </div>
                </div>
            `
        };
        return templates[httpStatus];
    }
}

app.eventHandlers = {
    click: function (e) {

    }
}

app.didFinishPageLoad = function () {
    if (app.flag.didFinishPageLoad) {
        // Do nothing
    } else {
        document.querySelectorAll('[data-eventlisten-click]').forEach(function(node){node.addEventListener('click', app.eventHandlers.click)});
        app.flag.didFinishPageLoad = true;
    };
};

app.boot = function () {
    app.databaseBackbone.load();
};

app.start = function () {
    app.boot();
}

window.addEventListener('load', app.start);
