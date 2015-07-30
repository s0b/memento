/* global chrome, bgPage, ui */

var ui = (function() {

    var config = {};

    var init = function(cfg) {
        config = cfg;
        bindEvents();
    }

    var bindEvents = function() {
        config.button.dropdown.on('click', openDropdown);
        // $(document).click(hideDropdown);
        config.main.click(hideDropdown);
    }

    var openDropdown = function(e) {
        if(config.dropdown.is(':visible')){
            hideDropdown();
        } else {
            config.button.dropdown.addClass('pressed');
            config.dropdown.show();
        }

        e.stopPropagation();
    }

    var hideDropdown = function() {
        config.dropdown.hide();
        config.dropdown.find('.active').removeClass('active');
        config.dropdownNested.hide();
        config.button.dropdown.removeClass('pressed');
    }

    var changeScreen = function (target) {
        // reset();

        config.main.children().not(config.status).hide();

        $('#' + target).show();
        resize(target === 'note');
        if(target === 'list'){
            list.get();
        }
    }

    // var reset = function(){
    //     // TODO too ugly! not proud of this
    //     // to main screen
    //     bgPage.doc = null;

    //     // to open note
    //     // config.button.save.hide();  // unncessary?
    //     // config.button.newtab.show();  // unncessary?
    //     // config.noteTitle.val('');  // unncessary?
    //     // $('#content').contents().find('html').html(''); // unncessary?
    //     // config.noteTitle.removeClass('new');  // unncessary?
    //     // config.noteTitle.removeClass('error');  // unncessary?
    //     config.button.dropdown.show();  // unncessary?
    //     $('#note').removeAttr('etag');  // unncessary?
    // }

    var resize = function(resizeEditor){
        var width = config.list.width();

        // TODO move it to note?
        if(resizeEditor) {
            var size = (localStorage.getItem('editorSize') !== null) ? localStorage.editorSize : bgPage.defaultEditorSize;

            var editorWidth = bgPage.editorSizes[size].width;
            var editorHeight = bgPage.editorSizes[size].height;

            editorHeight -= config.note.height() - config.content.height();

            config.content.width(editorWidth);
            // add padding
            // TODO padding as var
            config.content.height(editorHeight + 10);

            width = editorWidth;
        }

        // TODO can be done on jquery?
        var height = document.getElementById('wrapper').offsetHeight;

        document.body.style.width=width;
        document.getElementsByTagName('html')[0].style.width=width;
        document.body.style.height=height;
        document.getElementsByTagName('html')[0].style.height=height;
    }

    var formatDate = function(date, fullDate){
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
            var format;

            if(sameDay(dateParsed, new Date())){
                format = 'HH:MM';
            } else {
                format = 'd mmm';
            }

            dateFormatted = dateParsed.format(format);
        }

        return dateFormatted;
    }

    var setStatusMsg = function (msg, error) {
        config.status.removeClass('error');

        if(msg){
            config.status.html(msg).show();
            if(error) {
                config.status.addClass('error');
                setTimeout(function() { //hide error msg
                    clearStatusMsg();
                }, 5000);
            }
        } else {
            config.status.hide();
        }
    }

    var clearStatusMsg = function () {
        config.status.removeClass('error');
        config.status.hide();
    }

    init({
        main: $('#wrapper'),
        button: {
            dropdown: $('.button.dropdown')
        },
        dropdown: $('.dropdown-menu'),
        dropdownNested: $('.dropdown-menu-nested'),
        status: $('#status'),
        content: $('#content'),
        list: $('#list'),
        note: $('#note'),
    });

    return {
        changeScreen: changeScreen,
        formatDate: formatDate,
        resize: resize,
        setStatusMsg: setStatusMsg,
        clearStatusMsg: clearStatusMsg,
    }

}());
