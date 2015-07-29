/* global chrome, bgPage, gdocs, list, ui */

var note = (function() {

    var config = {};
    var typingTimer = null;

    var init = function(cfg) {
        config = cfg;
        bindEvents();

        // set iframe as editable
        var contents = $('#content').contents();
        contents.get(0).designMode = 'on';

        // detect if the note has changes
        contents.find('html').bind('keyup',function(e){
            contentChanged(e);
        });
    }

    var bindEvents = function() {
        config.button.save.click(save);
        config.title.keyup(titleChanged);
        // config.button.refresh.click(get);
        // config.button.options.click(openOptions);
        config.button.reload.click(open);
        config.button.back.click(back);
        config.button.newtab.click(openInTab);
        config.button.deleteMenu.click(deleteMenuShow);
        config.button.remove.click(remove);
        // config.search.keyup(search);
        // config.list.on('click', '.doc-title', open);
    }

    var open = function(reference) {
        ui.setStatusMsg(chrome.i18n.getMessage('loading_note'));

        var doc = null;

        if(reference !== null && typeof reference === 'object') {
            doc = reference;
        } else if (typeof reference === 'string' || reference instanceof String) {
            doc = bgPage.docs.filter(function (doc) { return doc.id == reference })[0];
        } else {
            doc = bgPage.doc;
        }

        var setNoteContent = function(doc, content){
            ui.changeScreen('open-note');

            // TODO wysiwyg - not proud about this replacements, just a workaround
            // remove styles added by Google Docs
            content = content.replace(/<style[^>]*>(.*?)<\/style>/gi, '');

            // avoid an error about moving with arrow keys over empty lines
            content = content.replace(/<span( class=\"[\w]+\")?><\/span>/gi, '<br>');

            $('#content').contents().find('html').html(content);

            // FIXME This way to include the css its repeated
            addEditorStyle();

            ui.resize(true);

            bgPage.doc = doc;
            $('#open-note').attr('etag', doc.etag);
            $('#open-note #input-title').val(doc.title);

            updateLastMod(doc.modifiedDate);
            ui.clearStatusMsg();
        }

        gdocs.getDocumentContent(doc, setNoteContent);
    }

    // TODO can be improved
    var openSingleNote = function() {
        ui.setStatusMsg(chrome.i18n.getMessage('creating_note'));

        // TODO send also the folderId
        gdocs.getDocByTitle(
            bgPage.defaultDocTitle,
            function(doc){
                if(doc) { // doc exists
                    open(doc)
                } else {  // doc must be created
                    ui.setStatusMsg(chrome.i18n.getMessage('creating_note'));

                    gdocs.createDoc(
                        bgPage.defaultDocTitle,
                        '',
                        bgPage.folderId,
                        function (doc){
                            ui.clearStatusMsg();
                            bgPage.docs.push(doc);
                            open(doc);
                        }
                    );
                }
            }
        );
    }

    var openInTab = function(){
        // TODO search in bgPage.docs[], a new request is not needed
        gdocs.getDocById(bgPage.doc.id, function(doc){
            ui.clearStatusMsg();
            window.open(bgPage.doc.alternateLink);
        });
    }

    var deleteMenuShow = function(e){
        if($('.option.delete').hasClass('active')){
            $('.option.delete').removeClass('active');
            $('.dropdown-menu-nested').hide();
        } else {
            $('.option.delete').addClass('active');
            $('.dropdown-menu-nested').show();
        }

        e.stopPropagation();
    }

    var remove = function() {
        ui.setStatusMsg(chrome.i18n.getMessage('deleting_note'));

        gdocs.deleteDoc(
            bgPage.doc.id,
            function(){
                ui.clearStatusMsg();
                ui.changeScreen('list');
                list.get(); // TODO can be managed in UI
            }
        );
    }

    var addEditorStyle = function() {
        $('#content').contents().find('head').append(
            $('<link/>', { rel: 'stylesheet', href: '../styles/document.css', type: 'text/css' })
        );
    }

    var save = function(){
        var title = $('#input-title').val();
        var content = $('#content').contents().find('html').html();

        if(title.length > 0) {
            var handleSuccess = function (doc) {
                ui.clearStatusMsg();
                bgPage.docs.push(doc);
                $('.button.save').removeClass('processing');
                $('.button.save').text('Ok'); // TODO move to translations
                $('.button.save').hide();
                $('.button.dropdown').show();
                $('#input-title').removeClass('new');
                updateLastMod(doc.modifiedDate);
                $('#open-note').attr('etag', doc.etag);
                bgPage.doc = doc;
            };

            $('#input-title').removeClass('error');
            $('.button.save').text('');
            $('.button.save').addClass('processing');

            ui.setStatusMsg(chrome.i18n.getMessage('creating_note'));

            gdocs.createDoc(title, content, bgPage.folderId, handleSuccess);
        } else {
            $('#input-title').addClass('error');
        }
    }

    var titleChanged = function(e){
        if($('#input-title').val().length === 0) {
            $('#input-title').addClass('error');
        } else if($('#input-title').hasClass('error')) {
            $('#input-title').removeClass('error');

            if($(this).hasClass('new')) {
                if(e.keyCode === 13) {
                    save();
                }
            } else {
                contentChanged(e);
            }
        }
    }

    var contentChanged = function (e) {
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
                    updateNote();
                } else {
                    $('#input-title').addClass('error');
                }
            }, 1000);
        }
    }

    var updateNote = function () {
        var doc = bgPage.doc;

        doc.title = $('#input-title').val();
        doc.content = $('#content').contents().find('html').html();

        ui.setStatusMsg(chrome.i18n.getMessage('saving_note'));

        gdocs.updateDoc(
            bgPage.doc.id,
            $('#input-title').val(),
            $('#content').contents().find('html').html(),
            function(doc) {
                ui.clearStatusMsg();
                $('#open-note').attr('etag', doc.etag);
                updateLastMod(new Date());
                bgPage.isUpdating = false;
                bgPage.doc = doc;
            }
        );
    }

    var back = function(){
        ui.changeScreen('list');
        clearLastMod();
        list.get(); // TODO move to ui
    }

    var clearLastMod = function() {
        $('#last-mod').cuteTime.stop_cuteness();
        $('#last-mod').html('');
    }

    var updateLastMod = function (date) {
        $('#last-mod').attr('data-timestamp', new Date(date));
        $('#last-mod').attr('title', ui.formatDate(date, true));
        $('#last-mod').cuteTime({ refresh: 10000 })
    }

    var create = function() {
        ui.changeScreen('open-note');
        // memento.clearLastMod(); // TODO it's necessary?
        $('.button.dropdown').hide();
        $('.button.save').show();
        $('#input-title').addClass('new');

        // TODO wysiwyg
        addEditorStyle();
    }

    init({
        // main: $('#box'),
        button: {
            // new: $('.button.new'),
            // options: $('.option.options'),
            reload: $('.option.reload'),
            newtab: $('.option.newtab'),
            deleteMenu: $('.option.delete'), // TODO move to ui
            remove: $('.option.sure'), // TODO move to ui
            back: $('.button.back'),
            save: $('.button.save'),
        },
        title: $('#input-title'),
        // search: $('#input-search'),
        // list: $('#note-list')
    });

    return {
        open: open,
        create: create
    }

}());
