/* global chrome, bgPage, ui */

var ui = (function() {

    var config = {};

    var init = function(cfg) {
        config = cfg;
        bindEvents();
    }

    var bindEvents = function() {
        config.button.dropdown.on('click', openDropdown);
        $(document).click(hideDropdown);
    }

    var openDropdown = function(e) {
        if($('.dropdown-menu').is(':visible')){
            $('.button.dropdown').removeClass('pressed');
            $('.dropdown-menu').hide();
        } else {
            $('.button.dropdown').addClass('pressed');
            $('.dropdown-menu').show();
        }

        e.stopPropagation();
    }

    var hideDropdown = function() {
        $('.option.delete').removeClass('active');
        $('.dropdown-menu-nested').hide();
        $('.dropdown-menu').hide();
        $('.button.dropdown').removeClass('pressed');
    }

    var changeScreen = function (target) {
        reset();

        $('#loading').hide();
        $('#first-time').hide();
        $('#list').hide();
        $('#open-note').hide();

        $('#' + target).show();
        resize(target === 'open-note');
    }

    var reset = function(){
        // TODO too ugly! not proud of this
        // to main screen
        bgPage.doc = null;

        // to open note
        $('.button.save').hide();
        $('.button.newtab').show();
        $('#open-note #input-title').val('');
        $('#content').contents().find('html').html('');
        $('#input-title').removeClass('new');
        $('#input-title').removeClass('error');
        $('.button.dropdown').show();
        $('#open-note').removeAttr('etag');
    }

    var resize = function(resizeEditor){
        var width = $('#list').width();

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
            if(sameDay(dateParsed, new Date())){
                dateFormatted = dateParsed.format('HH:MM');
            } else {
                dateFormatted = dateParsed.format('d mmm');
            }
        }

        return dateFormatted;
    }

    var setStatusMsg = function (msg, error) {
        $('#status-msg').removeClass('error');

        if(msg){
            $('#status-msg').html(msg).show();
            if(error) {
                $('#status-msg').addClass('error');
                setTimeout(function() { //hide error msg
                    clearStatusMsg();
                }, 5000);
            }
        } else {
            $('#status-msg').hide();
        }
    }

    var clearStatusMsg = function () {
        $('#status-msg').removeClass('error');
        $('#status-msg').hide();
    }

    init({
        button: {
            dropdown: $('.button.dropdown')
        }
    });

    return {
        changeScreen: changeScreen,
        formatDate: formatDate,
        resize: resize,
        setStatusMsg: setStatusMsg,
        clearStatusMsg: clearStatusMsg,
    }

}());
