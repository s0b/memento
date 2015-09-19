/* global chrome, bgPage, gdocs, list, ui */

var note = (function() {

    var config = {};
    var typingTimer = null;

    var init = function(cfg) {
        config = cfg;
        bindEvents();

        // set iframe as editable
        config.noteContent.get(0).designMode = 'on';
    }

    var bindEvents = function() {
        config.title.keyup(titleChanged);
        config.button.save.click(save);
        config.button.reload.click(open);
        config.button.back.click(back);
        config.button.newtab.click(openInTab);
        config.button.deleteMenu.click(deleteMenuShow);
        config.button.remove.click(remove);
        config.noteContent.find('html').bind('keyup', contentChanged);
    }

    var open = function(reference) {
        ui.setStatusMsg(chrome.i18n.getMessage('loading_note'));

        var doc = null;

        // check if it's an object but not an event
        if(reference !== null && typeof reference === 'object' && !reference.target) {
            doc = reference;
        } else if (typeof reference === 'string' || reference instanceof String) {
            doc = bgPage.docs.filter(function (doc) { return doc.id == reference })[0];
        } else {
            doc = bgPage.doc;
        }

        var setNoteContent = function(doc, content){
            ui.changeScreen('note');

            // TODO wysiwyg - not proud about this replacements, just a workaround
            // remove styles added by Google Docs
            content = content.replace(/<style[^>]*>(.*?)<\/style>/gi, '');

            // avoid an error about moving with arrow keys over empty lines
            content = content.replace(/<span( class=\"[\w]+\")?><\/span>/gi, '<br>');

            config.noteContent.find('html').html(content);

            // FIXME This way to include the css its repeated
            addEditorStyle();

            resizeEditor();
            ui.resize();

            bgPage.doc = doc;
            config.main.attr('etag', doc.etag);
            config.title.val(doc.title);

            updateLastMod(doc.modifiedDate);
            ui.clearStatusMsg();
        }

        gdocs.getDocumentContent(doc, setNoteContent);
    }

    var resizeEditor = function(){
        var size = (localStorage.getItem('editorSize') !== null) ? localStorage.editorSize : bgPage.defaultEditorSize;

        var editorWidth = bgPage.editorSizes[size].width;
        var editorHeight = bgPage.editorSizes[size].height;

        editorHeight -= config.main.height() - $('#content').height();

        $('#content').width(editorWidth);
        // add padding
        // TODO padding as var
        $('#content').height(editorHeight + 10);
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
        window.open(bgPage.doc.alternateLink);
    }

    var deleteMenuShow = function(e){
        if(config.button.deleteMenu.hasClass('active')){
            config.button.deleteMenu.removeClass('active');
            config.dropdownNested.hide();
        } else {
            config.button.deleteMenu.addClass('active');
            config.dropdownNested.show();
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

                // FIXME why reference?
                bgPage.docs.filter(function (doc) { return doc.id == reference })[0];
                // TODO remove doc from array and re-render
            }
        );
    }

    var addEditorStyle = function() {
        var head = config.noteContent.find('head');
        head.append(
            $('<link/>', { rel: 'stylesheet', href: '../styles/document.css', type: 'text/css' })
        );

        var wordWrap = (localStorage.getItem('wordWrap') !== null) ? localStorage.wordWrap : bgPage.defaultWordWrap;
        if(wordWrap === 'true') {
            head.append('<style type="text/css">body {white-space: normal;}</style>');
        }
    }

    var save = function(){
        var title = config.title.val();
        var content = config.noteContent.find('html').html();

        // TODO the title lenth should be validated in the event, not here
        if(title.length > 0) {
            var handleSuccess = function (doc) {
                reset()
                ui.clearStatusMsg();
                updateLastMod(doc.modifiedDate);
                bgPage.docs.push(doc);
                config.main.attr('etag', doc.etag);
                bgPage.doc = doc;
            };

            config.title.removeClass('error');
            config.button.save.text('');
            config.button.save.addClass('processing');

            ui.setStatusMsg(chrome.i18n.getMessage('creating_note'));

            gdocs.createDoc(title, content, bgPage.folderId, handleSuccess);
        } else {
            config.title.addClass('error');
        }
    }

    var titleChanged = function(e){
        if(config.title.val().length === 0) {
            config.title.addClass('error');
        } else {

            if(config.title.hasClass('error')) {
                config.title.removeClass('error');
            }

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
                if(config.title.val() && config.title.val().length > 0) {
                    bgPage.isUpdating = true;

                    config.title.removeClass('error');

                    //until the etag check works, just updateNote
                    updateNote();
                } else {
                    config.title.addClass('error');
                }
            }, 1000);
        }
    }

    var updateNote = function () {
        var doc = bgPage.doc;

        doc.title = config.title.val();
        doc.content = config.noteContent.find('html').html();

        ui.setStatusMsg(chrome.i18n.getMessage('saving_note'));

        gdocs.updateDoc(
            bgPage.doc.id,
            config.title.val(),
            config.noteContent.find('html').html(),
            function(doc) {
                ui.clearStatusMsg();
                config.main.attr('etag', doc.etag);
                updateLastMod(new Date());
                bgPage.isUpdating = false;
                bgPage.doc = doc;
            }
        );
    }

    var back = function(){
        reset();
        ui.changeScreen('list');
    }

    var reset = function(){
        bgPage.doc = null;
        clearLastMod();
        config.button.save.hide();
        config.button.save.removeClass('processing');
        config.button.save.text('Ok'); // TODO move to translations
        config.button.dropdown.show();
        config.noteContent.find('html').html('');
        config.main.removeAttr('etag');
        config.title.val('');
        config.title.removeClass('new');
        config.title.removeClass('error');
        config.main.removeAttr('etag');
    }

    var clearLastMod = function() {
        config.lastMod.cuteTime.stop_cuteness();
        config.lastMod.html('');
    }

    var updateLastMod = function (date) {
        config.lastMod.attr('data-timestamp', new Date(date));
        config.lastMod.attr('title', ui.formatDate(date, true));
        config.lastMod.cuteTime({ refresh: 10000 })
    }

    var create = function() {
        resizeEditor();
        ui.changeScreen('note');
        // memento.clearLastMod(); // TODO it's necessary?
        config.button.dropdown.hide();
        config.button.save.show();
        config.title.addClass('new');

        // TODO wysiwyg
        addEditorStyle();
    }

    init({
        main: $('#note'),
        button: {
            dropdown: $('#note .button.dropdown'),
            reload: $('.option.reload'),
            newtab: $('.option.newtab'),
            deleteMenu: $('.option.delete'), // TODO move to ui
            remove: $('.option.sure'), // TODO move to ui
            back: $('.button.back'),
            save: $('.button.save'),
        },
        title: $('#input-title'),
        lastMod: $('#last-mod'),
        note: $('#content'),
        noteContent: $('#content').contents(),
        dropdownNested: $('.dropdown-menu-nested')
    });

    return {
        open: open,
        openSingleNote: openSingleNote,
        create: create
    }

}());
