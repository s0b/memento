/* global chrome, note, ui, list, gdocs */

var bgPage = chrome.extension.getBackgroundPage();

function loadI18nStrings() {
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

    var inputs = document.querySelectorAll('input');
    Array.prototype.forEach.call(inputs, function(input) {
        if (input.placeholder.length > 0) {
            var stringName = input.placeholder.split(/\s/)[0].substring(5);
            input.placeholder = chrome.i18n.getMessage(stringName);
        }
    });
}

$(document).ready(function () {
    loadI18nStrings();

    // gdocs.auth(false, function(loggedIn) {
    gdocs.auth(false, function() {
        // if (loggedIn) {
            // $('#loading').show();

            var getFolderIdByTitleCallback = function(folderId) {
                if(folderId){
                    bgPage.folderId = folderId;
                }

                if(localStorage.getItem('numberOfNotes') !== null && localStorage['numberOfNotes'] === 'single'){
                    $('.button.back').hide();
                    $('.option.delete').hide();
                    $('#open-note .button.options').show();

                    if(bgPage.doc && bgPage.doc.id) {
                        note.open(bgPage.doc);
                    } else {
                        note.openSingleNote();
                    }
                } else {
                    $('#open-note .button.options').hide();
                    $('.button.back').show();
                    $('.option.delete').show();

                    if(bgPage.doc && bgPage.doc.id) {
                        note.open(bgPage.doc);
                    } else {
                        ui.changeScreen('list');
                        if(bgPage.docs && bgPage.docs.length > 0) {
                            list.render();
                        }

                        // TODO refactor
                        // list.get(bgPage.folderId);
                    }
                }
            }

            // TODO this block is confusing, it can be improved
            if(bgPage.folderId) {
                getFolderIdByTitleCallback();
            } else {
                gdocs.getFolderIdByTitle(bgPage.folder, function(folderId){
                    if(folderId) {
                        getFolderIdByTitleCallback(folderId)
                    } else {
                        gdocs.createFolder(bgPage.folder, getFolderIdByTitleCallback);
                    }
                });
            }
        // } else {
        //     $('#first-time').show();
        // }
    });
});
