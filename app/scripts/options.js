/* global chrome */

var bgPage = chrome.extension.getBackgroundPage();

function restoreOptions() {
    // TODO remove repeated code

    // editor
    var size = (localStorage.getItem('editorSize') !== null) ? localStorage.editorSize : bgPage.defaultEditorSize;
    $('.editor input[value=' + size + ']').prop('checked', true );

    // notes
    var numberOfNotes;
    if(localStorage.getItem('numberOfNotes') !== null) {
        numberOfNotes = localStorage.numberOfNotes;
    } else {
        numberOfNotes = bgPage.defaultNumberOfNotes;
    }

    $('.number-of-notes input[value=' +  numberOfNotes + ']').prop('checked', true );

    // word wrap
    var wordWrap = (localStorage.getItem('wordWrap') !== null) ? localStorage.wordWrap : bgPage.defaultWordWrap;
    $('.word-wrap input[type=checkbox]').prop('checked', (wordWrap === 'true'));

    // linkify
    var linkify = (localStorage.getItem('linkify') !== null) ? localStorage.linkify : bgPage.defaultLinkify;
    $('.linkify input[type=checkbox]').prop('checked', (linkify === 'true') );
}

function loadI18nStrings() {
    var nodes = document.querySelectorAll('[class^="i18n_"]');
    for(var i = 0; i < nodes.length; i++) {
        var args = JSON.parse('[' + nodes[i].textContent + ']');
        var stringName = nodes[i].className.split(/\s/)[0].substring(5);
        if(arguments.length > 0) {
            nodes[i].innerHTML = chrome.i18n.getMessage(stringName, args);
        } else {
            nodes[i].innerHTML = chrome.i18n.getMessage(stringName);
        }
    }
}

$(document).ready(function () {
    restoreOptions();

    loadI18nStrings();

    $('input[type=radio][name=size]').change(function() {
        localStorage.editorSize = $(this).val();
    });

    $('input[type=radio][name=number]').change(function() {
        localStorage.numberOfNotes = $(this).val();
    });

    $('input[type=checkbox][name=word-wrap]').change(function() {
        localStorage.wordWrap = $(this).is(':checked');
    });

    $('input[type=checkbox][name=linkify]').change(function() {
        localStorage.linkify = $(this).is(':checked');
    });
});
