var memento = {};
var bgPage = chrome.extension.getBackgroundPage();
var typingTimer = null;

memento.openNewTab = function(url) {
	chrome.tabs.create({url: url});
	window.close();
};

memento.updateLastMod = function (date) {
	$("#last-mod").attr("data-timestamp", new Date(date));
	$("#last-mod").attr("title", memento.formatDate(date, true));
	$("#last-mod").cuteTime({ refresh: 10000 })
};

memento.clearLastMod = function() {
	$("#last-mod").cuteTime.stop_cuteness();
	$("#last-mod").html("");
};

memento.setStatusMsg = function (msg, error) {
	$("#status-msg").removeClass('error');

	if(msg){
		$("#status-msg").html(msg).show();
		if(error) {
			$("#status-msg").addClass('error');
			setTimeout(function() { //hide error msg
				memento.clearStatusMsg();
			}, 5000);
		}
	} else {
		$("#status-msg").hide();
	}
};

memento.clearStatusMsg = function () {
	$("#status-msg").removeClass('error');
	$("#status-msg").hide();
};

memento.hideDropdown = function(){
	$(".option.delete").removeClass("active");
	$(".dropdown-menu-nested").hide();
	$(".dropdown-menu").hide();
	$(".button.dropdown").removeClass("pressed");
};

memento.changeScreen = function (target) {
	memento.resetUi();

	$("#loading").hide();
	$("#first-time").hide();
	$("#main-screen").hide();
	$("#open-note").hide();

	$("#" + target).show();
	memento.resizeMe(target == "open-note");
};

memento.resetUi = function(){
	//TODO too ugly!
	//to main screen
	bgPage.doc = null;

	//to open note
	$(".button.save").hide();
	$(".button.newtab").show();
	$("#open-note #input-title").val("");
	$("#content").contents().find('html').html("");
	memento.clearLastMod();
	$("#input-title").removeClass("new");
	$("#input-title").removeClass("error");
	$(".button.dropdown").show();
	$("#open-note").removeAttr('etag');
};

memento.renderDocList = function () {
	var html = [];
	for (var i = 0, doc; doc = bgPage.docs[i]; ++i) {
		var link = doc.resourceId;
		html.push(
			'<div class="note-list-item ', link, '">',
				'<div class="date" title="', memento.formatDate(doc.entry.updated.$t, true), '">', memento.formatDate(doc.entry.updated.$t), '</div>',
				'<div class="doc-title" link="', link,'">',doc.title,'</div>',
			'</div>'
		);
	}
	$('#note-list').html(html.join(''));
	memento.clearStatusMsg();
	memento.resizeMe();
};

memento.resizeMe = function(resizeEditor){
	var width = $("#main-screen").width();

	if(resizeEditor) {
		var size = (localStorage.getItem("editorSize") !== null) ? localStorage["editorSize"] : bgPage.defaultEditorSize;

		var editorWidth = bgPage.editorSizes[size]["width"];
		var editorHeight = bgPage.editorSizes[size]["height"];

		editorHeight -= $("#open-note").height() - $("#content").height();

		$("#content").width(editorWidth);
		$("#content").height(editorHeight + 10); //add padding

		width = editorWidth;
	}

	var height = document.getElementById("wrapper").offsetHeight;

	document.body.style.width=width;
	document.getElementsByTagName("html")[0].style.width=width;
	document.body.style.height=height;
	document.getElementsByTagName("html")[0].style.height=height;
};

memento.formatDate = function(date, fullDate){
	var sameDay = function( d1, d2 ){
		return d1.getUTCFullYear() == d2.getUTCFullYear() &&
			   d1.getUTCMonth() == d2.getUTCMonth() &&
			   d1.getUTCDate() == d2.getUTCDate();
	};

	var dateFormatted;

	var dateParsed = new Date(Date.parse(date,"isoUtcDateTime"));
	if(fullDate){
		dateFormatted = dateParsed.format(chrome.i18n.getMessage("date_format"));
	} else {
		if(sameDay(dateParsed, new Date())){
			dateFormatted = dateParsed.format("HH:MM");
		} else {
			dateFormatted = dateParsed.format("d mmm");
		}
	}


	return dateFormatted;
};

