var gdocs = {};
var bgPage = chrome.extension.getBackgroundPage();
var DEFAULT_MIMETYPES = {
	'atom': 'application/atom+xml',
	'document': 'text/html',
	'spreadsheet': 'text/csv',
	'presentation': 'text/plain',
	'pdf': 'application/pdf'
};

gdocs.GoogleDoc = function (entry) {
	this.entry = entry;
	this.title = entry.title.$t;
	this.resourceId = entry.gd$resourceId.$t.split(':')[1];
	this.link = {
		'alternate': gdocs.getLink(entry.link, 'alternate').href
	};
	this.type = gdocs.getCategory(entry.category, 'http://schemas.google.com/g/2005#kind');
	this.content = "";
};

gdocs.sendRequest = function(url, callback, params) {
	var handleSuccess = function(response, xhr) {
		clearTimeout(requestTimer);
		if (xhr.status != 200 && xhr.status != 201 && xhr.status != 304) {
			var message = chrome.i18n.getMessage("error_" + xhr.status);
			memento.setStatusMsg((message) ? message : chrome.i18n.getMessage("error_unknown"), true);
			return;
		}

		callback(response, xhr);
	};

	var requestTimer = setTimeout(function() {
		memento.setStatusMsg(chrome.i18n.getMessage("request_too_long"));
	}, 10000);

	bgPage.oauth.sendSignedRequest(url, handleSuccess, params);
};

gdocs.getDocumentList = function (opt_url) {
	memento.setStatusMsg(chrome.i18n.getMessage("loading_note_list"));

	var params = {
		'headers': {
			'GData-Version': '3.0'
		},
		'parameters': {
			'alt': 'json'
		}
	};

	bgPage.docs = [];
	var url = opt_url || bgPage.DOCLIST_FEED + bgPage.folderId + '/contents';
	var parts = url.split('?');

	if (parts.length > 1) {
		url = parts[0]; // Extract base URI. Params are passed in separately.

		var extraParts = parts[1].split('&');

		var parameters = {};
		for (var i = 0, pair; pair = extraParts[i]; ++i) {
			var param = pair.split('=');
			parameters[decodeURIComponent(param[0])] = decodeURIComponent(param[1]);
		}

		params['parameters'] = parameters;
	}

	gdocs.sendRequest(url, gdocs.processDocListResults, params);
};

gdocs.processDocListResults = function (response) {
	var data = JSON.parse(response);

	if(data.feed.entry){
		for (var i = 0, entry; entry = data.feed.entry[i]; ++i) {
			var doc = new gdocs.GoogleDoc(entry);
			if (doc.type.label == "document") bgPage.docs.push(doc);
		}
	}

	var nextLink = gdocs.getLink(data.feed.link, 'next');

	if (nextLink) {
		gdocs.getDocumentList(nextLink.href); // Fetch next page of results.
	} else {
		memento.renderDocList();
	}
};

gdocs.getFolderIdByTitle = function(title, callback) {
	var params = {
		'headers': {
			'GData-Version': '3.0'
		},
		'parameters': {
			'alt': 'json',
			'title': title,
			'showfolders': 'true',
			'title-exact': 'true'
		}
	};

	var handleSuccess = function(response) {
		var data = JSON.parse(response);

		if(data.feed.entry && data.feed.entry.length > 0) {
			callback(data.feed.entry[0].gd$resourceId.$t.split(':')[1]); // we are only interested in one folder
		} else {
			gdocs.createFolder(title, callback);
		}
	};

	gdocs.sendRequest(bgPage.DOCLIST_FEED, handleSuccess, params);
};

gdocs.getDocById = function(docId, callback) {
	var params = {
		'method': 'GET',
		'headers': {
			'GData-Version': '3.0'
		},
		'parameters': {
			'alt': 'json'
		}
	};

	var handleSuccess = function(response) {
		memento.clearStatusMsg();

		var doc = new gdocs.GoogleDoc(JSON.parse(response).entry);
		callback(doc);
	};

	gdocs.sendRequest(bgPage.DOCLIST_FEED + docId, handleSuccess, params);
};

gdocs.getDocByTitle = function(title, callback) {
	var params = {
		'method': 'GET',
		'headers': {
			'GData-Version': '3.0'
		},
		'parameters': {
			'alt': 'json',
			'title': title,
			'title-exact': 'true'
		}
	};

	var handleSuccess = function(response) {
		var data = JSON.parse(response);

		var doc = null;

		if(data.feed.entry && data.feed.entry.length > 0) {
			doc = new gdocs.GoogleDoc(data.feed.entry[0]); // we are only interested in one doc
		}

		callback(doc);
	};

	gdocs.sendRequest(bgPage.DOCLIST_FEED, handleSuccess, params);
};

