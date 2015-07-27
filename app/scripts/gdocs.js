/* global chrome */

var access_token = undefined;

function GDocs() {}

GDocs.prototype.auth = function(interactive, callback) {
    var callbackWrapper = function (getAuthTokenCallbackParam) {
        access_token = getAuthTokenCallbackParam;

        callback((typeof access_token !== 'undefined') ? true : false);
    }

    chrome.identity.getAuthToken({interactive: interactive}, callbackWrapper);
};

GDocs.prototype.createFolder = function(title, callback) {
    this.gapiRequest({
        'path': '/drive/v2/files',
        'method': 'POST',
        'body': {
            'title': title,
            'mimeType': 'application/vnd.google-apps.folder'
        },
        'callback': function(resp) {
            callback(resp.id)
        }
    });
};

GDocs.prototype.createDoc = function (title, content, folderId, callback) {
    var metadata = {
        'title': title,
        'mimeType': 'text/html',
        'parents': [{
            'id': folderId
        }]
    };

    this.modifyDoc(content, metadata, 'POST', callback);
};

GDocs.prototype.updateDoc = function(fileId, title, content, callback) {
    var metadata = {'title': title };

    this.modifyDoc(content, metadata, 'PUT', callback, fileId);
};

GDocs.prototype.getFolderIdByTitle = function(title, callback) {
    this.gapiRequest({
        'path': '/drive/v2/files',
        'params': {
            'maxResults': 1,
            'q': 'mimeType = "application/vnd.google-apps.folder" and trashed = false and title = "' + title + '"'
        },
        'callback': function(resp) {
            if(resp.items[0]) {
                callback(resp.items[0].id); // get id from the first item
            } else {
                callback(null);
            }
        }
    });
};

GDocs.prototype.getDocumentList = function (folderId, callback) {
    this.gapiRequest({
        'path': '/drive/v2/files',
        'params': {
            'q' : '"' + folderId + '" in parents'
        },
        'callback': callback
    });
};

GDocs.prototype.getDocById = function(docId, callback) {
    this.gapiRequest({
        'path': '/drive/v2/files/' + docId,
        'callback': callback
    });
};

GDocs.prototype.getDocByTitle = function(title, callback) {
    this.gapiRequest({
        'path': '/drive/v2/files',
        'params': {
            'maxResults': 1,
            'q': 'mimeType = "application/vnd.google-apps.document" and trashed = false and title = "' + title + '"'
        },
        'callback': callback
    });
};

GDocs.prototype.deleteDoc = function (docId, callback) {
    this.gapiRequest({
        'path': '/drive/v2/files/' + docId,
        'method': 'DELETE',
        'callback': callback
    });
};

GDocs.prototype.getDocumentContent = function(doc, callback) {
    if (doc.exportLinks['text/html']) {
        var xhr = new XMLHttpRequest();
        var url = doc.exportLinks['text/html'];

        xhr.open('GET', url);
        xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
        xhr.responseType = 'text';
        xhr.onload = function() {
            callback(doc.id, xhr.responseText);
        };
        xhr.onerror = function() {
            callback(null);
        };
        xhr.send();
    } else {
        callback(null);
    }
};

// TODO make it private
GDocs.prototype.modifyDoc = function (content, metadata, method, callback, fileId) {
    var boundary = '-------314159265358979323846';
    var delimiter = '\r\n--' + boundary + '\r\n';
    var close_delim = '\r\n--' + boundary + '--';

    var contentType = 'text/html';

    var multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + contentType + '\r\n' +
        '\r\n' +
        content +
        close_delim;

    // FIXME body headers borken
    this.gapiRequest({
        'path': '/upload/drive/v2/files/' + ((fileId) ? fileId : ''),
        'method': method,
        'params': {
            'uploadType': 'multipart',
            'alt': 'json',
            'convert': true
        },
        'headers': {
          'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
        },
        'body': multipartRequestBody,
        'callback': callback
    });
};

// TODO make it private
GDocs.prototype.gapiRequest = function (args) {
    if (typeof args !== 'object'){
        throw new Error('args required');
    }

    if (typeof args.callback !== 'function') {
        throw new Error('callback required');
    }

    if (typeof args.path !== 'string') {
        throw new Error('path required');
    }

    var path = null;
    if (args.root && args.root === 'string') {
        path = args.root + args.path;
    } else {
        path = 'https://www.googleapis.com' + args.path;
    }

    if (typeof args.params === 'object') {
        var deliminator = '?';
        for (var i in args.params) {
            path += deliminator + encodeURIComponent(i) + '=' + encodeURIComponent(args.params[i]);
            deliminator = '&';
        }
    }

    var xhr = new XMLHttpRequest();
    xhr.open(args.method || 'GET', path);
    xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);

    if (typeof args.body !== 'undefined') {
        xhr.setRequestHeader('content-type', 'application/json');
        xhr.send(JSON.stringify(args.body));
    } else {
        xhr.send();
    }

    xhr.onerror = function () {
        // TODO, error handling.
        debugger;
    };

    xhr.onload = function() {
        var rawResponseObject = {
            // TODO: body, headers.
            gapiRequest: {
                data: {
                    status: this.status,
                    statusText: this.statusText
                }
            }
        };

        var rawResp = JSON.stringify(rawResponseObject);
        if (this.response) {
            var jsonResp = JSON.parse(this.response);
            args.callback(jsonResp, rawResp);
        } else {
            args.callback(null, rawResp);
        }
    };
};