memento.loadSingleNote = function() {
	gdocs.getDocByTitle(
		localStorage["singleNoteTitle"],
		function(doc){
			var openDoc = function(doc){
				gdocs.getDocumentContent(doc.resourceId, memento.setNoteContent);
			};

			if(doc) { // doc exists
				openDoc(doc)
			} else {  // doc must be created
				gdocs.createDoc(
					localStorage["singleNoteTitle"],
					"",
					function (doc){
						openDoc(doc);
					}
				);
			}
		}
	);
};

memento.setNoteContent = function (docId, content) {
	memento.changeScreen('open-note');

	//TODO wysiwyg - not proud about this replacements, just a workaround
	// remove styles added by Google Docs
	content = content.replace(/<style[^>]*>(.*?)<\/style>/gi, "");

	// avoid an error about moving with arrow keys over empty lines
	content = content.replace(/<span( class=\"[\w]+\")?><\/span>/gi, "<br>");

	$("#content").contents().find('html').html(content);
	$("#content").contents().find("head").append($("<link/>", { rel: "stylesheet", href: "../css/document.css", type: "text/css" }));

	memento.resizeMe(true);

	gdocs.getDocById(docId, function(doc){
		bgPage.doc = doc;
		$("#open-note").attr('etag', doc.entry.gd$etag);
		$("#open-note #input-title").val(doc.title);
		memento.updateLastMod(doc.entry.updated.$t);
		memento.clearStatusMsg();
	});
};

memento.manageNoteChange = function (e) {
	var keyCodes = [37, 38, 39, 40];

	// check if is a new doc and isnt an arrow key
	if(((bgPage.doc && bgPage.doc.resourceId) && !bgPage.isUpdating) && jQuery.inArray(e.keyCode, keyCodes) == '-1'){
		clearTimeout(typingTimer);

		typingTimer = setTimeout(function(){
			if($("#input-title").val() && $("#input-title").val().length > 0) {
				bgPage.isUpdating = true;

				$("#input-title").removeClass("error");
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
				$("#input-title").addClass("error");
			}
		}, 1000);
	}
};

memento.insertHtmlAfterSelection = function(html) {
	var win = document.getElementById('content').contentWindow;
	var iframe = document.getElementById('content');
	var doc = iframe.contentDocument || iframe.contentWindow.document;

	var sel, range, expandedSelRange;
	if (win.getSelection) {
		sel = win.getSelection();
		if (sel.getRangeAt && sel.rangeCount) {
			range = win.getSelection().getRangeAt(0);
			expandedSelRange = range.cloneRange();
			range.collapse(false);

			// Range.createContextualFragment() would be useful here but is
			// non-standard and not supported in all browsers (IE9, for one)
			var el = doc.createElement("div");
			el.innerHTML = html;
			var frag = doc.createDocumentFragment(), node, lastNode;
			while ( (node = el.firstChild) ) {
				lastNode = frag.appendChild(node);
			}
			range.insertNode(frag);

			// Preserve the selection
			if (lastNode) {
				expandedSelRange.setStartAfter(lastNode);
				expandedSelRange.setEndAfter(lastNode);
				sel.removeAllRanges();
				sel.addRange(expandedSelRange);
			}
		}
	} else if (doc.selection && doc.selection.createRange) {
		range = doc.selection.createRange();
		expandedSelRange = range.duplicate();
		range.collapse(false);
		range.pasteHTML(html);
		expandedSelRange.setEndPoint("EndToEnd", range);
		expandedSelRange.select();
	}
};

memento.linkify = function(text) {
	var regex = /(http|https|ftp)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,3}(:[a-zA-Z0-9]*)?\/?([a-zA-Z0-9\-\._\?\,\'\/\\\+&amp;%\$#\=~])*/g;
	return text.replace(regex,"<a href='$&'>$&</a>");
};

memento.cleanHtml = function(html) {
	html = html.replace(/<html[^>]*?>(.*)/gim, "$1");
	html = html.replace(/<\/html>/gi, '');
	html = html.replace(/<body[^>]*?>(.*)/gi, "$1");
	html = html.replace(/<\/body>/gi, '');

	// remove style, meta and link tags
	html = html.replace(/<style[^>]*?>[\s\S]*?<\/style[^>]*>/gi, '');
	html = html.replace(/<(?:meta|link)[^>]*>\s*/gi, '');

	// remove XML elements and declarations
	html = html.replace(/<\\?\?xml[^>]*>/gi, '');

	// remove w: tags with contents.
	html = html.replace(/<w:[^>]*>[\s\S]*?<\/w:[^>]*>/gi, '');

	// remove tags with XML namespace declarations: <o:p><\/o:p>
	html = html.replace(/<o:p>\s*<\/o:p>/g, '');
	html = html.replace(/<o:p>[\s\S]*?<\/o:p>/g, '&nbsp;');
	html = html.replace(/<\/?\w+:[^>]*>/gi, '');

	// remove comments [SF BUG-1481861].
	html = html.replace(/<\!--[\s\S]*?-->/g, '');
	html = html.replace(/<\!\[[\s\S]*?\]>/g, '');

	// remove mso-xxx styles.
	html = html.replace(/\s*mso-[^:]+:[^;"']+;?/gi, '');

	// remove styles.
	html = html.replace(/<(\w[^>]*) style='([^\']*)'([^>]*)/gim, "<$1$3");
	html = html.replace(/<(\w[^>]*) style="([^\"]*)"([^>]*)/gim, "<$1$3");

	// remove "bad" tags
	html = html.replace(/<\s+[^>]*>/gi, '');

	// remove empty <span>s (ie. no attributes, no reason for span in pasted text)
	// done twice for nested spans
	html = html.replace(/<span>([\s\S]*?)<\/span>/gi, '$1');
	html = html.replace(/<span>([\s\S]*?)<\/span>/gi, '$1');

	// remove empty <div>s (see span)
	html = html.replace(/<div>([\s\S]*?)<\/div>/gi, '$1');
	html = html.replace(/<div>([\s\S]*?)<\/div>/gi, '$1');

	// remove empty tags (three times, just to be sure - for nested empty tags).
	// This also removes any empty anchors
	html = html.replace(/<([^\s>]+)(\s[^>]*)?>\s*<\/\1>/g, '');
	html = html.replace(/<([^\s>]+)(\s[^>]*)?>\s*<\/\1>/g, '');
	html = html.replace(/<([^\s>]+)(\s[^>]*)?>\s*<\/\1>/g, '');

	// remove most of html elements, inline styles and other attributes
	var white="p|span";
	var black="script|object|embed";
	regexp=new RegExp("(<("+black+")[^>]*>.*</\\2>|(?!<[/]?("+white+")(\\s[^<]*>|[/]>|>))<[^<>]*>|(?!<[^<>\\s]+)\\s[^</>]+(?=[/>]))", "gi");
	html = html.replace(regexp,"");

	html = html.trim();

	// Make it valid xhtml
	html = html.replace(/<br>/gi, '<br />');

	// remove <br>'s that end a paragraph here.
	html = html.replace(/<br[^>]*><\/p>/gim, '</p>');

	// remove empty paragraphs - with just a &nbsp; (or whitespace) in (and tags again for good measure)
	html = html.replace(/<p>&nbsp;<\/p>/gi,'');
	html = html.replace(/<p>\s<\/p>/gi, '');
	html = html.replace(/<([^\s>]+)(\s[^>]*)?>\s*<\/\1>/g, '');

	return html;
};

memento.updateNote = function () {
	var doc = bgPage.doc;

	doc.title = $("#input-title").val();
	doc.content = $("#content").contents().find('html').html();

	gdocs.updateDoc(
		doc,
		function(doc) {
			$("#open-note").attr('etag', doc.entry.gd$etag);
			memento.updateLastMod(new Date());
			bgPage.isUpdating = false;
			bgPage.doc = doc;
		}
	);
};

memento.createNote = function () {
	var title = $("#input-title").val();
	var content = $("#content").contents().find('html').html();

	if(title.length > 0) {
		var handleSuccess = function (doc) {
			$(".button.save").removeClass("processing");
			$(".button.save").text("Ok");
			$(".button.save").hide();
			$(".button.dropdown").show();
			$("#input-title").removeClass("new");
			memento.updateLastMod(doc.entry.updated.$t);
			$("#open-note").attr('etag', doc.entry.gd$etag);
			bgPage.doc = doc;
		};

		$("#input-title").removeClass("error");
		$(".button.save").text("");
		$(".button.save").addClass("processing");

		gdocs.createDoc(title, content, handleSuccess);
	} else {
		$("#input-title").addClass("error");
	}
};

memento.loadI18nStrings = function () {
	var nodes = document.querySelectorAll("[class^='i18n_']");
	for(var i = 0; i < nodes.length; i++) {
		var arguments = JSON.parse("[" + nodes[i].textContent + "]");
		var stringName = nodes[i].className.split(/\s/)[0].substring(5);
		if(arguments.length > 0)
			nodes[i].innerHTML = chrome.i18n.getMessage(stringName, arguments);
		else
			nodes[i].innerHTML = chrome.i18n.getMessage(stringName);
	}
};

$(document).ready(function () {
	memento.loadI18nStrings();

	//clear token for dev purposes
	//bgPage.oauth.clearTokens();
	if(bgPage.oauth.hasToken()) {
		$('#loading').show();

		// init
		var getFolderIdByTitleCallback = function(folderId) {
			if(folderId){
				bgPage.folderId = folderId;
			}

			if(localStorage.getItem("singleNote") !== null && localStorage["singleNote"] == 'true'){
				$('.button.back').hide();
				$('.option.delete').hide();
				$('#open-note .button.options').show();

				if(bgPage.doc && bgPage.doc.resourceId) {
					gdocs.getDocumentContent(bgPage.doc.resourceId, memento.setNoteContent);
				} else {
					memento.loadSingleNote();
				}
			} else {
				$('#open-note .button.options').hide();
				$('.button.back').show();
				$('.option.delete').show();

				if(bgPage.doc && bgPage.doc.resourceId) {
					gdocs.getDocumentContent(bgPage.doc.resourceId, memento.setNoteContent);
				} else {
					memento.changeScreen('main-screen');
					if(bgPage.docs && bgPage.docs.length > 0) {
						memento.renderDocList();
					}

					gdocs.getDocumentList();
				}
			}
		};

		if(bgPage.folderId) {
			getFolderIdByTitleCallback();
		} else {
			gdocs.getFolderIdByTitle(bgPage.folder, getFolderIdByTitleCallback);
		}
	} else {
		$('#first-time').show();
	}

	// buttons
	$(".button.back").click(function() {
		memento.changeScreen('main-screen');
		gdocs.getDocumentList();
	});

	$(".button.new").click(function() {
		memento.changeScreen('open-note');
		memento.clearLastMod();
		$(".button.dropdown").hide();
		$(".button.save").show();
		$("#input-title").addClass("new");

		//TODO wysiwyg
		$("#content").contents().find("head").append($("<link/>", { rel: "stylesheet", href: "../css/document.css", type: "text/css" }));
	});

	$(".button.save").click(function(){
		memento.createNote();
	});

	$(".button.refresh").click(function() {
		gdocs.getDocumentList();
	});

	$(".button.options").click(function() {
		memento.openNewTab("options.html");
	});

	$(".button.dropdown").click(function(e) {
		if($(".dropdown-menu").is(":visible")){
			$(".button.dropdown").removeClass("pressed");
			$(".dropdown-menu").hide();
		} else {
			$(".button.dropdown").addClass("pressed");
			$(".dropdown-menu").show();
		}

		e.stopPropagation();
	});

	$(".button.authorize").click(function() {
		bgPage.oauth.authorize(function(){
			// this callback is mandatory to close the tab, even if it is empty :(
		});
	});

	$(".button.cancel").click(function() {
		window.close();
	});

	// menu
	$(document).click(function(){
		memento.hideDropdown();
	});

	$(".option.newtab").click(function() {
		gdocs.getDocById(bgPage.doc.resourceId, function(doc){
			memento.openNewTab(gdocs.getLink(doc.entry.link, 'alternate').href);
		});
	});

	$(".option.delete").click(function(e) {
		if($(".option.delete").hasClass("active")){
			$(".option.delete").removeClass("active");
			$(".dropdown-menu-nested").hide();
		} else {
			$(".option.delete").addClass("active");
			$(".dropdown-menu-nested").show();
		}

		e.stopPropagation();
	});

	$(".option.notsure").click(function() {
		memento.hideDropdown();
	});

	$(".option.sure").click(function() {
		gdocs.deleteDoc(
			bgPage.doc.resourceId,
			function(){
				memento.changeScreen('main-screen');
				gdocs.getDocumentList();
			}
		);
	});

	$(".option.reload").click(function() {
		gdocs.getDocumentContent(bgPage.doc.resourceId, memento.setNoteContent);
	});

	// inputs
	$('#input-title').keyup(function(e){
		if($(this).hasClass("new")) {
			if(e.keyCode == 13) {
				memento.createNote();
			}
		} else {
			memento.manageNoteChange(e);
		}
	});

	$('#input-title').change(function(){
		if($("#input-title").val().length == 0) {
			$("#input-title").addClass("error");
		} else if($("#input-title").hasClass("error")) {
			$("#input-title").removeClass("error");
		}
	});

	$("#input-title").attr("placeholder", chrome.i18n.getMessage("title"));

	$('#inputSearch').keyup(function(){
		for(var i = 0; i < bgPage.docs.length; i++ ) {
			var doc = bgPage.docs[i];
			if($('#inputSearch').val()) {
				if (doc.title.toLowerCase().indexOf($('#inputSearch').val().toLowerCase()) == -1){
					$(".note-list-item." + doc.resourceId).hide();
				} else {
					$(".note-list-item." + doc.resourceId).show();
				}
			} else {
				$(".note-list-item." + doc.resourceId).show();
			}

			memento.resizeMe();
		}
	});

	$("#inputSearch").attr("placeholder", chrome.i18n.getMessage("search"));

	// set iframe as editable
	$('#content').contents().get(0).designMode = 'on';

	// editor
	var iframe = $('#content').contents().find('html');

	// detect if the note has changes
	iframe.bind('keyup',function(e){
		memento.manageNoteChange(e);
	});

	// remove html format on paste
//    iframe.bind('drop', function(e){
//        //TODO
//    });

	iframe.bind('paste', function(e){
		if (e.originalEvent.clipboardData && e.originalEvent.clipboardData.getData) {
			var html = e.originalEvent.clipboardData.getData('text/html');
			html = memento.cleanHtml(html);
			html = memento.linkify(html);

			memento.insertHtmlAfterSelection(html);

			e.preventDefault(); // prevent paste untreated content
		}
	});

	// open links
	iframe.on('click', 'a', function() {
		memento.openNewTab($(this).attr('href'));
	});

	// misc
	$('#note-list').on('click', '.note-list-item .doc-title', function(){
		gdocs.getDocumentContent($(this).attr('link'), memento.setNoteContent);
	});
});