gdocs.getDocumentContent = function(docId, callback) {
	memento.setStatusMsg(chrome.i18n.getMessage("loading_note"));

	var params = {
		'method': 'GET',
		'headers': {
			'GData-Version': '3.0'
		},
		'parameters': {
			'id': docId,
			'exportFormat': 'html',
			'format': 'html'
		}
	};

	var handleSuccess = function(response, xhr) {
		callback(docId, xhr.responseText);
	};

	var url = bgPage.DOCLIST_SCOPE + 'download/documents/export/Export';
	gdocs.sendRequest(url, handleSuccess, params);
};

gdocs.createDoc = function (title, content, callback) {
	memento.setStatusMsg(chrome.i18n.getMessage("creating_note"));

	var params = {
		'method': 'POST',
		'headers': {
			'GData-Version': '3.0',
			'Content-Type': 'multipart/related; boundary=END_OF_PART'
		},
		'parameters': {
			'alt': 'json'
		},
		'body': gdocs.constructContentBody_(title, "document", content)
	};

	var handleSuccess = function (response) {
		memento.clearStatusMsg();

		var newDoc = new gdocs.GoogleDoc(JSON.parse(response).entry);
		bgPage.docs.push(newDoc);
		callback(newDoc);
	};

	gdocs.sendRequest(bgPage.DOCLIST_FEED + bgPage.folderId + '/contents', handleSuccess, params);
};

gdocs.updateDoc = function(googleDocObj, callback) {
	memento.setStatusMsg(chrome.i18n.getMessage("saving_note"));

	var params = {
		'method': 'PUT',
		'headers': {
			'GData-Version': '3.0',
			'Content-Type': 'multipart/related; boundary=END_OF_PART',
			'If-Match': '*'
		},
		'parameters': {'alt': 'json', 'expand-acl': true, 'format': 'html'},
		'body': gdocs.constructContentBody_(googleDocObj.title, "document", googleDocObj.content)
	};

	var handleSuccess = function(response) {
		/*//TODO forced to get again the doc to update etag :( must exist a better way...
		gdocs.getDocById(googleDocObj.resourceId, function(doc){
			memento.clearStatusMsg();
			callback(doc);
		});*/
		var doc = new gdocs.GoogleDoc(JSON.parse(response).entry);

		memento.clearStatusMsg();
		callback(doc);
	};

	var url = "https://docs.google.com/feeds/default/media/"+ googleDocObj.resourceId; //TODO createsession
	gdocs.sendRequest(url, handleSuccess, params);
};

gdocs.deleteDoc = function (docId, callback) {
	memento.setStatusMsg(chrome.i18n.getMessage("deleting_note"));
	var params = {
		'method': 'DELETE',
		'headers': {
			'GData-Version': '3.0',
			'If-Match': '*'
		}
	};

	var handleSuccess = function () {
		callback();
	};

	gdocs.sendRequest(bgPage.DOCLIST_FEED + docId, handleSuccess, params);
};

gdocs.createFolder = function(title, callback) {
	var params = {
		'method': 'POST',
		'headers': {
			'GData-Version': '3.0',
			'Content-Type': 'application/atom+xml'
		},
		'parameters': {
			'alt': 'json'
		},
		'body': gdocs.constructAtomXml_(title, "folder")
	};

	var handleSuccess = function(response) {
		var resourceId = JSON.parse(response).entry.gd$resourceId.$t.split(':')[1];
		callback(resourceId);
	};

	gdocs.sendRequest(bgPage.DOCLIST_FEED, handleSuccess, params);
};

gdocs.getLink = function (links, rel) {
	for (var i = 0, link; link = links[i]; ++i) {
		if (link.rel === rel) {
			return link;
		}
	}
	return null;
};

gdocs.constructContentBody_ = function(title, docType, content) {
	var body = ['--END_OF_PART\r\n',
		'Content-Type: application/atom+xml;\r\n\r\n',
		gdocs.constructAtomXml_(title, docType), '\r\n',
		'--END_OF_PART\r\n',
		'Content-Type: ', DEFAULT_MIMETYPES[docType], '\r\n\r\n',
		content, '\r\n',
		'--END_OF_PART--\r\n'].join('');
	return body;
};

gdocs.constructAtomXml_ = function(title, type) {
	var atom = ["<?xml version='1.0' encoding='UTF-8'?>",
		'<entry xmlns="http://www.w3.org/2005/Atom">',
		'<category scheme="http://schemas.google.com/g/2005#kind" term="http://schemas.google.com/docs/2007#', type, '"/>',
		'<title type="text">', title, '</title>',
		'</entry>'].join('');
	return atom;
};

gdocs.getCategory = function (categories, scheme, opt_term) {
	for (var i = 0, cat; cat = categories[i]; ++i) {
		if (opt_term) {
			if (cat.scheme === scheme && opt_term === cat.term) {
				return cat;
			}
		} else if (cat.scheme === scheme) {
			return cat;
		}
	}
	return null;
};
