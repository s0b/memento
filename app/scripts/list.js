/* global chrome, bgPage, gdocs, note, ui */

var list = (function() {

    var config = {};

    var init = function(cfg) {
        config = cfg;
        bindEvents();
    }

    var bindEvents = function() {
        config.button.new.click(note.create);
        config.button.refresh.click(get);
        config.button.options.click(openOptions);
        config.search.keyup(search);
        config.list.on('click', '.doc-title', function(){ note.open($(this).attr('link')); });
    }

    var get = function () {
        ui.setStatusMsg(chrome.i18n.getMessage('loading_note_list'));

        var callback = function(list){
            bgPage.docs = [];

            for (var i in list.items) {
                if (list.items[i].mimeType === 'application/vnd.google-apps.document') {
                    bgPage.docs.push(list.items[i]);
                }
            }

            render();
        }

        gdocs.getDocumentList(bgPage.folderId, callback);
    }

    var render = function() {
        var html = [];
        for (var i in bgPage.docs) {
            var doc = bgPage.docs[i];
            var link = doc.id;
            html.push(
                '<div class="note-list-item ', link, '">',
                    '<div class="date" title="', ui.formatDate(doc.modifiedDate, true), '">',
                        ui.formatDate(doc.modifiedDate),
                    '</div>',
                    '<div class="doc-title" link="', link,'">',doc.title,'</div>',
                '</div>'
            );
        }
        config.list.html(html.join(''));
        ui.clearStatusMsg();
        ui.resize();
    }

    var openOptions = function() {
        if (chrome.runtime.openOptionsPage) {
            // New way to open options pages, if supported (Chrome 42+).
            chrome.runtime.openOptionsPage();
        } else {
            // Reasonable fallback.
            window.open(chrome.runtime.getURL('options.html'));
        }
    }

    var search = function() {
        // TODO search in the documents content

        for (var i in bgPage.docs) {
            var doc = bgPage.docs[i];
            // TODO dont use class to use the ID
            if(config.search.val()) {
                if (doc.title.toLowerCase().indexOf(config.search.val().toLowerCase()) === -1){
                    $('.note-list-item.' + doc.id).hide();
                } else {
                    $('.note-list-item.' + doc.id).show();
                }
            } else {
                $('.note-list-item.' + doc.id).show();
            }

            ui.resize();
        }
    }

    init({
        main: $('#list'),
        button: {
            new: $('.button.new'),
            options: $('.option.options'),
            refresh: $('.option.refresh')
        },
        search: $('#input-search'),
        list: $('#note-list')
    });

    return {
        get: get,
        render: render,
    }

}());
