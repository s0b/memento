/* global chrome, gapi */

var memento = {};
var bgPage = chrome.extension.getBackgroundPage();
var typingTimer = null;
var gdocs = new GDocs();

/*function gapiIsLoaded() {
  gapi.client.load('drive', 'v2', init);
}*/

memento.loadI18nStrings = function () {
    var nodes = document.querySelectorAll('[class^="i18n_"]');
    for(var i = 0; i < nodes.length; i++) {
        var args = JSON.parse('[' + nodes[i].textContent + ']');
        var stringName = nodes[i].className.split(/\s/)[0].substring(5);
        if(arguments.length > 0) {
            nodes[i].innerHTML = chrome.i18n.getMessage(stringName, args);
        } else{
            nodes[i].innerHTML = chrome.i18n.getMessage(stringName);
        }
    }
};

memento.changeScreen = function (target) {
    memento.resetUi();

    $('#loading').hide();
    $('#first-time').hide();
    $('#main-screen').hide();
    $('#open-note').hide();

    $('#' + target).show();
    memento.resizeMe(target === 'open-note');
};

memento.resetUi = function(){
    // TODO too ugly! not proud of this
    // to main screen
    bgPage.doc = null;

    // to open note
    $('.button.save').hide();
    $('.button.newtab').show();
    $('#open-note #input-title').val('');
    $('#content').contents().find('html').html('');
    memento.clearLastMod();
    $('#input-title').removeClass('new');
    $('#input-title').removeClass('error');
    $('.button.dropdown').show();
    $('#open-note').removeAttr('etag');
};

memento.resizeMe = function(resizeEditor){
    var width = $('#main-screen').width();

    if(resizeEditor) {
        var size = (localStorage.getItem('editorSize') !== null) ? localStorage['editorSize'] : bgPage.defaultEditorSize;

        var editorWidth = bgPage.editorSizes[size]['width'];
        var editorHeight = bgPage.editorSizes[size]['height'];

        editorHeight -= $('#open-note').height() - $('#content').height();

        $('#content').width(editorWidth);
        // add padding
        // TODO padding as var
        $('#content').height(editorHeight + 10);

        width = editorWidth;
    }

    var height = document.getElementById('wrapper').offsetHeight;

    document.body.style.width=width;
    document.getElementsByTagName('html')[0].style.width=width;
    document.body.style.height=height;
    document.getElementsByTagName('html')[0].style.height=height;
};

memento.clearLastMod = function() {
    $('#last-mod').cuteTime.stop_cuteness();
    $('#last-mod').html('');
};

memento.updateLastMod = function (date) {
    $('#last-mod').attr('data-timestamp', new Date(date));
    $('#last-mod').attr('title', memento.formatDate(date, true));
    $('#last-mod').cuteTime({ refresh: 10000 })
};


memento.setStatusMsg = function (msg, error) {
    $('#status-msg').removeClass('error');

    if(msg){
        $('#status-msg').html(msg).show();
        if(error) {
            $('#status-msg').addClass('error');
            setTimeout(function() { //hide error msg
                memento.clearStatusMsg();
            }, 5000);
        }
    } else {
        $('#status-msg').hide();
    }
};

memento.clearStatusMsg = function () {
    $('#status-msg').removeClass('error');
    $('#status-msg').hide();
};

memento.renderDocList = function () {
    var html = [];
    for (var i = 0, doc; doc = bgPage.docs[i]; ++i) {
        var link = doc.id;
        html.push(
            '<div class="note-list-item ', link, '">',
                '<div class="date" title="', memento.formatDate(doc.modifiedDate, true), '">',
                    memento.formatDate(doc.modifiedDate),
                '</div>',
                '<div class="doc-title" link="', link,'">',doc.title,'</div>',
            '</div>'
        );
    }
    $('#note-list').html(html.join(''));
    memento.clearStatusMsg();
    memento.resizeMe();
};

