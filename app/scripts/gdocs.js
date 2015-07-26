/* global chrome, gapi, memento */

var bgPage = chrome.extension.getBackgroundPage();

function GDocs() {}

GDocs.prototype.auth = function(interactive, callback) {
    var access_token = undefined;

    var callbackWrapper = function (getAuthTokenCallbackParam) {
        access_token = getAuthTokenCallbackParam;

        // Save token in gapi for future requests
        gapi.auth.setToken({'access_token': access_token});

        callback((typeof access_token !== 'undefined') ? true : false);
    }

    chrome.identity.getAuthToken({interactive: interactive}, callbackWrapper);
};

GDocs.prototype.getFolderIdByTitle = function(title, callback) {
    var _this = this;

    var request = gapi.client.drive.files.list({
        'maxResults': 1,
        'q': 'mimeType = "application/vnd.google-apps.folder" and trashed = false and title = "' + title + '"'
    });

    request.execute(function(resp) {
        if(resp.items[0]) {
            callback(resp.items[0].id); // get id from the first item
        } else {
            _this.createFolder(title, callback);
        }
    });
};

GDocs.prototype.createFolder = function(title, callback) {
    var request = gapi.client.drive.files.insert({
        'resource': {
            'title': title,
            'mimeType': 'application/vnd.google-apps.folder'
        }
    });

    request.execute(function(resp) {
        callback(resp.id)
    });
};

GDocs.prototype.getDocumentList = function () {
    memento.setStatusMsg(chrome.i18n.getMessage('loading_note_list'));

    var _this = this;
    bgPage.docs = [];

    var request =  gapi.client.drive.files.list({
        q : '"' + bgPage.folderId + '" in parents'
    });

    request.execute(function(resp) {
        _this.processDocListResults(resp);
    });
};

GDocs.prototype.processDocListResults = function (response) {
    for (var key in response.items) {
        if (response.items[key].mimeType === 'application/vnd.google-apps.document') {
            bgPage.docs.push(response.items[key]);
        }
    }

    memento.renderDocList();
};

GDocs.prototype.createDoc = function (title, content, callback) {
    memento.setStatusMsg(chrome.i18n.getMessage('creating_note'));

    var metadata = {
        'title': title,
        'mimeType': 'text/html',
        'parents': [{
            'id': bgPage.folderId
        }]
    };

    this.modifyDoc(content, metadata, 'POST', callback);
};

GDocs.prototype.updateDoc = function(fileId, title, content, callback) {
    memento.setStatusMsg(chrome.i18n.getMessage('saving_note'));

    var metadata = {'title': title };

    this.modifyDoc(content, metadata, 'PUT', callback, fileId);
};

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

    var request = gapi.client.request({
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
        'body': multipartRequestBody});

    request.execute(callback);
};

GDocs.prototype.getDocById = function(docId, callback) {
    var request = gapi.client.drive.files.get({
        'fileId': docId
    });

    request.execute(function(resp) {
        memento.clearStatusMsg();
        callback(resp);
    });
};

GDocs.prototype.getDocumentContent = function(docId, callback) {
    memento.setStatusMsg(chrome.i18n.getMessage('loading_note'));
    var _this = this;

    var request = gapi.client.drive.files.get({
        'fileId': docId
    });

    request.execute(function(resp) {
        _this.getFileContents(resp, callback);
    });
};

GDocs.prototype.getFileContents = function(file, callback) {
    if (file.exportLinks['text/html']) {
        var auth = gapi.auth.getToken();
        var xhr = new XMLHttpRequest();
        var url = file.exportLinks['text/html'];

        xhr.open('GET', url);
        xhr.setRequestHeader('Authorization', 'Bearer ' + auth.access_token);
        xhr.responseType = 'text';
        xhr.onload = function() {
            callback(file.id, xhr.responseText);
        };
        xhr.onerror = function() {
            callback(null);
        };
        xhr.send();
    } else {
        callback(null);
    }
};

GDocs.prototype.deleteDoc = function (docId, callback) {
    memento.setStatusMsg(chrome.i18n.getMessage('deleting_note'));

    var request = gapi.client.drive.files.delete({
        'fileId': docId
    });

    request.execute(callback);
};

GDocs.prototype.getDocByTitle = function(title, callback) {
    var request = gapi.client.drive.files.list({
        'maxResults': 1,
        'q': 'mimeType = "application/vnd.google-apps.folder" and trashed = false and title = "' + title + '"'
    });

    request.execute(callback);
};
