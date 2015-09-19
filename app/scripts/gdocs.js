/* global chrome */

var gdocs = (function() {

    // Private variables and functions
    var access_token = undefined;

    var auth = function(interactive, callback) {
        var callbackWrapper = function (getAuthTokenCallbackParam) {
            access_token = getAuthTokenCallbackParam;

            callback((typeof access_token !== 'undefined') ? true : false);
        }

        chrome.identity.getAuthToken({interactive: interactive}, callbackWrapper);
    };

    var createFolder = function(title, callback) {
        gapiRequest({
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

    var getDocumentList = function (folderId, callback) {
        gapiRequest({
            'path': '/drive/v2/files',
            'params': {
                'q' : '"' + folderId + '" in parents'
            },
            'callback': callback
        });
    };

    var getFolderIdByTitle = function(title, callback) {
        gapiRequest({
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

    var createDoc = function (title, content, folderId, callback) {
        var metadata = {
            'title': title,
            'mimeType': 'text/html',
            'parents': [{
                'id': folderId
            }]
        };

        modifyDoc(content, metadata, 'POST', callback);
    };

    var updateDoc = function(fileId, title, content, callback) {
        var metadata = {
            'title': title
        };

        modifyDoc(content, metadata, 'PUT', callback, fileId);
    };

    var getDocById = function(docId, callback) {
        gapiRequest({
            'path': '/drive/v2/files/' + docId,
            'callback': callback
        });
    };

    var getDocByTitle = function(title, callback) {
        gapiRequest({
            'path': '/drive/v2/files',
            'params': {
                'maxResults': 1,
                'q': 'mimeType = "application/vnd.google-apps.document" and trashed = false and title = "' + title + '"'
            },
            'callback': function(resp) {
                if(resp.items[0]) {
                    callback(resp.items[0]);
                } else {
                    callback(null);
                }
            }
        });
    };

    var getDocumentContent = function(doc, callback) {
        gapiRequest({
            'url': doc.exportLinks['text/html'],
            'responseType': 'text',
            'callback': function(resp) {
                callback(doc, resp);
            }
        });
    };

    var deleteDoc = function (docId, callback) {
        gapiRequest({
            'path': '/drive/v2/files/' + docId,
            'method': 'DELETE',
            'callback': callback
        });
    };

    var modifyDoc = function (content, metadata, method, callback, fileId) {
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

        gapiRequest({
            'path': '/upload/drive/v2/files/' + ((fileId) ? fileId : ''),
            'method': method,
            'params': {
                'uploadType': 'multipart',
                'alt': 'json',
                'convert': true
            },
            'headers': {
              'content-type': 'multipart/mixed; boundary="' + boundary + '"'
            },
            'body': multipartRequestBody,
            'callback': callback
        });
    };

    var gapiRequest = function (args) {
        if (typeof args !== 'object'){
            throw new Error('args required');
        }

        if (typeof args.callback !== 'function') {
            throw new Error('callback required');
        }

        if (typeof args.path !== 'string' && typeof args.url !== 'string') {
            throw new Error('path or url required');
        }

        var path = null;
        if (args.url && typeof args.url === 'string') {
            path = args.url;
        } else if (args.root && typeof args.root === 'string') {
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

        if(args.responseType) {
            xhr.responseType = args.responseType;
        }

        if(args.headers && args.headers['content-type'] && args.headers['content-type'] !== 'application/json') {
            xhr.setRequestHeader('content-type', args.headers['content-type']);
            xhr.send(args.body);
        } else if (typeof args.body !== 'undefined') {
            xhr.setRequestHeader('content-type', 'application/json');
            xhr.send(JSON.stringify(args.body));
        } else {
            xhr.send();
        }

        xhr.onerror = function (e) {
            console.log('Error! ' + e);
        };

        xhr.onload = function() {
            var rawResponseObject = {
                gapiRequest: {
                    data: {
                        status: this.status,
                        statusText: this.statusText
                    }
                }
            };

            var rawResp = JSON.stringify(rawResponseObject);
            if(this.response && this.responseType === 'text') {
                args.callback(this.response, rawResp);
            } else if (this.response) {
                var jsonResp = JSON.parse(this.response);
                args.callback(jsonResp, rawResp);
            } else {
                args.callback(null, rawResp);
            }
        };
    };

    // Public API
    return {
        auth: auth,
        createFolder: createFolder,
        getFolderIdByTitle: getFolderIdByTitle,
        getDocumentList: getDocumentList,
        createDoc: createDoc,
        updateDoc: updateDoc,
        getDocById: getDocById,
        getDocByTitle: getDocByTitle,
        getDocumentContent: getDocumentContent,
        deleteDoc: deleteDoc
    };
})();