memento.formatDate = function(date, fullDate){
    var sameDay = function( d1, d2 ){
        return d1.getUTCFullYear() === d2.getUTCFullYear() &&
               d1.getUTCMonth() === d2.getUTCMonth() &&
               d1.getUTCDate() === d2.getUTCDate();
    };

    var dateFormatted;

    var dateParsed = new Date(Date.parse(date, 'isoUtcDateTime'));
    if(fullDate){
        dateFormatted = dateParsed.format(chrome.i18n.getMessage('date_format'));
    } else {
        if(sameDay(dateParsed, new Date())){
            dateFormatted = dateParsed.format('HH:MM');
        } else {
            dateFormatted = dateParsed.format('d mmm');
        }
    }


    return dateFormatted;
};

memento.hideDropdown = function(){
    $('.option.delete').removeClass('active');
    $('.dropdown-menu-nested').hide();
    $('.dropdown-menu').hide();
    $('.button.dropdown').removeClass('pressed');
};

memento.createNote = function () {
    var title = $('#input-title').val();
    var content = $('#content').contents().find('html').html();

    if(title.length > 0) {
        var handleSuccess = function (doc) {
            memento.clearStatusMsg();
            bgPage.docs.push(doc);
            $('.button.save').removeClass('processing');
            $('.button.save').text('Ok'); // TODO move to translations
            $('.button.save').hide();
            $('.button.dropdown').show();
            $('#input-title').removeClass('new');
            memento.updateLastMod(doc.modifiedDate);
            $('#open-note').attr('etag', doc.etag);
            bgPage.doc = doc;
        };

        $('#input-title').removeClass('error');
        $('.button.save').text('');
        $('.button.save').addClass('processing');

        memento.setStatusMsg(chrome.i18n.getMessage('creating_note'));

        gdocs.createDoc(title, content, bgPage.folderId, handleSuccess);
    } else {
        $('#input-title').addClass('error');
    }
};

