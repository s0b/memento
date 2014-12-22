var bgPage = chrome.extension.getBackgroundPage();

$(document).ready(function () {
    restoreOptions();

    loadI18nStrings();

    $(".editor .editorTitle, .editor .option").click(function(){
        swapOption($(".editor .option:visible"), "span.option", function(element) {
            localStorage["editorSize"] = $(element).attr("size");
        });
    });

    $(".numberOfNotes .option").click(function(){
        swapOption(this, "span.option", function(element) {
            if (localStorage.getItem("singleNoteTitle") === null) {
                localStorage["singleNoteTitle"] = bgPage.defaultDocTitle;
            }

            localStorage["singleNote"] = $(element).attr("singleNote");
        });
    });

    $(".editorTitle").lettering();
});

function swapOption(scope, lookFor, callback) {
    $(scope).fadeOut("fast", function() {
        var element = null;

        if($(scope).next(lookFor).length != 0) {
            element = $(scope).next(lookFor);
        } else {
            element = $(scope).prevAll(lookFor).last();
        }

        callback(element);

        element.fadeIn("fast");
    });
}

function restoreOptions() {
    //editor
    var size = (localStorage.getItem("editorSize") !== null) ? localStorage["editorSize"] : bgPage.defaultEditorSize;
    $('span.option[size="' + size + '"]').show();

    //notes
    if (localStorage['singleNote'] == 'true') {
        $(".numberOfNotes .singleNote").show();
    } else {
        $(".numberOfNotes .multiNote").show();
    }
}

function loadI18nStrings() {
    var nodes = document.querySelectorAll("[class^='i18n_']");
    for(var i = 0; i < nodes.length; i++) {
        var arguments = JSON.parse("[" + nodes[i].textContent + "]");
        var stringName = nodes[i].className.split(/\s/)[0].substring(5);
        if(arguments.length > 0)
            nodes[i].innerHTML = chrome.i18n.getMessage(stringName, arguments);
        else
            nodes[i].innerHTML = chrome.i18n.getMessage(stringName);
    }
}