memento.setNoteContent = function (docId, content) {
    memento.changeScreen('open-note');

    console.log(content)

    // TODO wysiwyg - not proud about this replacements, just a workaround
    // remove styles added by Google Docs
    content = content.replace(/<style[^>]*>(.*?)<\/style>/gi, '');

    // avoid an error about moving with arrow keys over empty lines
    content = content.replace(/<span( class=\"[\w]+\")?><\/span>/gi, '<br>');

    $('#content').contents().find('html').html(content);

    // FIXME This way to include the css its repeated
    $('#content').contents().find('head').append(
        $('<link/>', { rel: 'stylesheet', href: '../styles/document.css', type: 'text/css' })
    );

    memento.resizeMe(true);

    // TODO get the information from bgPage.docs[] to save this extra request
    gdocs.getDocById(docId, function(doc){
        bgPage.doc = doc;
        $('#open-note').attr('etag', doc.etag);
        $('#open-note #input-title').val(doc.title);

        console.log(doc);

        memento.updateLastMod(doc.modifiedDate);
        memento.clearStatusMsg();
    });
};

memento.manageNoteChange = function (e) {
    console.log('manageNoteChange');
    console.log(e.keyCode)

    var keyCodes = [37, 38, 39, 40];

    // check if is a new doc and isnt an arrow key
    if(((bgPage.doc && bgPage.doc.id) && !bgPage.isUpdating) && jQuery.inArray(e.keyCode, keyCodes) == '-1'){
        clearTimeout(typingTimer);

        typingTimer = setTimeout(function(){
            if($('#input-title').val() && $('#input-title').val().length > 0) {
                bgPage.isUpdating = true;

                $('#input-title').removeClass('error');
                /*gdocs.getDocById(bgPage.doc.resourceId, function(doc){
                    if(doc.entry.gd$etag != $("#open-note").attr('etag')) {
                     memento.setStatusMsg(
                     chrome.i18n.getMessage("note_outdated")
                     + " <span class='msgReload'>" + chrome.i18n.getMessage("reload")
                     + "</span> <span class='msgSave'>" + chrome.i18n.getMessage("save") + "</span>"
                     );

                     $(".msgReload").on('click',function(){
                     gdocs.getDocumentContent(bgPage.doc.resourceId, memento.setNoteContent);
                     });

                     $(".msgSave").on('click',function(){
                     memento.updateNote(doc);
                     });
                     } else {
                     memento.updateNote(doc);
                     }
                });*/

                //until the etag check works, just updateNote
                memento.updateNote();
            } else {
                $('#input-title').addClass('error');
            }
        }, 1000);
    }
};

memento.updateNote = function () {
    var doc = bgPage.doc;

    doc.title = $('#input-title').val();
    doc.content = $('#content').contents().find('html').html();

    memento.setStatusMsg(chrome.i18n.getMessage('saving_note'));

    gdocs.updateDoc(
        bgPage.doc.id,
        $('#input-title').val(),
        $('#content').contents().find('html').html(),
        function(doc) {
            memento.clearStatusMsg();
            $('#open-note').attr('etag', doc.etag);
            memento.updateLastMod(new Date());
            bgPage.isUpdating = false;
            bgPage.doc = doc;
        }
    );
};

memento.getListOfNotes = function (folderId) {
    memento.setStatusMsg(chrome.i18n.getMessage('loading_note_list'));

    bgPage.docs = [];

    gdocs.getDocumentList(bgPage.folderId, memento.processListNotes);
};

memento.processListNotes = function (list) {
    for (var key in list.items) {
        if (list.items[key].mimeType === 'application/vnd.google-apps.document') {
            bgPage.docs.push(list.items[key]);
        }
    }

    memento.renderDocList();
};

memento.openNewTab = function(url) {
    chrome.tabs.create({url: url});
    window.close();
};

memento.loadSingleNote = function() {
    memento.setStatusMsg(chrome.i18n.getMessage('creating_note'));

    // TODO send also the folderId
    gdocs.getDocByTitle(
        bgPage.defaultDocTitle,
        function(doc){
            var openDoc = function(doc){
                memento.getDocumentContent(doc);
            };

            if(doc) { // doc exists
                openDoc(doc)
            } else {  // doc must be created
                memento.setStatusMsg(chrome.i18n.getMessage('creating_note'));

                gdocs.createDoc(
                    bgPage.defaultDocTitle,
                    '',
                    bgPage.folderId,
                    function (doc){
                        memento.clearStatusMsg();
                        bgPage.docs.push(doc);
                        openDoc(doc);
                    }
                );
            }
        }
    );
};

memento.getDocumentContent = function(reference) {
    memento.setStatusMsg(chrome.i18n.getMessage('loading_note'));

    var doc = null;

    if(reference !== null && typeof reference === 'object') {
        doc = reference;
    } else if (typeof reference === 'string' || reference instanceof String) {
        doc = bgPage.docs.filter(function (doc) { return doc.id == reference })[0];
    }

    console.log(doc);

    gdocs.getDocumentContent(doc, memento.setNoteContent);
}

function init (){
    //gapi.client.load('drive', 'v2', null);

    memento.loadI18nStrings();

    gdocs.auth(false, function(loggedIn) {

      if (loggedIn) {
            $('#loading').show();

            // init
            var getFolderIdByTitleCallback = function(folderId) {
                if(folderId){
                    bgPage.folderId = folderId;
                }

                if(localStorage.getItem('numberOfNotes') !== null && localStorage['numberOfNotes'] === 'single'){
                    $('.button.back').hide();
                    $('.option.delete').hide();
                    $('#open-note .button.options').show();

                    if(bgPage.doc && bgPage.doc.id) {
                        memento.getDocumentContent(bgPage.doc);
                    } else {
                        memento.loadSingleNote();
                    }
                } else {
                    $('#open-note .button.options').hide();
                    $('.button.back').show();
                    $('.option.delete').show();

                    if(bgPage.doc && bgPage.doc.id) {
                        memento.getDocumentContent(bgPage.doc);
                    } else {
                        memento.changeScreen('main-screen');
                        if(bgPage.docs && bgPage.docs.length > 0) {
                            memento.renderDocList();
                        }

                        memento.getListOfNotes(bgPage.folderId);
                    }
                }
            };

            if(bgPage.folderId) {
                getFolderIdByTitleCallback();
            } else {
                gdocs.getFolderIdByTitle(bgPage.folder, function(folderId){
                    // TODO looks strange, it can be improved
                    if(folderId) {
                        getFolderIdByTitleCallback(folderId)
                    } else {
                        console.log(bgPage.folder);
                        gdocs.createFolder(bgPage.folder, getFolderIdByTitleCallback);
                    }
                });
            }
      } else {
            $('#first-time').show();
      }
    });
}

$(document).ready(function () {
init();

    // buttons
    $('.button.back').click(function() {
        memento.changeScreen('main-screen');
        memento.getListOfNotes(bgPage.folderId);
    });

    $('.button.authorize').click(function() {
        gdocs.auth(true, function(loggedIn) {
            if (loggedIn) {
                $('#first-time').hide();
            } else {
                alert('no')
            }
        });
    });

    $('.option.options').click(function() {
        memento.openNewTab('options.html');
    });

    $('.button.new').click(function() {
        memento.changeScreen('open-note');
        memento.clearLastMod();
        $('.button.dropdown').hide();
        $('.button.save').show();
        $('#input-title').addClass('new');

        // TODO wysiwyg
        // FIXME This way to include the css its repeated
        $('#content').contents().find('head').append(
            $('<link/>', { rel: 'stylesheet', href: '../styles/document.css', type: 'text/css' })
        );
    });

    $('.button.cancel').click(function() {
        window.close();
    });

    // menu
    $(document).click(function(){
        memento.hideDropdown();
    });

    $('.option.newtab').click(function() {
        gdocs.getDocById(bgPage.doc.id, function(doc){
            memento.clearStatusMsg();
            memento.openNewTab(bgPage.doc.alternateLink);
        });
    });

    $('.option.delete').click(function(e) {
        if($('.option.delete').hasClass('active')){
            $('.option.delete').removeClass('active');
            $('.dropdown-menu-nested').hide();
        } else {
            $('.option.delete').addClass('active');
            $('.dropdown-menu-nested').show();
        }

        e.stopPropagation();
    });

    $('.option.notsure').click(function() {
        memento.hideDropdown();
    });

    $('.option.sure').click(function() {
        memento.setStatusMsg(chrome.i18n.getMessage('deleting_note'));

        gdocs.deleteDoc(
            bgPage.doc.id,
            function(){
                memento.clearStatusMsg();
                memento.changeScreen('main-screen');
                memento.getListOfNotes(bgPage.folderId);
            }
        );
    });

    $('.option.reload').click(function() {
        memento.getDocumentContent(bgPage.doc);
    });

    $('.button.dropdown').click(function(e) {
        if($('.dropdown-menu').is(':visible')){
            $('.button.dropdown').removeClass('pressed');
            $('.dropdown-menu').hide();
        } else {
            $('.button.dropdown').addClass('pressed');
            $('.dropdown-menu').show();
        }

        e.stopPropagation();
    });

    $('.button.save').click(function(){
        memento.createNote();
    });

    $('.option.refresh').click(function() {
        memento.getListOfNotes(bgPage.folderId);
    });

// inputs
    $('#input-title').keyup(function(e){
        if($(this).hasClass('new')) {
            if(e.keyCode === 13) {
                memento.createNote();
            }
        } else {
            memento.manageNoteChange(e);
        }
    });

    $('#input-title').change(function(){
        if($('#input-title').val().length === 0) {
            $('#input-title').addClass('error');
        } else if($('#input-title').hasClass('error')) {
            $('#input-title').removeClass('error');
        }
    });

    $('#input-title').attr('placeholder', chrome.i18n.getMessage('title'));

    $('#input-search').keyup(function(){
        // TODO search in the documents content
        for(var i = 0; i < bgPage.docs.length; i++ ) {
            var doc = bgPage.docs[i];
            if($('#input-search').val()) {
                if (doc.title.toLowerCase().indexOf($('#input-search').val().toLowerCase()) === -1){
                    $('.note-list-item.' + doc.id).hide();
                } else {
                    $('.note-list-item.' + doc.id).show();
                }
            } else {
                $('.note-list-item.' + doc.id).show();
            }

            memento.resizeMe();
        }
    });

    $('#input-search').attr('placeholder', chrome.i18n.getMessage('search'));

    // set iframe as editable
    $('#content').contents().get(0).designMode = 'on';

    var iframe = $('#content').contents().find('html');

    // detect if the note has changes
    iframe.bind('keyup',function(e){
        memento.manageNoteChange(e);
    });

    $('#note-list').on('click', '.note-list-item .doc-title', function(){
        memento.getDocumentContent($(this).attr('link'));
    });
});
